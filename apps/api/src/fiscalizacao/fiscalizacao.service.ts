import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ArquivoService } from '../arquivo/arquivo.service';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { documentoHtml, escape } from '../documentos/layout';
import { PdfService } from '../documentos/pdf.service';
import { juntarPdfs } from '../dossie/dossie.service';
import { PrismaService } from '../prisma/prisma.service';
import { Sugestao, SugestoesTreinamentoService } from '../treinamentos/sugestoes';

// Pasta da fiscalização: o que o auditor fiscal costuma pedir na primeira visita, conferido item a item,
// e um PDF só com a última versão de cada documento já emitido. Nada é gerado de novo aqui,
// para não mudar a versão do PGR, PCMSO ou laudos.
export type SituacaoItem = 'OK' | 'ATENCAO' | 'FALTA' | 'NAO_SE_APLICA';
export type ItemFiscalizacao = { id: string; titulo: string; norma: string; situacao: SituacaoItem; detalhe: string; link: string };

const DIA = 86_400_000;
const data = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const ORDEM_CATEGORIA = ['Programas e laudos', 'Saúde ocupacional', 'Treinamentos', 'CIPA', 'Emergência', 'Funcionários', 'Operação diária', 'Pessoas e cultura'];
const FORA_DA_PASTA = /fiscalizacao|dossie|relatorio-mensal/i;
const MAX_ARQUIVOS = 60;
const MAX_POR_CATEGORIA = 15;
const MAX_BYTES = 25 * 1024 * 1024;
const NOME_SITUACAO: Record<SituacaoItem, string> = { OK: 'Em ordem', ATENCAO: 'Atenção', FALTA: 'Falta', NAO_SE_APLICA: 'Não se aplica' };

@Injectable()
export class FiscalizacaoService {
  private readonly log = new Logger('Fiscalizacao');
  constructor(
    private readonly prisma: PrismaService,
    private readonly arquivos: ArquivoService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly treinamentos: SugestoesTreinamentoService,
  ) {}

  async conferir(consultoriaId: string, empresaId: string, hoje = new Date()) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true, razaoSocial: true } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    const [documentos, ativos, riscos, eleicao, reuniao, emergencia, catsAbertas, aets, ordens, sugestoes] = await Promise.all([
      this.prisma.documento.findMany({ where: { empresaId }, orderBy: { geradoEm: 'desc' }, select: { tipo: true, geradoEm: true } }),
      this.prisma.colaborador.findMany({
        where: { empresaId, dataDesligamento: null },
        select: { id: true, gheId: true, asos: { orderBy: { dataExame: 'desc' }, take: 1, select: { proximoExame: true } }, entregasEpi: { select: { id: true }, take: 1 } },
      }),
      this.prisma.gheRisco.findMany({ where: { ghe: { empresaId } }, select: { gheId: true, tipo: true, medidasEpi: true } }),
      this.prisma.cipaEleicao.findFirst({ where: { empresaId }, orderBy: { eleicaoEm: 'desc' }, select: { eleicaoEm: true } }),
      this.prisma.cipaReuniao.findFirst({ where: { empresaId }, orderBy: { data: 'desc' }, select: { data: true } }),
      this.prisma.controleEmergencia.findMany({ where: { empresaId }, select: { tipo: true, descricao: true, validade: true } }),
      this.prisma.cat.count({ where: { empresaId, enviadaEm: null } }),
      this.prisma.aet.count({ where: { empresaId } }),
      this.prisma.arquivo.count({ where: { empresaId, nomeArquivo: { startsWith: 'Ordem' } } }),
      this.treinamentos.sugerir(consultoriaId, empresaId, hoje).catch((): Sugestao[] => []),
    ]);
    const ultimo = (tipo: string) => documentos.find((d) => d.tipo === tipo)?.geradoEm ?? null;
    const dias = (d: Date) => Math.floor((hoje.getTime() - d.getTime()) / DIA);
    const itens: ItemFiscalizacao[] = [];
    const add = (i: ItemFiscalizacao) => itens.push(i);

    const pgr = ultimo('PGR');
    add({
      id: 'pgr', titulo: 'PGR com inventário de riscos e plano de ação', norma: 'NR-01, 1.5.7', link: '/emitir',
      situacao: !pgr ? 'FALTA' : dias(pgr) > 730 ? 'ATENCAO' : 'OK',
      detalhe: !pgr ? 'Nenhum PGR emitido pelo sistema.' : `Último emitido em ${data(pgr)}${dias(pgr) > 730 ? ', passou de 2 anos sem revisão' : ''}.`,
    });
    const pcmso = ultimo('PCMSO');
    add({
      id: 'pcmso', titulo: 'PCMSO e relatório analítico do último ano', norma: 'NR-07, 7.6', link: '/emitir',
      situacao: !pcmso ? 'FALTA' : dias(pcmso) > 365 ? 'ATENCAO' : 'OK',
      detalhe: !pcmso ? 'Nenhum PCMSO emitido pelo sistema.' : `Último emitido em ${data(pcmso)}${dias(pcmso) > 365 ? '. O relatório analítico é anual: confira se o do último ano existe' : ''}.`,
    });
    const temAgente = riscos.some((r) => ['FISICO', 'QUIMICO', 'BIOLOGICO'].includes(r.tipo));
    const ltcat = ultimo('LTCAT');
    add({
      id: 'ltcat', titulo: 'LTCAT (aposentadoria especial)', norma: 'Lei 8.213/91, art. 58', link: '/emitir',
      situacao: !temAgente ? 'NAO_SE_APLICA' : ltcat ? 'OK' : 'FALTA',
      detalhe: !temAgente ? 'Não há risco físico, químico ou biológico cadastrado.' : ltcat ? `Emitido em ${data(ltcat)}.` : 'Há agentes físicos, químicos ou biológicos e nenhum LTCAT emitido.',
    });

    const semAso = ativos.filter((c) => !c.asos[0]);
    const asoVencido = ativos.filter((c) => c.asos[0]?.proximoExame && c.asos[0].proximoExame < hoje);
    add({
      id: 'aso', titulo: 'ASO de todos os empregados em dia', norma: 'NR-07, 7.5.19', link: '/saude',
      situacao: !ativos.length ? 'NAO_SE_APLICA' : semAso.length + asoVencido.length === 0 ? 'OK' : semAso.length ? 'FALTA' : 'ATENCAO',
      detalhe: !ativos.length ? 'Nenhum empregado ativo cadastrado.' : `${ativos.length - semAso.length - asoVencido.length} de ${ativos.length} em dia.${semAso.length ? ` ${semAso.length} sem nenhum ASO.` : ''}${asoVencido.length ? ` ${asoVencido.length} com exame vencido.` : ''}`,
    });

    const ghesComEpi = new Set(riscos.filter((r) => r.medidasEpi?.trim()).map((r) => r.gheId));
    const precisam = ativos.filter((c) => c.gheId && ghesComEpi.has(c.gheId));
    const semFicha = precisam.filter((c) => !c.entregasEpi.length);
    add({
      id: 'epi', titulo: 'Ficha de entrega de EPI assinada', norma: 'NR-06, 6.5.1', link: '/colaboradores',
      situacao: !precisam.length ? 'NAO_SE_APLICA' : semFicha.length ? 'FALTA' : 'OK',
      detalhe: !precisam.length ? 'Nenhum GHE pede EPI.' : semFicha.length ? `${semFicha.length} de ${precisam.length} empregados que precisam de EPI não têm entrega registrada.` : `Todos os ${precisam.length} empregados que precisam de EPI têm entrega registrada.`,
    });

    const pendTrein = sugestoes.reduce((s, x) => s + x.pendentes.length, 0);
    add({
      id: 'treinamentos', titulo: 'Certificados dos treinamentos obrigatórios', norma: 'NR-01, 1.7', link: '/treinamentos',
      situacao: !sugestoes.length ? 'NAO_SE_APLICA' : pendTrein ? 'FALTA' : 'OK',
      detalhe: !sugestoes.length ? 'Os riscos cadastrados não pedem treinamento específico de NR.' : pendTrein ? `${pendTrein} pendência(s) em ${sugestoes.filter((s) => s.pendentes.length).map((s) => s.norma).join(', ')}.` : 'Todos os treinamentos pedidos pelos riscos estão em dia.',
    });

    add({
      id: 'os', titulo: 'Ordens de serviço de segurança', norma: 'NR-01, 1.4.1 c', link: '/colaboradores',
      situacao: !ativos.length ? 'NAO_SE_APLICA' : ordens ? 'OK' : 'FALTA',
      detalhe: ordens ? `${ordens} ordem(ns) de serviço emitida(s) e guardada(s) no arquivo.` : 'Nenhuma ordem de serviço emitida pelo sistema.',
    });

    add({
      id: 'cipa', titulo: 'CIPA: eleição no último ano e atas das reuniões', norma: 'NR-05', link: '/cipa',
      situacao: !eleicao ? 'ATENCAO' : dias(eleicao.eleicaoEm) > 365 ? 'ATENCAO' : !reuniao || dias(reuniao.data) > 45 ? 'ATENCAO' : 'OK',
      detalhe: !eleicao
        ? 'Nenhuma eleição registrada. Se a empresa só precisa de designado, guarde a designação e o treinamento dele.'
        : `Eleição em ${data(eleicao.eleicaoEm)}${dias(eleicao.eleicaoEm) > 365 ? ' (mandato de 1 ano já passou)' : ''}. ${reuniao ? `Última reunião em ${data(reuniao.data)}${dias(reuniao.data) > 45 ? ', as reuniões ordinárias são mensais' : ''}.` : 'Nenhuma ata de reunião registrada.'}`,
    });

    const ergo = riscos.some((r) => r.tipo === 'ERGONOMICO');
    add({
      id: 'ergonomia', titulo: 'Avaliação ergonômica (AEP ou AET)', norma: 'NR-17, 17.3', link: '/saude',
      situacao: !ergo ? 'NAO_SE_APLICA' : aets ? 'OK' : 'ATENCAO',
      detalhe: !ergo ? 'Não há risco ergonômico cadastrado.' : aets ? `${aets} AET registrada(s).` : 'Há risco ergonômico e nenhuma AET. A AEP do PGR atende na maioria dos casos; a AET é exigida quando a AEP não resolve.',
    });

    const vencidos = emergencia.filter((e) => e.validade && e.validade < hoje);
    const avcb = emergencia.find((e) => e.tipo === 'AVCB' || e.tipo === 'CLCB');
    add({
      id: 'emergencia', titulo: 'AVCB/CLCB e equipamentos de combate a incêndio', norma: 'NR-23', link: '/emergencia',
      situacao: !emergencia.length ? 'ATENCAO' : vencidos.length ? 'FALTA' : avcb ? 'OK' : 'ATENCAO',
      detalhe: !emergencia.length ? 'Nada cadastrado em Emergência.' : vencidos.length ? `Vencidos: ${vencidos.slice(0, 4).map((v) => `${v.tipo} ${v.descricao}`).join(', ')}.` : avcb ? `${avcb.tipo} válido até ${data(avcb.validade)}.` : 'Sem AVCB ou CLCB cadastrado.',
    });

    add({
      id: 'cat', titulo: 'CAT de todos os acidentes enviada ao eSocial', norma: 'Lei 8.213/91, art. 22', link: '/saude',
      situacao: catsAbertas ? 'FALTA' : 'OK',
      detalhe: catsAbertas ? `${catsAbertas} CAT registrada(s) e ainda não transmitida(s).` : 'Nenhuma CAT pendente de envio.',
    });

    const pontos = itens.filter((i) => i.situacao !== 'NAO_SE_APLICA');
    const prontos = pontos.filter((i) => i.situacao === 'OK').length;
    return { empresa: empresa.razaoSocial, itens, prontos, total: pontos.length };
  }

  // Última versão de cada documento guardado no arquivo, na ordem em que o fiscal costuma pedir.
  private async documentosDaPasta(empresaId: string) {
    const todos = await this.prisma.arquivo.findMany({
      where: { empresaId, mime: 'application/pdf', categoria: { notIn: ['Indicadores', 'Previdência e custos'] } },
      orderBy: [{ chave: 'asc' }, { versao: 'desc' }],
      select: { id: true, chave: true, titulo: true, categoria: true, versao: true, tamanho: true, criadoEm: true, nomeArquivo: true },
    });
    const ultimos = new Map<string, (typeof todos)[number]>();
    for (const a of todos) if (!ultimos.has(a.chave) && !FORA_DA_PASTA.test(a.chave) && !FORA_DA_PASTA.test(a.nomeArquivo)) ultimos.set(a.chave, a);
    const pos = (c: string) => { const i = ORDEM_CATEGORIA.indexOf(c); return i < 0 ? 99 : i; };
    const ordenados = [...ultimos.values()].sort((a, b) => pos(a.categoria) - pos(b.categoria) || b.criadoEm.getTime() - a.criadoEm.getTime());
    const porCategoria = new Map<string, number>();
    const escolhidos: typeof ordenados = [];
    let bytes = 0;
    for (const a of ordenados) {
      const n = porCategoria.get(a.categoria) ?? 0;
      if (n >= MAX_POR_CATEGORIA || escolhidos.length >= MAX_ARQUIVOS || bytes + a.tamanho > MAX_BYTES) continue;
      porCategoria.set(a.categoria, n + 1);
      escolhidos.push(a);
      bytes += a.tamanho;
    }
    return { escolhidos, deFora: ordenados.length - escolhidos.length };
  }

  async gerar(consultoriaId: string, empresaId: string, hoje = new Date()) {
    const conf = await this.conferir(consultoriaId, empresaId, hoje);
    const { escolhidos, deFora } = await this.documentosDaPasta(empresaId);
    const anexos: { titulo: string; categoria: string; versao: number; criadoEm: Date; pdf: Buffer }[] = [];
    for (const a of escolhidos) {
      try {
        const { conteudo } = await this.arquivos.lerInterno(empresaId, a.id);
        anexos.push({ titulo: a.titulo, categoria: a.categoria, versao: a.versao, criadoEm: a.criadoEm, pdf: conteudo });
      } catch (e) {
        this.log.warn(`Arquivo ${a.id} fora da pasta: ${(e as Error).message}`);
      }
    }
    const { empresa, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'FISCALIZACAO');
    const linhas = conf.itens.map((i) => `<tr><td>${escape(i.titulo)}</td><td>${escape(i.norma)}</td><td class="s-${i.situacao}">${NOME_SITUACAO[i.situacao]}</td><td>${escape(i.detalhe)}</td></tr>`).join('');
    const indice = anexos.map((a, n) => `<tr><td>${n + 1}</td><td>${escape(a.titulo)}</td><td>${escape(a.categoria)}</td><td>v${a.versao} · ${data(a.criadoEm)}</td></tr>`).join('');
    const corpo = `
      <section>
        <p>Esta pasta reúne os documentos de segurança e saúde no trabalho que o auditor fiscal costuma pedir na visita, com a situação de cada um na data de hoje. Logo depois desta lista vêm os próprios documentos, na última versão emitida.</p>
        <h2>1. Situação dos documentos</h2>
        <p><strong>${conf.prontos} de ${conf.total}</strong> itens em ordem.</p>
        <table><thead><tr><th>Documento</th><th>Base</th><th>Situação</th><th>Observação</th></tr></thead><tbody>${linhas}</tbody></table>
        <p class="meta">Itens com "Falta" ou "Atenção" podem gerar auto de infração (NR-28). Corrija antes da visita sempre que der.</p>
        <h2>2. Documentos desta pasta</h2>
        ${indice ? `<table><thead><tr><th>Nº</th><th>Documento</th><th>Grupo</th><th>Versão</th></tr></thead><tbody>${indice}</tbody></table>` : '<p class="meta">Ainda não há documentos guardados no arquivo da empresa. Gere o PGR, o PCMSO e os demais pelo sistema para que entrem aqui.</p>'}
        ${deFora ? `<p class="meta">${deFora} documento(s) mais antigos ou de rotina ficaram de fora para a pasta não passar do tamanho. Eles continuam no Arquivo da empresa.</p>` : ''}
      </section>`;
    const css = `.s-OK{color:#0a7d3b;font-weight:600}.s-ATENCAO{color:#b26a00;font-weight:600}.s-FALTA{color:#b42318;font-weight:600}.s-NAO_SE_APLICA{color:#667085}`;
    const capa = await this.pdf.render(documentoHtml({ titulo: 'Pasta da fiscalização', logoEmpresa, consultoria, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj], ['Situação em', data(geradoEm)]], aviso: 'Feito com o Safety Nexo. Leve também os originais assinados no dia da visita.' }, corpo, css));
    const partes = [capa];
    for (const a of anexos) {
      try { await juntarPdfs([a.pdf]); partes.push(a.pdf); } catch { this.log.warn(`PDF ilegível fora da pasta: ${a.titulo}`); }
    }
    return juntarPdfs(partes);
  }
}
