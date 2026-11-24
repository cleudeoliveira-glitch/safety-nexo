import { Body, Controller, Delete, Get, HttpCode, Injectable, Module, NotFoundException, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { readdirSync } from 'fs';
import { join } from 'path';
import { ehAdminPlataforma, SomenteAdmin } from '../admin/admin-plataforma';
import { planoPorCodigo } from '../admin/planos';
import { fimDoPeriodo, hojeMeioDia, meioDia } from '../admin/vigencia';
import { Publica } from '../auth/publica.decorator';
import { emailLigado, WEB } from '../common/email';
import { conferirGuarda } from '../common/guarda';
import { situacaoPlano } from '../common/plano';
import { ambienteDaChave, asaas, asaasAmbienteTrocado, asaasLigado, asaasProducao } from '../pagamentos/asaas';
import { PrismaService } from '../prisma/prisma.service';
import { registrarFalha } from './falhas';

// Diagnóstico do Painel ADM ("Doutor Nexo").
// Cada clique faz uma varredura na hora: motor, banco (Supabase), cadastros, pagamentos (Asaas), erros recentes, site e avisos.
// Cada problema já vem com o pedido pronto para copiar e colar para o Claude resolver.

export type Situacao = 'ok' | 'atencao' | 'falha';
export type ItemDiagnostico = {
  id: string;
  grupo: string;
  titulo: string;
  situacao: Situacao;
  resumo: string;
  detalhes?: string[];
  comoResolver?: string; // o que o próprio Rodrigo pode fazer, sem programar
  pedido?: string; // texto pronto para colar no Claude
  falhaId?: string; // erro guardado no caderno: pode ser marcado como resolvido
  resolvido?: boolean; // estava com problema na varredura anterior e agora está ok
};

const GRUPOS = { motor: 'Motor e banco', cadastros: 'Cadastros e clientes', pagamentos: 'Pagamentos', erros: 'Erros que os clientes viram', site: 'Site, e-mail e avisos' };
const REPO = 'cleudeoliveira-glitch/safety-nexo';
const HORA = 3_600_000;
const DIA = 24 * HORA;
const quando = (d: Date | string) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dia = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const iso = (d: Date) => d.toISOString().slice(0, 10);
const haQuanto = (d: Date | string) => {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 2) return 'agora há pouco';
  if (min < 60) return `há ${min} minutos`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} hora${h > 1 ? 's' : ''}`;
  return `há ${Math.round(h / 24)} dias`;
};
const sqlTexto = (v: string) => `'${v.replace(/'/g, "''")}'`;
const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Monta o texto que o Rodrigo cola no Claude: o que aconteceu, onde mexer e, quando dá, o SQL para acertar os dados.
function montarPedido(p: { titulo: string; achado: string; detalhes?: string[]; ondeOlhar?: string[]; oQueFazer: string; sql?: string }) {
  const partes = [
    `Claude, preciso de ajuda no Safety Nexo (repositório ${REPO}).`,
    `O Diagnóstico do Painel ADM achou um problema em ${quando(new Date())} (horário de Brasília).`,
    '',
    `PROBLEMA: ${p.titulo}`,
    `O QUE ACONTECEU: ${p.achado}`,
  ];
  if (p.detalhes?.length) partes.push('', 'DETALHES:', ...p.detalhes.map((d) => `- ${d}`));
  if (p.ondeOlhar?.length) partes.push('', 'ONDE OLHAR NO CÓDIGO:', ...p.ondeOlhar.map((d) => `- ${d}`));
  partes.push('', `O QUE EU QUERO: ${p.oQueFazer}`, 'Corrija a causa no código, abra um PR e me diga em português simples o que foi feito e se preciso fazer alguma coisa.');
  if (p.sql) partes.push('', 'SQL PARA ACERTAR OS DADOS AGORA (confira antes e rode no Supabase > SQL Editor):', p.sql);
  return partes.join('\n');
}

export class FalhaTelaDto {
  @IsString() @MaxLength(1000) mensagem!: string;
  @IsOptional() @IsString() @MaxLength(300) rota?: string;
  @IsOptional() @IsString() @MaxLength(4000) detalhe?: string;
}

@Injectable()
export class DiagnosticoService {
  constructor(private readonly prisma: PrismaService) {}

  async varrer() {
    const inicio = Date.now();
    // Cada verificação roda sozinha: se uma quebrar, vira um item vermelho e as outras continuam.
    const blocos = await Promise.all([
      this.seguro('motor', GRUPOS.motor, 'Motor (servidor no Render)', () => this.motor()),
      this.seguro('banco', GRUPOS.motor, 'Banco de dados (Supabase)', () => this.banco()),
      this.seguro('migracoes', GRUPOS.motor, 'Banco sincronizado com o sistema', () => this.migracoes()),
      this.seguro('configuracoes', GRUPOS.motor, 'Configurações do servidor', () => this.configuracoes()),
      this.seguro('arquivos', GRUPOS.motor, 'Arquivos (logos, PDFs, fotos)', () => this.arquivos()),
      this.seguro('cadastros', GRUPOS.cadastros, 'Cadastros', () => this.cadastros()),
      this.seguro('pagamentos', GRUPOS.pagamentos, 'Pagamentos', () => this.pagamentos()),
      this.seguro('tarefas', GRUPOS.pagamentos, 'Tarefas automáticas', () => this.tarefas()),
      this.seguro('erros', GRUPOS.erros, 'Erros recentes', () => this.erros()),
      this.seguro('site', GRUPOS.site, 'Site', () => this.siteEAvisos()),
    ]);
    const itens = blocos.flat();
    await this.marcarResolvidos(itens);

    const conta = (s: Situacao) => itens.filter((i) => i.situacao === s).length;
    const pontos = itens.reduce((t, i) => t + (i.situacao === 'ok' ? 1 : i.situacao === 'atencao' ? 0.6 : 0), 0);
    const problemas = itens.filter((i) => i.situacao !== 'ok' && i.pedido);
    return {
      feitoEm: new Date(),
      levouMs: Date.now() - inicio,
      saude: itens.length ? Math.round((pontos / itens.length) * 100) : 100,
      totais: { falha: conta('falha'), atencao: conta('atencao'), ok: conta('ok'), resolvidos: itens.filter((i) => i.resolvido).length },
      itens,
      // "Copiar tudo para o Claude": todos os pedidos juntos, do mais grave para o mais leve.
      pedidoGeral: problemas.length
        ? [`Claude, o Diagnóstico do Painel ADM do Safety Nexo (repositório ${REPO}) achou ${problemas.length} problema(s). Resolva um por um, do primeiro ao último, e junte tudo num PR só se fizer sentido.`, '',
          ...[...problemas].sort((a, b) => (a.situacao === b.situacao ? 0 : a.situacao === 'falha' ? -1 : 1)).map((p, n) => `===== ${n + 1}. ${p.titulo} =====\n${p.pedido!.split('\n').slice(3).join('\n')}`)].join('\n')
        : null,
    };
  }

  // O erro foi corrigido: some da lista. Se voltar a acontecer, aparece de novo.
  async resolverFalha(id: string) {
    const f = await this.prisma.falhaSistema.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Esse erro já tinha sido tirado da lista.');
    await this.prisma.falhaSistema.delete({ where: { id } });
    return { ok: true };
  }

  async falhaDaTela(dto: FalhaTelaDto) {
    // Proteção contra lixo: no máximo 300 tipos diferentes de erro de tela guardados.
    const total = await this.prisma.falhaSistema.count({ where: { origem: 'TELA' } });
    if (total >= 300) return { ok: true };
    registrarFalha({ origem: 'TELA', rota: dto.rota ?? null, mensagem: dto.mensagem, detalhe: dto.detalhe ?? null });
    return { ok: true };
  }

  private async seguro(id: string, grupo: string, titulo: string, fn: () => Promise<ItemDiagnostico[]>): Promise<ItemDiagnostico[]> {
    try {
      return await fn();
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      return [{
        id: `${id}:quebrou`, grupo, titulo: `${titulo}: não consegui conferir`, situacao: 'falha',
        resumo: `A conferência deu erro: ${msg.slice(0, 200)}`,
        pedido: montarPedido({ titulo: `A verificação "${titulo}" do Diagnóstico quebrou`, achado: msg, detalhes: [(e as Error)?.stack?.slice(0, 1500) ?? ''], ondeOlhar: ['apps/api/src/diagnostico/diagnostico.ts'], oQueFazer: 'Descubra por que a verificação quebrou e corrija (no diagnóstico ou na parte do sistema que ele conferiu).' }),
      }];
    }
  }

  // ---------- Motor e banco ----------

  private async motor(): Promise<ItemDiagnostico[]> {
    const memoria = Math.round(process.memoryUsage().rss / 1048576);
    const minutos = Math.round(process.uptime() / 60);
    const versao = process.env.RENDER_GIT_COMMIT?.slice(0, 7);
    const ligado = minutos < 60 ? `${minutos} min` : minutos < 2880 ? `${Math.round(minutos / 60)} h` : `${Math.round(minutos / 1440)} dias`;
    const pesado = memoria > 430;
    return [{
      id: 'motor', grupo: GRUPOS.motor, titulo: 'Motor no ar', situacao: pesado ? 'atencao' : 'ok',
      resumo: `Respondendo. Ligado há ${ligado}, usando ${memoria} MB de memória${versao ? `, versão ${versao}` : ''}.`,
      ...(pesado ? {
        comoResolver: 'O plano gratuito do Render tem 512 MB. Perto disso o motor reinicia sozinho e quem estiver usando pode ver erro. Se repetir, mande o pedido para o Claude.',
        pedido: montarPedido({ titulo: 'Motor usando memória demais', achado: `O motor está com ${memoria} MB de memória (o limite do Render gratuito é 512 MB).`, ondeOlhar: ['Geração de PDF (Chromium) em apps/api/src/documentos', 'Leitura de PDF/IA em apps/api/src/importacao'], oQueFazer: 'Ache o que está gastando memória e reduza, sem custo extra de hospedagem.' }),
      } : {}),
    }];
  }

  private async banco(): Promise<ItemDiagnostico[]> {
    const t = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch (e) {
      return [{
        id: 'banco', grupo: GRUPOS.motor, titulo: 'Banco de dados fora do ar', situacao: 'falha',
        resumo: 'O motor não conseguiu falar com o Supabase. Ninguém consegue entrar nem salvar nada.',
        comoResolver: 'Abra o Supabase e veja se o projeto está pausado (no plano gratuito ele pausa depois de 7 dias sem uso). Se estiver, clique em "Restore". Confira também a DATABASE_URL no Render.',
        pedido: montarPedido({ titulo: 'Motor sem conexão com o banco (Supabase)', achado: (e as Error).message.slice(0, 600), ondeOlhar: ['DATABASE_URL no Render (Supabase > Connect > Session pooler, porta 5432)', 'apps/api/src/prisma/prisma.service.ts'], oQueFazer: 'Me ajude a descobrir por que o motor não conecta no Supabase e o que eu preciso conferir.' }),
      }];
    }
    const ms = Date.now() - t;
    return [{
      id: 'banco', grupo: GRUPOS.motor, titulo: 'Banco de dados (Supabase) conectado', situacao: ms > 2000 ? 'atencao' : 'ok',
      resumo: ms > 2000 ? `Conectado, mas lento: respondeu em ${ms} ms. Se continuar, as telas vão demorar.` : `Respondeu em ${ms} ms.`,
    }];
  }

  // Compara as atualizações de banco que o código tem com as que foram aplicadas no Supabase.
  private async migracoes(): Promise<ItemDiagnostico[]> {
    let noCodigo: string[] = [];
    for (const pasta of [join(process.cwd(), 'prisma', 'migrations'), join(__dirname, '..', '..', 'prisma', 'migrations')]) {
      try { noCodigo = readdirSync(pasta, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort(); break; } catch { /* tenta a próxima */ }
    }
    const aplicadas = await this.prisma.$queryRawUnsafe<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null; logs: string | null }[]>(
      'SELECT migration_name, finished_at, rolled_back_at, logs FROM "_prisma_migrations"');
    const ok = new Set(aplicadas.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name));
    const quebradas = aplicadas.filter((m) => !m.finished_at && !m.rolled_back_at);
    const faltam = noCodigo.filter((n) => !ok.has(n) && !quebradas.some((q) => q.migration_name === n));

    if (quebradas.length) {
      const q = quebradas[0];
      return [{
        id: 'migracoes', grupo: GRUPOS.motor, titulo: 'Atualização do banco travada', situacao: 'falha',
        resumo: `A atualização "${q.migration_name}" começou e não terminou no Supabase. Enquanto isso, o motor não sobe versões novas.`,
        detalhes: quebradas.map((m) => m.migration_name),
        pedido: montarPedido({
          titulo: 'Migração do Prisma travada no Supabase', achado: `A migração ${q.migration_name} ficou sem finished_at na tabela _prisma_migrations.`,
          detalhes: [`Registro do erro: ${(q.logs ?? 'sem registro').slice(0, 1500)}`],
          ondeOlhar: [`apps/api/prisma/migrations/${q.migration_name}/migration.sql`, 'Dockerfile (o motor roda "prisma migrate deploy" ao subir)'],
          oQueFazer: 'Descubra o que fez a migração falhar, corrija o SQL e me diga o passo a passo para destravar (por exemplo, "prisma migrate resolve").',
          sql: `-- Ver o que travou:\nSELECT migration_name, started_at, logs FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL;`,
        }),
      }];
    }
    if (faltam.length) {
      return [{
        id: 'migracoes', grupo: GRUPOS.motor, titulo: 'Banco atrasado em relação ao sistema', situacao: 'falha',
        resumo: `${faltam.length} atualização(ões) do banco ainda não foram aplicadas no Supabase. Telas novas podem dar erro.`,
        detalhes: faltam,
        comoResolver: 'No Render, abra safety-nexo-api e clique em "Manual Deploy" > "Deploy latest commit". Ao subir, o motor aplica as atualizações sozinho. Depois faça a varredura de novo.',
        pedido: montarPedido({ titulo: 'Migrações do banco não aplicadas', achado: `Estas migrações existem no código e não estão no Supabase: ${faltam.join(', ')}.`, ondeOlhar: ['Dockerfile (CMD com "prisma migrate deploy")', 'Logs de deploy no Render'], oQueFazer: 'Descubra por que o "prisma migrate deploy" não aplicou essas migrações e me diga como resolver.' }),
      }];
    }
    return [{ id: 'migracoes', grupo: GRUPOS.motor, titulo: 'Banco sincronizado com o sistema', situacao: 'ok', resumo: `Todas as ${ok.size} atualizações do banco aplicadas no Supabase.` }];
  }

  private async configuracoes(): Promise<ItemDiagnostico[]> {
    const faltaGrave: string[] = [];
    const faltaLeve: string[] = [];
    const tem = (n: string) => !!process.env[n]?.trim();
    if (!tem('JWT_SECRET')) faltaGrave.push('JWT_SECRET (login)');
    if (!tem('CERT_SECRET')) faltaGrave.push('CERT_SECRET (certificado do eSocial)');
    if (!tem('RESEND_API_KEY')) faltaLeve.push('RESEND_API_KEY (e-mails)');
    if (!tem('TAREFAS_SEGREDO')) faltaLeve.push('TAREFAS_SEGREDO (avisos automáticos diários e semanais)');
    if (!tem('ASAAS_API_KEY')) faltaLeve.push('ASAAS_API_KEY (cobrança automática)');
    if (tem('ASAAS_API_KEY') && !tem('ASAAS_WEBHOOK_TOKEN')) faltaGrave.push('ASAAS_WEBHOOK_TOKEN (sem ele o aviso de pagamento do Asaas é recusado)');
    const origem = process.env.WEB_ORIGIN ?? '';
    if (!origem.includes('safetynexo.com.br')) faltaGrave.push('WEB_ORIGIN sem safetynexo.com.br (o site não consegue falar com o motor)');
    const tudo = [...faltaGrave, ...faltaLeve];
    if (!tudo.length) return [{ id: 'configuracoes', grupo: GRUPOS.motor, titulo: 'Configurações do servidor completas', situacao: 'ok', resumo: 'Login, e-mail, cobrança, tarefas e endereço do site configurados no Render.' }];
    return [{
      id: 'configuracoes', grupo: GRUPOS.motor, titulo: faltaGrave.length ? 'Falta configuração importante no servidor' : 'Configurações opcionais faltando',
      situacao: faltaGrave.length ? 'falha' : 'atencao',
      resumo: `Faltam no Render: ${tudo.map((t) => t.split(' (')[0]).join(', ')}.`,
      detalhes: tudo,
      comoResolver: 'No Render, abra safety-nexo-api > Environment e coloque o que falta (o guia está em guias/ na pasta do projeto). O motor reinicia sozinho ao salvar.',
      pedido: montarPedido({ titulo: 'Variáveis faltando no servidor (Render)', achado: `Estas variáveis não estão no Render: ${tudo.join('; ')}.`, ondeOlhar: ['render.yaml', 'guias/ na pasta do projeto'], oQueFazer: 'Me explique passo a passo, em português simples, onde pego cada valor e como coloco no Render. Não precisa mexer no código.' }),
    }];
  }

  private async arquivos(): Promise<ItemDiagnostico[]> {
    const r = await conferirGuarda();
    return [{
      id: 'arquivos', grupo: GRUPOS.motor, titulo: r.ok ? 'Arquivos guardados no Supabase' : 'Problema para guardar arquivos', situacao: r.ok ? 'ok' : 'falha', resumo: r.motivo,
      ...(r.ok ? {} : { pedido: montarPedido({ titulo: 'Arquivos (logos, PDFs, fotos) com problema no Supabase Storage', achado: r.motivo, ondeOlhar: ['apps/api/src/common/guarda.ts', 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Render'], oQueFazer: 'Descubra por que o Storage não responde e me diga o que conferir no Supabase ou no Render.' }) }),
    }];
  }

  // ---------- Cadastros ----------

  private async cadastros(): Promise<ItemDiagnostico[]> {
    const g = GRUPOS.cadastros;
    const itens: ItemDiagnostico[] = [];
    const agora = Date.now();
    const consultorias = await this.prisma.consultoria.findMany({
      select: {
        id: true, nome: true, plano: true, limiteEmpresas: true, testeAte: true, createdAt: true, bloqueada: true,
        usuarios: { select: { id: true, nome: true, email: true, papel: true, empresaId: true, ultimoAcesso: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { empresas: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const dono = (c: (typeof consultorias)[number]) => c.usuarios.some((u) => ehAdminPlataforma(u.email));

    // Novos cadastros da semana (só informa).
    const novos = consultorias.filter((c) => agora - c.createdAt.getTime() < 7 * DIA);
    itens.push({
      id: 'cad:novos', grupo: g, titulo: novos.length ? `${novos.length} cadastro(s) novo(s) nos últimos 7 dias` : 'Nenhum cadastro novo nos últimos 7 dias', situacao: 'ok',
      resumo: novos.length ? 'Todos entraram certinho no banco.' : 'Nada de errado: só não houve conta nova na semana.',
      detalhes: novos.map((c) => `${c.nome} · ${c.usuarios[0]?.email ?? 'sem e-mail'} · ${quando(c.createdAt)}`),
    });

    // Cadastro pela metade: consultoria sem ninguém para entrar.
    const semDono = consultorias.filter((c) => !c.usuarios.some((u) => u.papel === 'CONSULTORIA'));
    if (semDono.length) {
      itens.push({
        id: 'cad:sem-dono', grupo: g, titulo: 'Cadastro que ficou pela metade', situacao: 'falha',
        resumo: `${semDono.length} consultoria(s) foram criadas sem nenhum usuário que consiga entrar.`,
        detalhes: semDono.map((c) => `${c.nome} (id ${c.id}) · criada em ${quando(c.createdAt)}`),
        pedido: montarPedido({
          titulo: 'Consultoria criada sem usuário dono', achado: 'Existem consultorias no banco sem nenhum usuário com papel CONSULTORIA. O cadastro deve ter falhado no meio.',
          detalhes: semDono.map((c) => `${c.nome} (id ${c.id}), criada em ${quando(c.createdAt)}`),
          ondeOlhar: ['apps/api/src/auth (cadastro: criar consultoria e usuário juntos numa transação)'],
          oQueFazer: 'Garanta que o cadastro cria consultoria e usuário juntos (ou nada), e me diga se posso apagar essas consultorias vazias.',
          sql: `-- Conferir antes de apagar qualquer coisa:\nSELECT c.id, c.nome, c."createdAt", (SELECT COUNT(*) FROM "Empresa" e WHERE e."consultoriaId" = c.id) AS empresas\nFROM "Consultoria" c WHERE c.id IN (${semDono.map((c) => sqlTexto(c.id)).join(', ')});`,
        }),
      });
    } else itens.push({ id: 'cad:sem-dono', grupo: g, titulo: 'Todos os cadastros completos', situacao: 'ok', resumo: 'Toda consultoria tem um usuário dono que consegue entrar.' });

    // E-mail repetido com letras maiúsculas/minúsculas diferentes: a pessoa não acha a conta certa.
    const porEmail = new Map<string, string[]>();
    for (const c of consultorias) for (const u of c.usuarios) porEmail.set(u.email.toLowerCase(), [...(porEmail.get(u.email.toLowerCase()) ?? []), `${u.email} (${c.nome})`]);
    const repetidos = [...porEmail.values()].filter((l) => l.length > 1);
    if (repetidos.length) {
      itens.push({
        id: 'cad:email-repetido', grupo: g, titulo: 'Mesmo e-mail em mais de uma conta', situacao: 'falha',
        resumo: `${repetidos.length} e-mail(s) aparecem duas vezes, só mudando maiúsculas e minúsculas. A pessoa pode cair na conta errada.`,
        detalhes: repetidos.map((l) => l.join(' e ')),
        pedido: montarPedido({
          titulo: 'E-mails repetidos (maiúsculas/minúsculas) em usuários', achado: 'A tabela Usuario tem e-mails iguais com caixa diferente.', detalhes: repetidos.map((l) => l.join(' e ')),
          ondeOlhar: ['apps/api/src/auth (cadastro e login devem guardar e comparar o e-mail em minúsculas)'],
          oQueFazer: 'Faça o cadastro e o login sempre usarem o e-mail em minúsculas e me diga como juntar as contas repetidas sem perder dados.',
          sql: `SELECT lower(email) AS email, array_agg(id) AS usuarios, array_agg("consultoriaId") AS consultorias\nFROM "Usuario" GROUP BY lower(email) HAVING COUNT(*) > 1;`,
        }),
      });
    }

    // Login de empresa cliente sem empresa ligada: entra e não vê nada.
    const empresaSolta = consultorias.flatMap((c) => c.usuarios.filter((u) => u.papel === 'EMPRESA' && !u.empresaId).map((u) => `${u.nome} · ${u.email} (${c.nome})`));
    if (empresaSolta.length) {
      itens.push({
        id: 'cad:empresa-solta', grupo: g, titulo: 'Login de empresa cliente sem empresa', situacao: 'falha',
        resumo: `${empresaSolta.length} login(s) de empresa cliente não estão ligados a nenhuma empresa.`, detalhes: empresaSolta,
        pedido: montarPedido({ titulo: 'Usuário EMPRESA sem empresaId', achado: 'Há usuários com papel EMPRESA e empresaId vazio.', detalhes: empresaSolta, ondeOlhar: ['apps/api/src/acessos'], oQueFazer: 'Descubra como isso aconteceu e impeça; me diga como ligar ou apagar esses logins.', sql: `SELECT id, nome, email, "consultoriaId" FROM "Usuario" WHERE papel = 'EMPRESA' AND "empresaId" IS NULL;` }),
      });
    }

    // Criou a conta e nunca voltou (só os últimos 30 dias): chance de ajudar e vender.
    const parados = consultorias.filter((c) => !dono(c) && agora - c.createdAt.getTime() > 2 * DIA && agora - c.createdAt.getTime() < 30 * DIA)
      .flatMap((c) => c.usuarios.filter((u) => u.papel === 'CONSULTORIA' && !u.ultimoAcesso).map((u) => `${u.nome} · ${u.email} (${c.nome}) · cadastro em ${dia(c.createdAt)}`));
    if (parados.length) {
      itens.push({
        id: 'cad:nunca-entraram', grupo: g, titulo: `${parados.length} pessoa(s) criaram a conta e não usaram`, situacao: 'atencao',
        resumo: 'Fizeram o cadastro há mais de 2 dias e não voltaram. Pode ser senha esquecida ou dúvida no começo.', detalhes: parados,
        comoResolver: 'Chame no WhatsApp ou mande o link de senha (Painel ADM > Consultorias > abrir a consultoria > "Link de senha").',
      });
    }

    // Teste de 14 dias acabando: hora de oferecer o plano.
    const testeAcabando = consultorias.filter((c) => !dono(c) && c.plano === 'FREE' && c.testeAte && c.testeAte.getTime() > agora && c.testeAte.getTime() - agora < 3 * DIA);
    if (testeAcabando.length) {
      itens.push({
        id: 'cad:teste-acabando', grupo: g, titulo: `${testeAcabando.length} teste(s) grátis acabando em até 3 dias`, situacao: 'atencao',
        resumo: 'Bom momento para uma mensagem oferecendo o plano.', detalhes: testeAcabando.map((c) => `${c.nome} · ${c.usuarios[0]?.email ?? ''} · teste até ${dia(c.testeAte!)}`),
        comoResolver: 'Não é erro. Mande uma mensagem com o link de Planos para essas pessoas.',
      });
    }

    // Mais empresas do que o plano aceita.
    const acima = consultorias.filter((c) => !dono(c) && !c.bloqueada && c._count.empresas > c.limiteEmpresas);
    if (acima.length) {
      itens.push({
        id: 'cad:acima-limite', grupo: g, titulo: 'Conta com mais empresas do que o plano permite', situacao: 'atencao',
        resumo: `${acima.length} consultoria(s) passaram do limite de empresas do plano.`,
        detalhes: acima.map((c) => `${c.nome}: ${c._count.empresas} empresas, plano ${planoPorCodigo(c.plano)?.nome ?? c.plano} (limite ${c.limiteEmpresas})`),
        comoResolver: 'Ofereça um plano maior ou ajuste o limite em Painel ADM > Consultorias.',
        pedido: montarPedido({ titulo: 'Consultorias acima do limite de empresas', achado: 'Algumas consultorias têm mais empresas do que o limite do plano.', detalhes: acima.map((c) => `${c.nome} (id ${c.id}): ${c._count.empresas} empresas, limite ${c.limiteEmpresas}`), ondeOlhar: ['apps/api/src/empresas (trava do limite ao criar empresa)', 'apps/api/src/pagamentos/pagamentos.ts (troca de plano)'], oQueFazer: 'Confira se a trava do limite está funcionando e me diga se essas contas passaram do limite por troca de plano ou por erro.' }),
      });
    }
    return itens;
  }

  // ---------- Pagamentos ----------

  private async pagamentos(): Promise<ItemDiagnostico[]> {
    const g = GRUPOS.pagamentos;
    const itens: ItemDiagnostico[] = [];
    const agora = Date.now();

    if (!asaasLigado()) {
      itens.push({ id: 'pag:asaas', grupo: g, titulo: 'Cobrança automática desligada', situacao: 'atencao', resumo: 'Sem a chave do Asaas no Render, os planos são cobrados à mão.', comoResolver: 'Siga o guia "ligar-cobranca-asaas.md" (pasta guias do projeto) e coloque ASAAS_API_KEY no Render.' });
    } else {
      try {
        await asaas.conferir();
        itens.push(asaasProducao()
          ? { id: 'pag:asaas', grupo: g, titulo: 'Asaas conectado (cobrando de verdade)', situacao: 'ok', resumo: 'A chave do Asaas funciona, no modo de produção.' }
          : { id: 'pag:asaas', grupo: g, titulo: 'Cobrança em modo de teste', situacao: 'atencao', resumo: 'O Asaas está no "sandbox": ninguém é cobrado de verdade ainda.', comoResolver: 'Quando o pagamento de teste der certo, troque no Render a ASAAS_API_KEY pela chave da conta de verdade (começa com $aact_prod_) e ASAAS_AMBIENTE = producao.' });
        if (asaasAmbienteTrocado()) {
          itens.push({ id: 'pag:asaas-ambiente', grupo: g, titulo: 'ASAAS_AMBIENTE diferente da chave', situacao: 'atencao', resumo: `A chave é de ${ambienteDaChave() === 'producao' ? 'produção' : 'testes (sandbox)'}, mas ASAAS_AMBIENTE diz outra coisa. O sistema segue a chave.`, comoResolver: `No Render, mude ASAAS_AMBIENTE para ${ambienteDaChave()} (ou apague a variável) para não confundir.` });
        }
      } catch (e) {
        itens.push({
          id: 'pag:asaas', grupo: g, titulo: 'Asaas recusou a conexão', situacao: 'falha', resumo: (e as Error).message,
          comoResolver: ambienteDaChave()
            ? 'O ambiente já é escolhido pela chave. Se o Asaas ainda recusa, a chave foi apagada ou copiada pela metade: gere uma nova no Asaas (Integrações > Chave de API) e cole de novo em ASAAS_API_KEY no Render, sem espaços.'
            : 'A chave não diz de qual ambiente é. Inverta ASAAS_AMBIENTE no Render (sandbox ↔ producao) ou gere uma chave nova no Asaas, que já vem com a marca.',
          pedido: montarPedido({ titulo: 'Motor não consegue falar com o Asaas', achado: (e as Error).message, ondeOlhar: ['apps/api/src/pagamentos/asaas.ts', 'ASAAS_API_KEY e ASAAS_AMBIENTE no Render'], oQueFazer: 'Descubra por que o Asaas recusa e me diga o que corrigir.' }),
        });
      }
    }

    const [consultorias, pagamentos, chamada] = await Promise.all([
      this.prisma.consultoria.findMany({
        where: { OR: [{ asaasClienteId: { not: null } }, { plano: { not: 'FREE' } }] },
        select: { id: true, nome: true, plano: true, limiteEmpresas: true, planoPagoAte: true, asaasAssinaturaId: true, assinaturaPlano: true, assinaturaStatus: true, assinaturaForma: true, usuarios: { select: { email: true } } },
      }),
      this.prisma.pagamentoPlano.findMany({ where: { vencimento: { gte: new Date(agora - 120 * DIA) } }, orderBy: { vencimento: 'desc' } }),
      this.prisma.configPlataforma.findUnique({ where: { chave: 'chamada:/pagamentos/asaas' } }),
    ]);
    const nome = new Map(consultorias.map((c) => [c.id, c.nome]));
    const ehDono = new Set(consultorias.filter((c) => c.usuarios.some((u) => ehAdminPlataforma(u.email))).map((c) => c.id));

    // Aviso (webhook) do Asaas chegando?
    if (asaasLigado()) {
      const ultima = chamada ? (JSON.parse(chamada.valor) as { em: string; status: number }) : null;
      const temAssinatura = consultorias.some((c) => c.asaasAssinaturaId);
      if (ultima && ultima.status >= 400) {
        itens.push({
          id: 'pag:webhook', grupo: g, titulo: 'Aviso de pagamento do Asaas sendo recusado', situacao: 'falha',
          resumo: `O último aviso do Asaas (${haQuanto(ultima.em)}) foi recusado com código ${ultima.status}. Pagamentos podem não estar liberando o plano.`,
          comoResolver: 'No Asaas: Integrações > Webhooks. O token de autenticação tem que ser igual ao ASAAS_WEBHOOK_TOKEN do Render, e o endereço https://safety-nexo-api.onrender.com/pagamentos/asaas. Depois reenvie os avisos com erro pelo próprio Asaas.',
          pedido: montarPedido({ titulo: 'Webhook do Asaas recusado', achado: `O motor respondeu ${ultima.status} ao último aviso do Asaas, em ${quando(ultima.em)}.`, ondeOlhar: ['apps/api/src/pagamentos/pagamentos.ts (AvisoAsaasController, conferirSegredo)', 'ASAAS_WEBHOOK_TOKEN no Render'], oQueFazer: 'Me ajude a achar a causa da recusa e me diga como reenviar os avisos que falharam no Asaas.' }),
        });
      } else if (!ultima && temAssinatura) {
        itens.push({
          id: 'pag:webhook', grupo: g, titulo: 'O aviso do Asaas nunca chegou', situacao: 'falha',
          resumo: 'Já existe cobrança criada, mas o Asaas nunca avisou o motor. Pagamento feito não vai liberar o plano sozinho.',
          comoResolver: 'No Asaas: Integrações > Webhooks > Adicionar. Endereço https://safety-nexo-api.onrender.com/pagamentos/asaas, com o mesmo token do ASAAS_WEBHOOK_TOKEN do Render, e marque os eventos de cobrança e de assinatura.',
          pedido: montarPedido({ titulo: 'Webhook do Asaas nunca recebido', achado: 'Há assinaturas no Asaas e o motor nunca recebeu um aviso em /pagamentos/asaas.', ondeOlhar: ['apps/api/src/pagamentos/pagamentos.ts', 'guias/ligar-cobranca-asaas.md'], oQueFazer: 'Me passe o passo a passo para configurar o webhook no Asaas e conferir que está chegando.' }),
        });
      } else {
        itens.push({ id: 'pag:webhook', grupo: g, titulo: 'Aviso de pagamento do Asaas chegando', situacao: 'ok', resumo: ultima ? `Último aviso recebido ${haQuanto(ultima.em)}.` : 'Ainda não há cobranças, então nenhum aviso era esperado.' });
      }
    }

    // Pagou e o plano não mudou: o período pago ainda vale e a conta não está nele.
    const hoje = hojeMeioDia();
    const vistos = new Set<string>();
    const descasados: { c: (typeof consultorias)[number]; p: (typeof pagamentos)[number]; fim: Date }[] = [];
    for (const p of pagamentos) {
      if (p.status !== 'PAGO' || vistos.has(p.consultoriaId) || ehDono.has(p.consultoriaId)) continue;
      vistos.add(p.consultoriaId);
      const c = consultorias.find((x) => x.id === p.consultoriaId);
      if (!c) continue;
      const fim = fimDoPeriodo(meioDia(p.vencimento), 1);
      if (fim < hoje) continue;
      const pagoAte = c.planoPagoAte ? meioDia(c.planoPagoAte) : null;
      if (c.plano !== p.plano || !pagoAte || pagoAte < fim) descasados.push({ c, p, fim });
    }
    if (descasados.length) {
      for (const { c, p, fim } of descasados) {
        const plano = planoPorCodigo(p.plano);
        const limite = plano?.limiteEmpresas ?? 100000;
        itens.push({
          id: `pag:descasado:${c.id}`, grupo: g, titulo: 'Pagamento caiu, mas o plano não mudou', situacao: 'falha',
          resumo: `${c.nome} pagou ${reais(p.valorCentavos)} (${plano?.nome ?? p.plano}) em ${p.pagoEm ? dia(p.pagoEm) : 'data não informada'} e a conta está no plano ${planoPorCodigo(c.plano)?.nome ?? c.plano}, pago até ${c.planoPagoAte ? dia(c.planoPagoAte) : 'nenhuma data'}.`,
          pedido: montarPedido({
            titulo: 'Pagamento PAGO no Asaas não atualizou o plano', achado: `A consultoria ${c.nome} (id ${c.id}) tem o pagamento ${p.asaasId} PAGO, plano ${p.plano}, vencimento ${dia(p.vencimento)}. A conta está em ${c.plano} com planoPagoAte ${c.planoPagoAte ? iso(c.planoPagoAte) : 'vazio'}.`,
            ondeOlhar: ['apps/api/src/pagamentos/pagamentos.ts (avisoPagamento: quando passa para PAGO, atualiza plano, limiteEmpresas e planoPagoAte)'],
            oQueFazer: 'Descubra por que o plano não foi atualizado quando o pagamento caiu e corrija.',
            sql: `-- Acerta a conta para o que foi pago:\nUPDATE "Consultoria" SET plano = ${sqlTexto(p.plano)}, "limiteEmpresas" = ${limite}, "planoPagoAte" = '${iso(fim)}T12:00:00Z', "planoDesde" = COALESCE("planoDesde", '${iso(meioDia(p.vencimento))}T12:00:00Z')\nWHERE id = ${sqlTexto(c.id)};`,
          }),
        });
      }
    } else itens.push({ id: 'pag:descasado', grupo: g, titulo: 'Pagamentos e planos batendo', situacao: 'ok', resumo: 'Todo pagamento confirmado liberou o plano certo.' });

    // Assinatura com dados que não fecham entre si.
    const quebradas = consultorias.filter((c) => !ehDono.has(c.id) && ((c.asaasAssinaturaId && !c.assinaturaStatus) || (c.assinaturaStatus === 'ATIVA' && !c.asaasAssinaturaId)));
    if (quebradas.length) {
      itens.push({
        id: 'pag:assinatura-quebrada', grupo: g, titulo: 'Assinatura com dados desencontrados', situacao: 'falha',
        resumo: `${quebradas.length} conta(s) com a cobrança automática pela metade no banco.`,
        detalhes: quebradas.map((c) => `${c.nome}: assinatura ${c.asaasAssinaturaId ?? 'vazia'}, situação ${c.assinaturaStatus ?? 'vazia'}`),
        pedido: montarPedido({ titulo: 'Assinatura do Asaas desencontrada no banco', achado: 'Consultorias com asaasAssinaturaId sem assinaturaStatus, ou ATIVA sem assinatura.', detalhes: quebradas.map((c) => `${c.nome} (id ${c.id}): asaasAssinaturaId=${c.asaasAssinaturaId}, assinaturaStatus=${c.assinaturaStatus}`), ondeOlhar: ['apps/api/src/pagamentos/pagamentos.ts (assinar, cancelar, aviso)'], oQueFazer: 'Descubra em que passo isso fica pela metade, corrija e me diga como acertar essas contas.', sql: `SELECT id, nome, plano, "asaasAssinaturaId", "assinaturaStatus", "assinaturaPlano" FROM "Consultoria" WHERE id IN (${quebradas.map((c) => sqlTexto(c.id)).join(', ')});` }),
      });
    }

    // Faturas atrasadas e quem escolheu o plano e não pagou.
    const atuais = new Set(consultorias.map((c) => c.asaasAssinaturaId).filter(Boolean));
    const atrasadas = pagamentos.filter((p) => p.status === 'ATRASADO' && p.assinaturaId && atuais.has(p.assinaturaId));
    const aguardando = consultorias.filter((c) => c.assinaturaStatus === 'AGUARDANDO' && pagamentos.some((p) => p.assinaturaId === c.asaasAssinaturaId && p.status === 'PENDENTE' && agora - p.createdAt.getTime() > 3 * DIA));
    if (atrasadas.length || aguardando.length) {
      itens.push({
        id: 'pag:atrasos', grupo: g, titulo: 'Clientes com pagamento em aberto', situacao: 'atencao',
        resumo: `${atrasadas.length} fatura(s) atrasada(s) e ${aguardando.length} pessoa(s) que escolheram o plano e ainda não pagaram (mais de 3 dias).`,
        detalhes: [
          ...atrasadas.map((p) => `Atrasada: ${nome.get(p.consultoriaId)} · ${reais(p.valorCentavos)} · venceu em ${dia(p.vencimento)}`),
          ...aguardando.map((c) => `Não pagou a 1ª: ${c.nome} · plano ${planoPorCodigo(c.assinaturaPlano ?? '')?.nome ?? c.assinaturaPlano}`),
        ],
        comoResolver: 'Não é erro do sistema. O e-mail de lembrete sai sozinho; se quiser, chame no WhatsApp.',
      });
    } else itens.push({ id: 'pag:atrasos', grupo: g, titulo: 'Nenhum pagamento atrasado', situacao: 'ok', resumo: 'Todas as faturas em dia.' });

    // Contas que ficaram só para consulta (passaram dos 5 dias de tolerância).
    const consulta = consultorias.filter((c) => !ehDono.has(c.id) && situacaoPlano(c).situacao === 'CONSULTA');
    if (consulta.length) {
      itens.push({
        id: 'pag:so-consulta', grupo: g, titulo: `${consulta.length} conta(s) só para consulta`, situacao: 'atencao',
        resumo: 'O plano venceu há mais de 5 dias: a pessoa vê e baixa tudo, mas não cria nem muda nada até pagar.',
        detalhes: consulta.map((c) => `${c.nome} · venceu em ${c.planoPagoAte ? dia(c.planoPagoAte) : '—'}`),
        comoResolver: 'Se o cliente diz que pagou, confira no Asaas. Se pagou fora do sistema, use "Recebi o pagamento" no Painel ADM > Consultorias.',
      });
    }

    // Estornos e contestações no cartão (30 dias).
    const estornos = pagamentos.filter((p) => p.status === 'ESTORNADO' && agora - p.updatedAt.getTime() < 30 * DIA);
    if (estornos.length) {
      itens.push({
        id: 'pag:estornos', grupo: g, titulo: 'Estorno ou contestação de pagamento', situacao: 'atencao',
        resumo: `${estornos.length} pagamento(s) estornado(s) ou contestado(s) nos últimos 30 dias. O sistema não tira o plano sozinho: a decisão é sua.`,
        detalhes: estornos.map((p) => `${nome.get(p.consultoriaId) ?? p.consultoriaId} · ${reais(p.valorCentavos)} · fatura de ${dia(p.vencimento)}`),
        comoResolver: 'Veja o motivo no Asaas. Se for o caso, bloqueie ou ajuste o vencimento no Painel ADM > Consultorias.',
      });
    }
    return itens;
  }

  // Tarefas que o agendador do GitHub chama: avisos de vencimento (diário), régua de cobrança (diário) e resumo semanal.
  private async tarefas(): Promise<ItemDiagnostico[]> {
    const lista = [
      { rota: '/tarefas/avisos-plano', nome: 'Avisos de vencimento do plano', maxHoras: 36, arquivo: '.github/workflows/regua-cobranca.yml' },
      { rota: '/tarefas/regua-cobranca', nome: 'Régua de cobrança das consultorias', maxHoras: 36, arquivo: '.github/workflows/regua-cobranca.yml' },
      { rota: '/tarefas/avisos-semanais', nome: 'E-mail semanal de vencimentos (segunda)', maxHoras: 8 * 24, arquivo: '.github/workflows/avisos-semanais.yml' },
      { rota: '/tarefas/normas-dou', nome: 'Busca de mudanças nas NRs (Diário Oficial)', maxHoras: 36, arquivo: '.github/workflows/normas-dou.yml' },
    ];
    const salvas = await this.prisma.configPlataforma.findMany({ where: { chave: { in: lista.map((t) => `chamada:${t.rota}`) } } });
    const problemas: string[] = [];
    const ok: string[] = [];
    for (const t of lista) {
      const s = salvas.find((x) => x.chave === `chamada:${t.rota}`);
      const u = s ? (JSON.parse(s.valor) as { em: string; status: number }) : null;
      if (!u) problemas.push(`${t.nome}: ainda não rodou desde que o Diagnóstico foi ligado`);
      else if (u.status >= 400) problemas.push(`${t.nome}: falhou ${haQuanto(u.em)} (código ${u.status})`);
      else if (Date.now() - new Date(u.em).getTime() > t.maxHoras * HORA) problemas.push(`${t.nome}: a última vez foi ${haQuanto(u.em)}, está atrasada`);
      else ok.push(`${t.nome}: rodou ${haQuanto(u.em)}`);
    }
    if (!problemas.length) return [{ id: 'tarefas', grupo: GRUPOS.pagamentos, titulo: 'Tarefas automáticas rodando', situacao: 'ok', resumo: 'Avisos de vencimento, régua de cobrança, e-mail semanal e busca de mudanças nas NRs em dia.', detalhes: ok }];
    const algumaFalhou = problemas.some((p) => p.includes('falhou'));
    return [{
      id: 'tarefas', grupo: GRUPOS.pagamentos, titulo: 'Tarefas automáticas com atraso', situacao: algumaFalhou ? 'falha' : 'atencao',
      resumo: `${problemas.length} de ${lista.length} tarefas automáticas não rodaram como deviam.`, detalhes: [...problemas, ...ok],
      comoResolver: problemas.some((p) => p.includes('401'))
        ? 'O segredo das tarefas no GitHub está diferente do que está no Render. Abra o Render (safety-nexo-api > Environment), copie o valor de TAREFAS_SEGREDO e cole o mesmo valor no GitHub em Settings > Secrets and variables > Actions > TAREFAS_SEGREDO (botão de lápis > Update secret). Depois rode a tarefa de novo em Actions > Run workflow.'
        : 'No GitHub, aba Actions: veja se as tarefas estão ligadas e se o segredo TAREFAS_SEGREDO é igual ao do Render. Logo depois de ligar o Diagnóstico é normal aparecer "ainda não rodou" até a próxima execução.',
      pedido: montarPedido({ titulo: 'Tarefas agendadas do GitHub não estão rodando', achado: problemas.join('; '), ondeOlhar: lista.map((t) => `${t.arquivo} → POST ${t.rota}`).filter((v, i, a) => a.indexOf(v) === i), oQueFazer: 'Confira os workflows e os logs no GitHub Actions, descubra por que falharam e corrija.' }),
    }];
  }

  // ---------- Erros recentes (caderno de falhas) ----------

  private async erros(): Promise<ItemDiagnostico[]> {
    await this.prisma.falhaSistema.deleteMany({ where: { ultimaEm: { lt: new Date(Date.now() - 30 * DIA) } } });
    const achados = await this.prisma.falhaSistema.findMany({ where: { ultimaEm: { gte: new Date(Date.now() - 48 * HORA) } }, orderBy: [{ ultimaEm: 'desc' }], take: 30 });
    // Erro que parou sozinho: se a mesma chamada (Asaas ou tarefa agendada) deu certo depois do último erro,
    // o problema já foi resolvido. Sai da lista e do caderno; se voltar a acontecer, aparece de novo.
    const voltouAFuncionar = await this.chamadasQueVoltaram(achados);
    if (voltouAFuncionar.length) await this.prisma.falhaSistema.deleteMany({ where: { id: { in: voltouAFuncionar } } });
    const recentes = achados.filter((f) => !voltouAFuncionar.includes(f.id)).slice(0, 12);
    if (!recentes.length) return [{ id: 'erros', grupo: GRUPOS.erros, titulo: 'Nenhum erro nas últimas 48 horas', situacao: 'ok', resumo: `Ninguém viu mensagem de erro do sistema, do pagamento ou do e-mail.${voltouAFuncionar.length ? ` ${voltouAFuncionar.length === 1 ? 'Um erro antigo saiu da lista' : `${voltouAFuncionar.length} erros antigos saíram da lista`} porque a mesma chamada voltou a dar certo depois.` : ''}` }];
    const ids = [...new Set(recentes.map((r) => r.consultoriaId).filter(Boolean))] as string[];
    const nomes = new Map((await this.prisma.consultoria.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } })).map((c) => [c.id, c.nome]));
    const ONDE: Record<string, string> = { MOTOR: 'no motor', TELA: 'numa tela do site', ASAAS: 'na conversa com o Asaas', EMAIL: 'no envio de e-mail' };
    return recentes.map((f) => {
      const cliente = f.consultoriaId ? nomes.get(f.consultoriaId) ?? f.consultoriaId : null;
      const titulo = f.origem === 'TELA' ? `Erro na tela ${f.rota ?? ''}`.trim() : f.origem === 'EMAIL' ? 'E-mail não foi enviado' : f.origem === 'ASAAS' ? `Erro com o Asaas${f.rota ? ` (${f.rota})` : ''}` : `Erro no motor: ${f.rota ?? ''}`.trim();
      return {
        id: `falha:${f.id}`, falhaId: f.id, grupo: GRUPOS.erros, titulo, situacao: f.origem === 'EMAIL' ? 'atencao' : 'falha',
        resumo: `${f.vezes > 1 ? `Aconteceu ${f.vezes} vezes, a última` : 'Aconteceu'} ${haQuanto(f.ultimaEm)}${cliente ? `, com ${cliente}` : ''}. Mensagem: "${f.mensagem.slice(0, 180)}"`,
        pedido: montarPedido({
          titulo: `Erro ${ONDE[f.origem] ?? ''}${f.rota ? ` em ${f.rota}` : ''}`.trim(),
          achado: `Aconteceu ${f.vezes} vez(es), primeira em ${quando(f.primeiraEm)}, última em ${quando(f.ultimaEm)}.${f.status ? ` Código ${f.status}.` : ''} Mensagem: ${f.mensagem}`,
          detalhes: [cliente ? `Cliente: ${cliente} (consultoriaId ${f.consultoriaId})` : 'Cliente: não identificado', ...(f.detalhe ? [`Pilha do erro:\n${f.detalhe.slice(0, 2500)}`] : [])],
          ondeOlhar: f.origem === 'TELA' ? ['apps/web/app (a tela do endereço acima)'] : f.origem === 'EMAIL' ? ['apps/api/src/common/email.ts', 'RESEND_API_KEY e AVISOS_REMETENTE no Render; domínio no Resend'] : f.origem === 'ASAAS' ? ['apps/api/src/pagamentos/asaas.ts e pagamentos.ts'] : ['apps/api/src (a rota acima)'],
          oQueFazer: 'Ache a causa e corrija, para o cliente não ver mais esse erro.',
        }),
      } satisfies ItemDiagnostico;
    });
  }

  // Erros de chamadas vigiadas (POST /pagamentos/asaas e /tarefas/*) que tiveram sucesso depois.
  private async chamadasQueVoltaram(falhas: { id: string; rota: string | null; ultimaEm: Date }[]): Promise<string[]> {
    const vigiadas = falhas.filter((f) => f.rota?.startsWith('POST /'));
    if (!vigiadas.length) return [];
    const chaves = [...new Set(vigiadas.map((f) => `chamada:${f.rota!.slice(5)}`))];
    const salvas = await this.prisma.configPlataforma.findMany({ where: { chave: { in: chaves } } });
    const ultimoSucesso = new Map<string, number>();
    for (const c of salvas) {
      try {
        const v = JSON.parse(c.valor) as { em: string; status: number };
        if (v.status < 400) ultimoSucesso.set(c.chave, new Date(v.em).getTime());
      } catch { /* valor estragado: ignora */ }
    }
    return vigiadas.filter((f) => (ultimoSucesso.get(`chamada:${f.rota!.slice(5)}`) ?? 0) > f.ultimaEm.getTime()).map((f) => f.id);
  }

  // ---------- Site, e-mail e avisos ----------

  private async siteEAvisos(): Promise<ItemDiagnostico[]> {
    const g = GRUPOS.site;
    const itens: ItemDiagnostico[] = [];
    const site = WEB();
    const t = Date.now();
    try {
      const r = await fetch(site, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
      const ms = Date.now() - t;
      itens.push(r.ok
        ? { id: 'site', grupo: g, titulo: `Site ${site.replace(/^https?:\/\//, '')} abrindo`, situacao: ms > 5000 ? 'atencao' : 'ok', resumo: `Abriu em ${ms} ms.` }
        : { id: 'site', grupo: g, titulo: 'Site respondendo com erro', situacao: 'falha', resumo: `${site} respondeu ${r.status}.`, comoResolver: 'Abra o Netlify > safety-nexo-sst > Deploys e veja se o último deploy falhou.', pedido: montarPedido({ titulo: 'Site fora do ar ou com erro', achado: `${site} respondeu código ${r.status}.`, ondeOlhar: ['netlify.toml', 'apps/web', 'Deploys no Netlify'], oQueFazer: 'Descubra por que o site está respondendo com erro e corrija.' }) });
    } catch (e) {
      itens.push({ id: 'site', grupo: g, titulo: 'Site não abriu', situacao: 'falha', resumo: `${site} não respondeu em 10 segundos (${(e as Error).message}).`, comoResolver: 'Abra o site no celular para ver se é só lentidão. Se não abrir, confira o Netlify e o domínio na Umbler.', pedido: montarPedido({ titulo: 'Site não abre', achado: `${site} não respondeu: ${(e as Error).message}`, ondeOlhar: ['Netlify (deploys e domínio)', 'DNS do domínio na Umbler'], oQueFazer: 'Me ajude a descobrir por que o site não abre.' }) });
    }

    itens.push(emailLigado()
      ? { id: 'email', grupo: g, titulo: 'E-mails ligados', situacao: 'ok', resumo: `Saindo como ${process.env.AVISOS_REMETENTE ?? 'remetente de teste'}. Falhas de envio aparecem em "Erros que os clientes viram".` }
      : { id: 'email', grupo: g, titulo: 'E-mails desligados', situacao: 'atencao', resumo: 'Sem a chave do Resend, ninguém recebe e-mail (senha, avisos, vencimentos).', comoResolver: 'Coloque RESEND_API_KEY no Render (guia "ligar-email-e-ia.md").' });

    const aparelhos = await this.prisma.avisoCelular.count();
    itens.push(aparelhos
      ? { id: 'push', grupo: g, titulo: 'Avisos no celular ligados', situacao: 'ok', resumo: `${aparelhos} aparelho(s) recebem aviso de cadastro novo e de pagamento.` }
      : { id: 'push', grupo: g, titulo: 'Avisos no celular desligados', situacao: 'atencao', resumo: 'Você não recebe aviso na hora quando alguém se cadastra ou paga.', comoResolver: 'Painel ADM > Consultorias > cartão "Avisos no celular" > "Ligar avisos neste aparelho".' });
    return itens;
  }

  // Compara com a varredura anterior: o que estava com problema e agora está ok ganha a etiqueta "Resolvido".
  private async marcarResolvidos(itens: ItemDiagnostico[]) {
    const chave = 'diagnostico:ultimo';
    const antes = await this.prisma.configPlataforma.findUnique({ where: { chave } });
    const anterior: Record<string, { s: Situacao; t: string; g: string }> = antes ? JSON.parse(antes.valor) : {};
    const ids = new Set(itens.map((i) => i.id));
    for (const i of itens) {
      const a = anterior[i.id];
      if (i.situacao === 'ok' && a && a.s !== 'ok') i.resolvido = true;
    }
    // Problemas que sumiram da lista (ex.: erro marcado como resolvido, conta acertada): mostra uma vez em verde.
    for (const [id, a] of Object.entries(anterior)) {
      if (ids.has(id) || a.s === 'ok') continue;
      itens.push({ id, grupo: a.g, titulo: a.t, situacao: 'ok', resumo: 'Estava com problema na varredura anterior e não apareceu mais.', resolvido: true });
    }
    const agora: Record<string, { s: Situacao; t: string; g: string }> = {};
    for (const i of itens) if (!(i.resolvido && !ids.has(i.id))) agora[i.id] = { s: i.situacao, t: i.titulo, g: i.grupo };
    const valor = JSON.stringify(agora);
    await this.prisma.configPlataforma.upsert({ where: { chave }, create: { chave, valor }, update: { valor } });
  }
}

@SomenteAdmin()
@Controller('admin/diagnostico')
export class DiagnosticoController {
  constructor(private readonly s: DiagnosticoService) {}
  @Get() varrer() { return this.s.varrer(); }
  @Delete('falhas/:id') resolver(@Param('id') id: string) { return this.s.resolverFalha(id); }
}

// As telas do site mandam aqui os erros que o cliente viu (sem dados pessoais: só a mensagem e o endereço da tela).
@Publica()
@Controller('diagnostico')
export class FalhaTelaController {
  constructor(private readonly s: DiagnosticoService) {}
  @Post('falha-tela') @HttpCode(200) falha(@Body() dto: FalhaTelaDto) { return this.s.falhaDaTela(dto); }
}

@Module({ controllers: [DiagnosticoController, FalhaTelaController], providers: [DiagnosticoService] })
export class DiagnosticoModule {}
