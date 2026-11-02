import { documentoHtml, escape, Moldura } from '../documentos/layout';

const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const dataHora = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const texto = (t: string) => escape(t).replace(/\n/g, '<br>');
const assinatura = (nome: string, papel: string) => `<div class="assinatura">${escape(nome)}<span>${escape(papel)}</span></div>`;

export type AetPdf = {
  posto: string; data: Date; responsavel: string; demanda: string; funcionamento: string; metodos: string; diagnostico: string;
  recomendacoes: { recomendacao: string; prazo?: string; responsavel?: string }[]; restituicao: string;
};

// Etapas na ordem do item 17.3.3 da NR-17.
export function aetHtml(moldura: Moldura, a: AetPdf) {
  return documentoHtml(
    moldura,
    `
    <p><strong>Posto / atividade:</strong> ${escape(a.posto)} · ${data(a.data)}</p>
    <h2>1. Análise da demanda</h2><p>${texto(a.demanda)}</p>
    <h2>2. Funcionamento da organização, processos, situações de trabalho e atividade</h2><p>${texto(a.funcionamento)}</p>
    <h2>3. Métodos, técnicas e ferramentas de avaliação</h2><p>${texto(a.metodos)}</p>
    <h2>4. Diagnóstico</h2><p>${texto(a.diagnostico)}</p>
    <h2>5. Recomendações</h2>
    <table>
      <thead><tr><th style="width:30px">Nº</th><th>Recomendação</th><th>Prazo</th><th>Responsável</th></tr></thead>
      <tbody>${a.recomendacoes.map((r, i) => `<tr><td>${i + 1}</td><td>${texto(r.recomendacao)}</td><td>${escape(r.prazo || '—')}</td><td>${escape(r.responsavel || '—')}</td></tr>`).join('')}</tbody>
    </table>
    <h2>6. Restituição dos resultados, validação e revisão com os trabalhadores</h2><p>${texto(a.restituicao)}</p>
    <div class="assinaturas">${assinatura(a.responsavel, 'Responsável pela AET')}</div>`,
  );
}

export type CatPdf = {
  tipoCat: string; tipoAcidente: string; dataHora: Date; horasTrabalhadas: string | null; local: string; parteAtingida: string;
  agenteCausador: string; naturezaLesao: string; descricao: string; houveAfastamento: boolean; houveObito: boolean; registroPolicial: boolean;
  testemunhas: string | null; atendimentoData: Date | null; medicoNome: string | null; medicoCrm: string | null; cid: string | null;
  diasTratamento: number | null; enviadaEm: Date | null; recibo: string | null; prazo: Date;
  trabalhador: { nome: string; cpf: string | null; cargo: string; cbo: string | null; dataAdmissao: Date | null };
};
const NOME_CAT: Record<string, string> = { INICIAL: 'Inicial', REABERTURA: 'Reabertura', OBITO: 'Comunicação de óbito' };
const NOME_ACIDENTE: Record<string, string> = { TIPICO: 'Típico', TRAJETO: 'Trajeto', DOENCA: 'Doença relacionada ao trabalho' };
const linha = (rotulo: string, valor: string | null) => `<tr><th style="width:32%">${rotulo}</th><td>${texto(valor ?? '—')}</td></tr>`;
const simNao = (v: boolean) => (v ? 'Sim' : 'Não');

export function catHtml(moldura: Moldura, c: CatPdf) {
  const t = c.trabalhador;
  return documentoHtml(
    moldura,
    `
    <p class="nota">${
      c.enviadaEm
        ? `Transmitida ao eSocial (S-2210) em ${dataHora(c.enviadaEm)}${c.recibo ? `, recibo ${escape(c.recibo)}` : ''}.`
        : `Prazo para comunicar: ${c.houveObito ? 'imediatamente (óbito)' : `até ${data(c.prazo)}`} (Lei 8.213/91, art. 22). Transmita pelo eSocial (S-2210).`
    }</p>
    <h2>Acidentado</h2>
    <table>${linha('Nome', t.nome)}${linha('CPF', t.cpf)}${linha('Cargo', t.cargo)}${linha('CBO', t.cbo)}${linha('Admissão', data(t.dataAdmissao))}</table>
    <h2>Acidente</h2>
    <table>
      ${linha('Tipo de CAT', NOME_CAT[c.tipoCat] ?? c.tipoCat)}${linha('Tipo de acidente', NOME_ACIDENTE[c.tipoAcidente] ?? c.tipoAcidente)}
      ${linha('Data e hora', dataHora(c.dataHora))}${linha('Horas trabalhadas antes', c.horasTrabalhadas)}${linha('Local', c.local)}
      ${linha('Parte do corpo atingida', c.parteAtingida)}${linha('Agente causador', c.agenteCausador)}${linha('Natureza da lesão', c.naturezaLesao)}
      ${linha('Houve afastamento', simNao(c.houveAfastamento))}${linha('Houve óbito', simNao(c.houveObito))}${linha('Registro policial', simNao(c.registroPolicial))}
      ${linha('Testemunhas', c.testemunhas)}
    </table>
    <h2>Descrição</h2><p>${texto(c.descricao)}</p>
    <h2>Atendimento médico</h2>
    <table>${linha('Data do atendimento', data(c.atendimentoData))}${linha('Médico', c.medicoNome ? `${c.medicoNome}${c.medicoCrm ? ` · CRM ${c.medicoCrm}` : ''}` : null)}
      ${linha('CID', c.cid)}${linha('Duração provável do tratamento', c.diasTratamento !== null ? `${c.diasTratamento} dia(s)` : null)}</table>
    <div class="assinaturas">${assinatura('', 'Emitente')}${assinatura('', 'Médico do atendimento')}</div>`,
    '.nota { background: #FFF7ED; border-radius: 8px; padding: 8px 10px; }',
  );
}
