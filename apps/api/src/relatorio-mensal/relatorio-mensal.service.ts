import { BadRequestException, Injectable } from '@nestjs/common';
import { ConferenciaService } from '../conferencia/conferencia.service';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { documentoHtml, escape } from '../documentos/layout';
import { PdfService } from '../documentos/pdf.service';
import { trocaPrevista } from '../estoque/vida-util';
import { PainelService } from '../painel/painel.service';
import { PrismaService } from '../prisma/prisma.service';

// Relatório mensal da consultoria para o cliente: o que foi feito no mês, como a empresa está
// e o que vem no mês seguinte. É a prestação de contas que mostra o valor do serviço.
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const data = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const DIA = 86_400_000;

export function periodoDoMes(mes?: string, hoje = new Date()) {
  let ano: number; let m: number;
  if (mes) {
    const x = mes.match(/^(\d{4})-(\d{2})$/);
    if (!x || Number(x[2]) < 1 || Number(x[2]) > 12) throw new BadRequestException('Mês inválido. Use o formato AAAA-MM.');
    ano = Number(x[1]); m = Number(x[2]) - 1;
  } else {
    // Sem mês: o mês anterior, que é o que se fecha e manda ao cliente no começo do mês.
    ano = hoje.getUTCFullYear(); m = hoje.getUTCMonth() - 1;
    if (m < 0) { m = 11; ano -= 1; }
  }
  const inicio = new Date(Date.UTC(ano, m, 1));
  const fim = new Date(Date.UTC(ano, m + 1, 1));
  return { inicio, fim, nome: `${MESES[m]} de ${ano}`, chave: `${ano}-${String(m + 1).padStart(2, '0')}` };
}

@Injectable()
export class RelatorioMensalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly painel: PainelService,
    private readonly conferencia: ConferenciaService,
  ) {}

  async gerar(consultoriaId: string, empresaId: string, mes?: string, hoje = new Date()) {
    const { inicio, fim, nome } = periodoDoMes(mes, hoje);
    const noMes = { gte: inicio, lt: fim };
    const { empresa, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'RELATORIO_MENSAL');
    const [historico, arquivos, inspecoes, ddss, turmas, asos, epis, feitas, abertas, relatos, cats, atestados, painel, conf, entregasEmUso] = await Promise.all([
      this.prisma.historico.findMany({ where: { empresaId, papel: 'CONSULTORIA', createdAt: noMes }, select: { acao: true } }),
      this.prisma.arquivo.findMany({ where: { empresaId, origem: 'GERADO', criadoEm: noMes }, orderBy: { criadoEm: 'asc' }, select: { titulo: true, versao: true, criadoEm: true } }),
      this.prisma.inspecao.findMany({ where: { empresaId, data: noMes }, orderBy: { data: 'asc' }, select: { titulo: true, local: true, data: true, itens: true } }),
      this.prisma.dds.findMany({ where: { empresaId, data: noMes }, orderBy: { data: 'asc' }, select: { tema: true, data: true, participantes: true } }),
      this.prisma.turma.findMany({ where: { empresaId, fim: noMes }, orderBy: { fim: 'asc' }, select: { nome: true, norma: true, fim: true, cargaHoraria: true, _count: { select: { participantes: true } } } }),
      this.prisma.aso.findMany({ where: { colaborador: { empresaId }, dataExame: noMes }, select: { tipo: true, resultado: true } }),
      this.prisma.entregaEpi.aggregate({ where: { colaborador: { empresaId }, dataEntrega: noMes }, _sum: { quantidade: true }, _count: { _all: true } }),
      this.prisma.acaoCorretiva.findMany({ where: { empresaId, status: 'FEITA', feitaEm: noMes }, orderBy: { feitaEm: 'asc' }, select: { descricao: true, local: true, feitaEm: true, eficaz: true } }),
      this.prisma.acaoCorretiva.findMany({ where: { empresaId, status: { not: 'FEITA' } }, orderBy: [{ prazo: 'asc' }], select: { descricao: true, local: true, prazo: true, responsavel: true } }),
      this.prisma.relato.findMany({ where: { empresaId, criadoEm: noMes }, select: { status: true } }),
      this.prisma.cat.findMany({ where: { empresaId, dataHora: noMes }, select: { tipoAcidente: true, houveAfastamento: true } }),
      this.prisma.atestado.findMany({ where: { empresaId, inicio: noMes }, select: { dias: true } }),
      this.painel.montar(consultoriaId, empresaId, hoje).catch(() => null),
      this.conferencia.conferir(consultoriaId, empresaId, hoje).catch(() => null),
      this.prisma.entregaEpi.findMany({ where: { devolvidoEm: null, vidaUtilDias: { gte: 7 }, colaborador: { empresaId, dataDesligamento: null } }, select: { dataEntrega: true, vidaUtilDias: true } }),
    ]);

    // ---------- Números do mês ----------
    const pessoasDds = ddss.reduce((s, d) => s + d.participantes.length, 0);
    const pessoasTrein = turmas.reduce((s, t) => s + t._count.participantes, 0);
    const naoConformes = inspecoes.reduce((s, i) => s + ((i.itens as { resposta?: string }[]) ?? []).filter((x) => x.resposta === 'NC').length, 0);
    const diasPerdidos = atestados.reduce((s, a) => s + a.dias, 0);
    const numeros: [string, string | number][] = [
      ['Documentos emitidos', arquivos.length],
      ['Inspeções', inspecoes.length],
      ['DDS', `${ddss.length} (${pessoasDds} participações)`],
      ['Treinamentos', `${turmas.length} (${pessoasTrein} pessoas)`],
      ['ASOs registrados', asos.length],
      ['EPIs entregues', epis._sum.quantidade ?? 0],
      ['Ações concluídas', feitas.length],
      ['Relatos dos trabalhadores', relatos.length],
      ['Acidentes (CAT)', cats.length],
      ['Dias de atestado', diasPerdidos],
    ];
    const caixas = numeros.map(([r, v]) => `<div class="num"><strong>${escape(String(v))}</strong><span>${escape(r)}</span></div>`).join('');

    // ---------- O que a consultoria fez ----------
    const porAcao = new Map<string, number>();
    for (const h of historico) porAcao.set(h.acao, (porAcao.get(h.acao) ?? 0) + 1);
    const atividades = [...porAcao.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

    // ---------- Próximo mês ----------
    const proxIni = fim; const proxFim = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() + 1, 1));
    const [asosProx, docsProx] = await Promise.all([
      this.prisma.aso.findMany({ where: { colaborador: { empresaId, dataDesligamento: null }, proximoExame: { gte: proxIni, lt: proxFim } }, select: { colaboradorId: true } }),
      this.prisma.documento.findMany({ where: { empresaId, vencimento: { gte: hoje, lt: new Date(hoje.getTime() + 60 * DIA) } }, orderBy: { vencimento: 'asc' }, select: { tipo: true, vencimento: true } }),
    ]);
    const trocasProx = entregasEmUso.filter((e) => { const t = trocaPrevista(e.dataEntrega, e.vidaUtilDias); return t && t >= proxIni && t < proxFim; }).length;
    const atrasadas = abertas.filter((a) => a.prazo && a.prazo < hoje);
    const proximo = [
      docsProx.length && `Revisar ${docsProx.map((d) => `${d.tipo} (vence em ${data(d.vencimento)})`).join(', ')}.`,
      asosProx.length && `${new Set(asosProx.map((a) => a.colaboradorId)).size} exame(s) periódico(s) vencem no próximo mês.`,
      trocasProx && `${trocasProx} EPI(s) chegam ao fim da vida útil e precisam ser trocados.`,
      atrasadas.length && `Colocar em dia ${atrasadas.length} ação(ões) do plano que passaram do prazo.`,
      abertas.length - atrasadas.length > 0 && `Acompanhar ${abertas.length - atrasadas.length} ação(ões) do plano que estão no prazo.`,
    ].filter(Boolean) as string[];

    const vencidas = (painel?.pendencias ?? []).filter((p) => p.nivel === 'vencido').slice(0, 8);
    const graves = (conf?.itens ?? []).filter((i) => i.gravidade === 'ALTA' && i.id !== 'revisao').slice(0, 5);
    const tab = (cab: string[], linhas: string[], vazio: string) => (linhas.length ? `<table><thead><tr>${cab.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table>` : `<p class="meta">${vazio}</p>`);

    const corpo = `
      <section>
        <p>Este relatório mostra o trabalho de segurança e saúde no trabalho feito na <strong>${escape(empresa.razaoSocial)}</strong> em <strong>${nome}</strong>, como a empresa está hoje e o que está previsto para o próximo mês.</p>
        <h2>1. O mês em números</h2>
        <div class="nums">${caixas}</div>
        ${conf ? `<p>Nota da conferência dos documentos: <strong>${conf.nota} de 100</strong> (${escape(conf.faixa)}).</p>` : ''}

        <h2>2. O que foi feito</h2>
        ${tab(['Atividade', 'Vezes'], atividades.map(([a, n]) => `<tr><td>${escape(a)}</td><td class="c">${n}</td></tr>`), 'Nenhuma atividade registrada no sistema neste mês.')}

        <h2>3. Documentos emitidos</h2>
        ${tab(['Documento', 'Versão', 'Data'], arquivos.slice(0, 40).map((a) => `<tr><td>${escape(a.titulo)}</td><td class="c">${a.versao}</td><td>${data(a.criadoEm)}</td></tr>`), 'Nenhum documento emitido neste mês.')}

        <h2>4. Campo: inspeções, DDS e treinamentos</h2>
        ${tab(['Data', 'Inspeção', 'Local'], inspecoes.map((i) => `<tr><td>${data(i.data)}</td><td>${escape(i.titulo)}</td><td>${escape(i.local)}</td></tr>`), 'Nenhuma inspeção neste mês.')}
        ${inspecoes.length ? `<p class="meta">${naoConformes} item(ns) fora do padrão encontrados nas inspeções.</p>` : ''}
        ${tab(['Data', 'Tema do DDS', 'Participantes'], ddss.map((d) => `<tr><td>${data(d.data)}</td><td>${escape(d.tema)}</td><td class="c">${d.participantes.length}</td></tr>`), 'Nenhum DDS registrado neste mês.')}
        ${tab(['Concluído em', 'Treinamento', 'Carga', 'Pessoas'], turmas.map((t) => `<tr><td>${data(t.fim)}</td><td>${escape(t.nome)}${t.norma ? ` (${escape(t.norma)})` : ''}</td><td>${t.cargaHoraria} h</td><td class="c">${t._count.participantes}</td></tr>`), 'Nenhum treinamento concluído neste mês.')}

        <h2>5. Plano de ação</h2>
        ${tab(['Concluída em', 'Ação', 'Local', 'Funcionou?'], feitas.map((a) => `<tr><td>${data(a.feitaEm)}</td><td>${escape(a.descricao)}</td><td>${escape(a.local ?? '—')}</td><td>${a.eficaz === true ? 'Sim' : a.eficaz === false ? 'Não, refazer' : 'A avaliar'}</td></tr>`), 'Nenhuma ação concluída neste mês.')}
        ${atrasadas.length ? `<h3>Ações atrasadas</h3>${tab(['Prazo', 'Ação', 'Responsável'], atrasadas.slice(0, 10).map((a) => `<tr><td class="atraso">${data(a.prazo)}</td><td>${escape(a.descricao)}</td><td>${escape(a.responsavel ?? '—')}</td></tr>`), '')}` : ''}

        <h2>6. Pontos de atenção</h2>
        ${vencidas.length || graves.length ? `<ul>${[...vencidas.map((p) => `<li><strong>${escape(p.titulo)}.</strong> ${escape(p.detalhe)}</li>`), ...graves.map((g) => `<li><strong>${escape(g.titulo)}.</strong> ${escape(g.corrigir)}</li>`)].join('')}</ul>` : '<p>Nada vencido ou grave no momento.</p>'}
        ${cats.length ? `<p>Houve ${cats.length} acidente(s) com CAT no mês${cats.some((c) => c.houveAfastamento) ? ', com afastamento' : ''}. A investigação e as medidas estão no plano de ação.</p>` : ''}

        <h2>7. Próximo mês</h2>
        ${proximo.length ? `<ul>${proximo.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>` : '<p>Nada com prazo no próximo mês além da rotina.</p>'}

        <p class="assinatura-final">${escape(consultoria.nome)}${consultoria.responsavel ? `<br><span class="meta">${escape(consultoria.responsavel)}</span>` : ''}</p>
      </section>`;
    const css = `
      .nums { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 8px 0 12px; }
      .num { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center; }
      .num strong { display: block; font-size: 16px; color: #0E4A5B; }
      .num span { font-size: 10px; color: #475569; }
      td.c { text-align: center; } .atraso { color: #b42318; font-weight: 600; }
      .assinatura-final { margin-top: 28px; }`;
    return this.pdf.render(documentoHtml({
      titulo: `Relatório mensal de SST: ${nome}`, logoEmpresa, consultoria,
      infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj], ['Período', `${data(inicio)} a ${data(new Date(fim.getTime() - DIA))}`], ['Emitido em', data(geradoEm)]],
      aviso: 'Feito com o Safety Nexo.',
    }, corpo, css));
  }
}
