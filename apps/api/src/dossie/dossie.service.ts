import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { documentoHtml, escape } from '../documentos/layout';
import { NOME_NIVEL, nivelRisco } from '../documentos/nivel-risco';
import { PdfService } from '../documentos/pdf.service';
import { LaudosService } from '../laudos/laudos.service';
import { PrismaService } from '../prisma/prisma.service';
import { SugestoesTreinamentoService } from '../treinamentos/sugestoes';
import { validadeDaTurma } from '../treinamentos/treinamentos.service';

const data = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const TIPO_ASO: Record<string, string> = { ADMISSIONAL: 'Admissional', PERIODICO: 'Periódico', RETORNO_TRABALHO: 'Retorno ao trabalho', MUDANCA_RISCO: 'Mudança de risco', DEMISSIONAL: 'Demissional' };
const TIPO_RISCO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico', ERGONOMICO: 'Ergonômico', ACIDENTE: 'Acidente' };
const MOTIVO_AFAST: Record<string, string> = { '01': 'Acidente ou doença do trabalho', '03': 'Doença ou acidente sem relação com o trabalho' };
const ok = (v: boolean) => (v ? '<span class="ok">Sim</span>' : '<span class="atraso">Não</span>');

// Dossiê do trabalhador: junta num PDF só as provas de que a empresa cumpriu as obrigações de SST com a pessoa.
// Serve para defesa em processo trabalhista, perícia e fiscalização. Depois do resumo vêm a ficha de EPI, a OS e o PPP.
@Injectable()
export class DossieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly colaboradores: ColaboradoresService,
    private readonly laudos: LaudosService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly treinamentos: SugestoesTreinamentoService,
  ) {}

  async gerar(consultoriaId: string, empresaId: string, colaboradorId: string, hoje = new Date()) {
    const c = await this.colaboradores.detalhar(consultoriaId, empresaId, colaboradorId);
    const [participacoes, ddss, assinaturasDds, afastamentos, cats, faciais, sugestoes] = await Promise.all([
      this.prisma.participacao.findMany({ where: { colaboradorId }, include: { turma: true }, orderBy: { turma: { fim: 'desc' } } }),
      this.prisma.dds.findMany({ where: { empresaId, participantes: { has: colaboradorId } }, orderBy: { data: 'desc' }, select: { id: true, data: true, tema: true } }),
      this.prisma.assinaturaPresenca.findMany({ where: { colaboradorId }, select: { tipo: true, refId: true } }),
      this.prisma.afastamento.findMany({ where: { colaboradorId }, orderBy: { inicio: 'desc' } }),
      this.prisma.cat.findMany({ where: { colaboradorId }, orderBy: { dataHora: 'desc' } }),
      this.prisma.presencaFacial.findMany({ where: { colaboradorId }, select: { tipo: true, refId: true } }),
      this.treinamentos.sugerir(consultoriaId, empresaId, hoje).catch(() => []),
    ]);
    if (!c) throw new NotFoundException('Colaborador não encontrado');
    const assinou = (tipo: string, refId: string) => assinaturasDds.some((a) => a.tipo === tipo && a.refId === refId) || faciais.some((f) => f.tipo === tipo && f.refId === refId);
    const { empresa, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'DOSSIE');

    // ---------- Pontos de atenção: o que a outra parte usaria contra a empresa ----------
    const atencao: string[] = [];
    const asos = [...c.asos].sort((a, b) => a.dataExame.getTime() - b.dataExame.getTime());
    if (!asos.some((a) => a.tipo === 'ADMISSIONAL')) atencao.push('Não há ASO admissional registrado.');
    for (let i = 1; i < asos.length; i++) {
      const prev = asos[i - 1];
      if (prev.proximoExame && asos[i].dataExame > prev.proximoExame) atencao.push(`ASO ${TIPO_ASO[asos[i].tipo]?.toLowerCase() ?? ''} de ${data(asos[i].dataExame)} feito depois do prazo (vencia em ${data(prev.proximoExame)}).`);
    }
    const ultimo = asos[asos.length - 1];
    if (!c.dataDesligamento && ultimo?.proximoExame && ultimo.proximoExame < hoje) atencao.push(`Exame periódico vencido desde ${data(ultimo.proximoExame)}.`);
    const epiForaCa = c.entregasEpi.filter((e) => e.validadeCa && e.validadeCa < e.dataEntrega);
    if (epiForaCa.length) atencao.push(`${epiForaCa.length} EPI entregue(s) com o CA já vencido na data da entrega.`);
    const pedeEpi = (c.ghe?.riscos ?? []).some((r) => r.medidasEpi?.trim());
    if (pedeEpi && !c.entregasEpi.length) atencao.push('Os riscos do GHE pedem EPI, mas não há entrega registrada.');
    for (const s of sugestoes) if (s.pendentes.some((p) => p.id === colaboradorId)) atencao.push(`${s.norma}: "${s.modelo}" exigido pelos riscos, sem registro em dia.`);

    // ---------- Tabelas ----------
    const riscos = (c.ghe?.riscos ?? []).map((r) => `<tr><td>${escape(TIPO_RISCO[r.tipo] ?? r.tipo)}</td><td>${escape(r.agente)}</td><td>${escape(r.fonteGeradora)}</td><td>${NOME_NIVEL[nivelRisco(r.severidade, r.probabilidade)]}</td><td>${escape([r.medidasEpc && `EPC: ${r.medidasEpc}`, r.medidasEpi && `EPI: ${r.medidasEpi}`].filter(Boolean).join('; ') || '—')}</td></tr>`).join('');
    const tabAso = [...c.asos].map((a) => `<tr><td>${escape(TIPO_ASO[a.tipo] ?? a.tipo)}</td><td>${data(a.dataExame)}</td><td>${a.resultado === 'APTO' ? 'Apto' : 'Inapto'}</td><td>${escape(a.medicoExaminadorNome)} (CRM ${escape(a.medicoExaminadorCrm)})</td><td>${data(a.proximoExame)}</td></tr>`).join('');
    const tabEpi = c.entregasEpi.map((e) => `<tr><td>${escape(e.epi)}</td><td>${escape(e.ca)}</td><td>${data(e.dataEntrega)}</td><td>${e.validadeCa ? ok(e.validadeCa >= e.dataEntrega) : '—'}</td><td>${faciais.some((f) => f.tipo === 'EPI' && f.refId === e.id) ? 'Rosto' : 'Ficha'}</td><td>${e.devolvidoEm ? data(e.devolvidoEm) : 'Em uso'}</td></tr>`).join('');
    const tabTrein = participacoes.map((p) => { const v = validadeDaTurma(p.turma); return `<tr><td>${escape(p.turma.nome)}</td><td>${escape(p.turma.norma ?? '—')}</td><td>${data(p.turma.fim)}</td><td>${p.turma.cargaHoraria} h</td><td>${v ? `${data(v)} ${v < hoje ? '<span class="atraso">(vencido)</span>' : ''}` : 'Sem validade fixa'}</td><td>${assinou('TREINAMENTO', p.turmaId) ? 'Assinou' : 'Lista física'}</td><td>${escape(p.codigo)}</td></tr>`; }).join('');
    const tabDds = ddss.slice(0, 30).map((d) => `<tr><td>${data(d.data)}</td><td>${escape(d.tema)}</td><td>${assinou('DDS', d.id) ? 'Assinou' : 'Lista física'}</td></tr>`).join('');
    const tabAfast = [
      ...cats.map((x) => `<tr><td>CAT (${escape(x.tipoAcidente.toLowerCase())})</td><td>${data(x.dataHora)}</td><td>${escape(x.descricao.slice(0, 140))}</td></tr>`),
      ...afastamentos.map((a) => `<tr><td>Afastamento</td><td>${data(a.inicio)} a ${a.fim ? data(a.fim) : 'em aberto'}</td><td>${escape(MOTIVO_AFAST[a.motivo] ?? `Motivo ${a.motivo}`)}</td></tr>`),
    ].join('');
    const tabela = (cab: string[], linhas: string, vazio: string) => (linhas ? `<table><thead><tr>${cab.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>` : `<p class="meta">${vazio}</p>`);

    const corpo = `
      <section>
        <p>Este dossiê junta, num arquivo só, os registros de segurança e saúde no trabalho de <strong>${escape(c.nome)}</strong>: exames, EPI, treinamentos, ordem de serviço e exposição aos riscos. Serve para responder a processo trabalhista, perícia ou fiscalização. Depois deste resumo vêm a ficha de EPI, a ordem de serviço e o PPP.</p>
        <h2>1. Trabalhador</h2>
        <table><tbody>
          <tr><th>Nome</th><td>${escape(c.nome)}</td><th>CPF</th><td>${escape(c.cpf ?? '—')}</td></tr>
          <tr><th>Cargo</th><td>${escape(c.cargo)}${c.cbo ? ` (CBO ${escape(c.cbo)})` : ''}</td><th>Matrícula</th><td>${escape(c.matricula ?? '—')}</td></tr>
          <tr><th>Admissão</th><td>${data(c.dataAdmissao)}</td><th>Saída</th><td>${c.dataDesligamento ? data(c.dataDesligamento) : 'Ativo'}</td></tr>
          <tr><th>GHE</th><td colspan="3">${escape(c.ghe?.nome ?? 'Sem GHE')}</td></tr>
        </tbody></table>
        <h2>2. Pontos de atenção</h2>
        ${atencao.length ? `<ul>${atencao.map((a) => `<li class="atraso">${escape(a)}</li>`).join('')}</ul>` : '<p class="ok">Nenhuma falha encontrada nos registros.</p>'}
        <h2>3. Riscos do posto (inventário do PGR)</h2>
        ${tabela(['Tipo', 'Agente', 'Fonte', 'Nível', 'Proteção'], riscos, 'Sem riscos cadastrados no GHE.')}
        <h2>4. Exames (ASO)</h2>
        ${tabela(['Exame', 'Data', 'Resultado', 'Médico', 'Próximo'], tabAso, 'Nenhum ASO registrado.')}
        <h2>5. Entregas de EPI</h2>
        ${tabela(['EPI', 'CA', 'Entregue em', 'CA válido na entrega', 'Confirmação', 'Devolução'], tabEpi, 'Nenhuma entrega registrada.')}
        <h2>6. Treinamentos</h2>
        ${tabela(['Treinamento', 'Norma', 'Concluído', 'Carga', 'Validade', 'Presença', 'Certificado'], tabTrein, 'Nenhum treinamento registrado.')}
        <h2>7. Diálogos de segurança (DDS)</h2>
        <p>${ddss.length} DDS com a participação de ${escape(c.nome.split(' ')[0])}${ddss.length > 30 ? ' (abaixo, os 30 mais recentes)' : ''}.</p>
        ${tabela(['Data', 'Tema', 'Presença'], tabDds, 'Nenhum DDS registrado.')}
        <h2>8. Acidentes e afastamentos</h2>
        ${tabela(['Registro', 'Quando', 'Descrição'], tabAfast, 'Nenhum acidente ou afastamento registrado.')}
        <p class="meta">Os certificados de treinamento podem ser conferidos pelo código no site do sistema. Dados de saúde (CID) não entram neste dossiê.</p>
      </section>`;
    const css = '.ok { color: #10B981; font-weight: 600; } .atraso { color: #B91C1C; } th { text-align: left; }';
    const resumo = await this.pdf.render(documentoHtml({ titulo: 'Dossiê do trabalhador', logoEmpresa, consultoria, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj], ['Trabalhador', c.nome], ['Emitido em', data(geradoEm)]], aviso: 'Feito com o Safety Nexo. Confira os documentos originais assinados antes de juntar a um processo.' }, corpo, css));

    // Anexos: ficha de EPI, OS e PPP já prontos no sistema.
    const anexos = await Promise.all([
      this.colaboradores.pdfFichaEpi(consultoriaId, empresaId, colaboradorId).catch(() => null),
      this.laudos.ordemServico(consultoriaId, empresaId, colaboradorId).catch(() => null),
      this.colaboradores.pdfPpp(consultoriaId, empresaId, colaboradorId).catch(() => null),
    ]);
    return juntarPdfs([resumo, ...anexos.filter((x): x is Buffer => !!x)]);
  }
}

export async function juntarPdfs(partes: Buffer[]): Promise<Buffer> {
  const final = await PDFDocument.create();
  for (const p of partes) {
    const doc = await PDFDocument.load(p);
    const paginas = await final.copyPages(doc, doc.getPageIndices());
    paginas.forEach((pg) => final.addPage(pg));
  }
  return Buffer.from(await final.save());
}
