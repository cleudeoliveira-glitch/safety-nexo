import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { CSS_SECOES, blocoAssinaturas, lista, p, secoesNumeradas, tabelaDuasColunas, tabelaReferencias } from '../documentos/secoes';

const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const dataHora = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const texto = (t: string) => escape(t).replace(/\n/g, '<br>');
const assinatura = (nome: string, papel: string) => `<div class="assinatura">${escape(nome)}<span>${escape(papel)}</span></div>`;

export type AetPdf = {
  posto: string; data: Date; responsavel: string; demanda: string; funcionamento: string; metodos: string; diagnostico: string;
  recomendacoes: { recomendacao: string; prazo?: string; responsavel?: string }[]; restituicao: string;
};

// Etapas na ordem do item 17.3.3 da NR-17, com introdução, objetivo e referências antes.
export function aetHtml(moldura: Moldura, a: AetPdf, empresa?: { razaoSocial: string; local: string | null }) {
  const nome = escape(empresa?.razaoSocial ?? 'empresa');
  const secoes = secoesNumeradas([
    {
      titulo: 'Identificação da análise',
      html: tabelaDuasColunas(['Dado', 'Informação'], [
        ['Empresa', nome],
        ['Posto ou atividade analisada', escape(a.posto)],
        ['Data da análise', data(a.data)],
        ['Responsável pela AET', escape(a.responsavel)],
      ]),
    },
    {
      titulo: 'Introdução',
      html: p(
        `A Análise Ergonômica do Trabalho (AET) olha o trabalho como ele acontece de verdade, e não só como está descrito no papel. Ela é
        feita quando a avaliação preliminar não basta para entender um problema, quando há queixas ou adoecimentos, ou quando a mudança
        necessária exige um estudo mais cuidadoso (NR-17, item 17.3.2).`,
        `Esta análise trata do posto ou atividade <strong>${escape(a.posto)}</strong>, na ${nome}, e segue as etapas que a NR-17 pede.`,
      ),
    },
    {
      titulo: 'Objetivo',
      html: lista([
        'entender a demanda que motivou a análise;',
        'descrever como o trabalho é organizado e como as pessoas fazem a atividade no dia a dia;',
        'identificar o que está causando desconforto, sobrecarga ou risco;',
        'propor mudanças práticas, combinadas com quem faz o trabalho.',
      ]),
    },
    {
      titulo: 'Referências',
      html: tabelaReferencias([
        ['NR-17', 'Ergonomia, item 17.3 (avaliação das situações de trabalho)'],
        ['NR-01', 'Gerenciamento de riscos ocupacionais: os resultados entram no PGR'],
        ['Manual de Aplicação da NR-17 (MTE)', 'Orientações para a análise ergonômica'],
      ]),
    },
    { titulo: 'Análise da demanda', html: `<p>${texto(a.demanda)}</p>` },
    { titulo: 'Funcionamento da organização, processos e atividade', html: `<p>${texto(a.funcionamento)}</p>` },
    { titulo: 'Métodos, técnicas e ferramentas usados', html: `<p>${texto(a.metodos)}</p>` },
    { titulo: 'Diagnóstico', html: `<p>${texto(a.diagnostico)}</p>` },
    {
      titulo: 'Recomendações',
      html: `<table>
        <thead><tr><th style="width:30px">Nº</th><th>Recomendação</th><th>Prazo</th><th>Responsável</th></tr></thead>
        <tbody>${a.recomendacoes.map((r, i) => `<tr><td>${i + 1}</td><td>${texto(r.recomendacao)}</td><td>${escape(r.prazo || '—')}</td><td>${escape(r.responsavel || '—')}</td></tr>`).join('')}</tbody>
      </table>
      ${p('As recomendações entram no plano de ação do PGR e devem ser acompanhadas até a conclusão.')}`,
    },
    { titulo: 'Restituição dos resultados, validação e revisão com os trabalhadores', html: `<p>${texto(a.restituicao)}</p>` },
    {
      titulo: 'Considerações finais',
      html: p('A ergonomia melhora quando quem faz o trabalho participa das soluções. Depois de implantadas as recomendações, vale voltar ao posto, ouvir os trabalhadores e conferir se o resultado esperado aconteceu.'),
    },
  ]);
  return documentoHtml(
    moldura,
    `${secoes}${blocoAssinaturas(empresa?.local ?? null, a.data, [{ nome: a.responsavel, papel: 'Responsável pela AET' }, { nome: null, papel: 'Representante da organização' }])}`,
    CSS_SECOES,
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
