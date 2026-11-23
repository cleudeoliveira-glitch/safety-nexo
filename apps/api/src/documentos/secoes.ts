import * as tokens from '@safety-nexo/design-tokens';
import { escape } from './layout';

// Peças comuns aos programas e laudos: sumário, controle do documento, definições,
// responsabilidades, referências, revisão e assinaturas. Cada documento escolhe as
// seções que usa e o texto próprio; aqui fica só a forma, para todos saírem iguais.

export type Secao = { titulo: string; html: string };

// Numera as seções na ordem e monta o sumário no começo. Seções vazias (null/false) são puladas,
// assim a numeração nunca fica com buraco.
// O "Controle do documento" (código, revisões) vai junto do sumário, sem número: assim o texto do documento
// começa logo depois, pela introdução, em vez de abrir com tabelas. A tabela de identificação, quando vem antes
// da introdução, desce para logo depois do objetivo e do campo de aplicação.
// Documentos curtos (plano de emergência, plano de resgate) usam sumario: false ou quebra: false,
// para não gastar uma página só com o índice.
const PREAMBULO = /^controle do documento$/i;
const INTRODUCAO = /^introdu/i;
const IDENTIFICACAO = /^identifica/i;
const ANTES_DA_IDENTIFICACAO = /^(objetivo|objetivos|campo de aplica)/i;

function ordenar(secoes: Secao[]): Secao[] {
  const iIdent = secoes.findIndex((s) => IDENTIFICACAO.test(s.titulo));
  const iIntro = secoes.findIndex((s) => INTRODUCAO.test(s.titulo));
  if (iIdent < 0 || iIntro < 0 || iIdent > iIntro) return secoes;
  const [ident] = secoes.splice(iIdent, 1);
  let depois = secoes.findIndex((s) => INTRODUCAO.test(s.titulo));
  secoes.forEach((s, i) => { if (ANTES_DA_IDENTIFICACAO.test(s.titulo) && i > depois) depois = i; });
  secoes.splice(depois + 1, 0, ident);
  return secoes;
}

export function secoesNumeradas(secoes: (Secao | null | false | undefined)[], opcoes: { sumario?: boolean; quebra?: boolean } = {}): string {
  const todas = secoes.filter((s): s is Secao => !!s);
  const preambulo = opcoes.sumario === false ? [] : todas.filter((s) => PREAMBULO.test(s.titulo));
  const validas = ordenar(todas.filter((s) => !preambulo.includes(s)));
  const sumario = opcoes.sumario === false ? '' : `
    <section class="sumario${opcoes.quebra === false ? ' sem-quebra' : ''}">
      <h2 class="sem-numero">Sumário</h2>
      <ol class="indice${validas.length > 10 ? ' duas-colunas' : ''}">${validas.map((s, i) => `<li><span class="n">${i + 1}</span><span class="t">${escape(s.titulo)}</span></li>`).join('')}</ol>
      ${preambulo.map((s) => `<div class="preambulo"><h2 class="sem-numero">${escape(s.titulo)}</h2>${s.html}</div>`).join('')}
    </section>`;
  const corpo = validas.map((s, i) => `<section class="secao"><h2><span class="num">${i + 1}</span>${escape(s.titulo)}</h2>${s.html}</section>`).join('');
  return sumario + corpo;
}

// Parágrafos simples a partir de textos corridos.
export const p = (...textos: (string | false | null | undefined)[]) => textos.filter(Boolean).map((t) => `<p>${t}</p>`).join('');
export const lista = (itens: (string | false | null | undefined)[]) => `<ul>${itens.filter(Boolean).map((i) => `<li>${i}</li>`).join('')}</ul>`;
export const dataBr = (d: Date | null | undefined) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

export type Revisao = { versao: number; geradoEm: Date };

export type Controle = {
  sigla: string;
  titulo: string;
  versao: number;
  emitidoEm: Date;
  proximaRevisao: Date | null;
  responsavel: string | null;
  historico: Revisao[]; // emissões anteriores do mesmo documento
};

// Código fácil de citar: sigla, ano e versão (ex.: PGR-2026-03).
export const codigoDocumento = (sigla: string, emitidoEm: Date, versao: number) => `${sigla}-${emitidoEm.getFullYear()}-${String(versao).padStart(2, '0')}`;

export function controleDocumento(c: Controle): string {
  const revisoes = [...c.historico.filter((h) => h.versao < c.versao), { versao: c.versao, geradoEm: c.emitidoEm }].sort((a, b) => a.versao - b.versao);
  return `
    <table class="ficha">
      <tr><th>Documento</th><td>${escape(c.titulo)}</td></tr>
      <tr><th>Código</th><td>${escape(codigoDocumento(c.sigla, c.emitidoEm, c.versao))}</td></tr>
      <tr><th>Revisão</th><td>${String(c.versao - 1).padStart(2, '0')}${c.versao === 1 ? ' (primeira emissão)' : ''}</td></tr>
      <tr><th>Data de emissão</th><td>${dataBr(c.emitidoEm)}</td></tr>
      ${c.proximaRevisao ? `<tr><th>Próxima revisão</th><td>${dataBr(c.proximaRevisao)}, ou antes, se algo mudar</td></tr>` : ''}
      <tr><th>Elaborado por</th><td>${c.responsavel ? escape(c.responsavel) : '<span class="falta">responsável não informado</span>'}</td></tr>
    </table>
    <h3>Histórico de revisões</h3>
    <table>
      <thead><tr><th>Revisão</th><th>Data</th><th>O que mudou</th></tr></thead>
      <tbody>${revisoes
        .map((r) => `<tr><td>${String(r.versao - 1).padStart(2, '0')}</td><td>${dataBr(r.geradoEm)}</td><td>${r.versao === 1 ? 'Emissão inicial.' : 'Revisão e atualização dos dados.'}</td></tr>`)
        .join('')}</tbody>
    </table>`;
}

export function tabelaDuasColunas(cabecalho: [string, string], linhas: [string, string][]): string {
  return `<table class="duas"><thead><tr><th>${escape(cabecalho[0])}</th><th>${escape(cabecalho[1])}</th></tr></thead>
    <tbody>${linhas.map(([a, b]) => `<tr><td><strong>${escape(a)}</strong></td><td>${b}</td></tr>`).join('')}</tbody></table>`;
}

export type Referencia = [norma: string, assunto: string];

export function tabelaReferencias(refs: Referencia[]): string {
  const unicas = refs.filter((r, i) => refs.findIndex((x) => x[0] === r[0]) === i);
  return `<table class="duas"><thead><tr><th>Referência</th><th>Assunto</th></tr></thead>
    <tbody>${unicas.map(([n, a]) => `<tr><td><strong>${escape(n)}</strong></td><td>${escape(a)}</td></tr>`).join('')}</tbody></table>`;
}

// Normas que aparecem conforme os riscos e o ramo da empresa. Assim o documento cita o que
// de fato se aplica, em vez de uma lista enorme copiada de outro lugar.
type RiscoRef = { tipo: string; agente: string; fonteGeradora?: string | null };
export function referenciasPelosRiscos(riscos: RiscoRef[], cnae: string | null): Referencia[] {
  const texto = riscos.map((r) => `${r.agente} ${r.fonteGeradora ?? ''}`).join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tem = (re: RegExp) => re.test(texto);
  const tipos = new Set(riscos.map((r) => r.tipo));
  const divisao = Number((cnae ?? '').replace(/\D/g, '').slice(0, 2));
  const refs: Referencia[] = [];
  if (tipos.has('FISICO') || tipos.has('QUIMICO') || tipos.has('BIOLOGICO')) refs.push(['NR-09', 'Avaliação e controle das exposições a agentes físicos, químicos e biológicos']);
  if (tipos.has('FISICO') || tipos.has('QUIMICO')) refs.push(['NR-15', 'Atividades e operações insalubres (limites de tolerância)']);
  if (tem(/inflamav|combustiv|explosiv|eletricidade|energia eletrica|motocicl|vigilan|radiacao ionizante/)) refs.push(['NR-16', 'Atividades e operações perigosas']);
  if (tipos.has('ERGONOMICO') || tem(/psicossocia/)) refs.push(['NR-17', 'Ergonomia']);
  if (tem(/eletric|choque/)) refs.push(['NR-10', 'Segurança em instalações e serviços em eletricidade']);
  if (tem(/empilhadeir|transpaleteir|ponte rolante|armazenag|movimentacao de carga/)) refs.push(['NR-11', 'Transporte, movimentação, armazenagem e manuseio de materiais']);
  if (tem(/maquin|prensa|serra|cilindr|esmeril|torno|equipamento/)) refs.push(['NR-12', 'Segurança no trabalho em máquinas e equipamentos']);
  if (tem(/caldeira|vaso de pressao|compressor|autoclave/)) refs.push(['NR-13', 'Caldeiras, vasos de pressão e tubulações']);
  if (divisao >= 41 && divisao <= 43) refs.push(['NR-18', 'Segurança e saúde no trabalho na indústria da construção']);
  if (tem(/inflamav|combustiv|glp|gasolina|diesel|solvente/)) refs.push(['NR-20', 'Segurança e saúde no trabalho com inflamáveis e combustíveis']);
  if (tem(/incendio/)) refs.push(['NR-23', 'Proteção contra incêndios']);
  if (tem(/quimic|produto de limpeza|saneante/) || tipos.has('QUIMICO')) refs.push(['NR-26', 'Sinalização de segurança e rotulagem de produtos químicos (GHS)']);
  if (divisao >= 1 && divisao <= 3) refs.push(['NR-31', 'Segurança e saúde no trabalho na agricultura, pecuária, silvicultura e aquicultura']);
  if (divisao === 86 || divisao === 75 || (tipos.has('BIOLOGICO') && tem(/paciente|sangue|perfurocortante|odontolog|hospital|clinic/))) refs.push(['NR-32', 'Segurança e saúde no trabalho em serviços de saúde']);
  if (tem(/confinad|tanque|silo|cisterna|galeria/)) refs.push(['NR-33', 'Segurança e saúde nos trabalhos em espaços confinados']);
  if (tem(/altura|escada|andaime|telhado|plataforma elevat/)) refs.push(['NR-35', 'Trabalho em altura']);
  if (divisao === 10 && tem(/frio|camara fria|resfriad|congelad|abate/)) refs.push(['NR-36', 'Segurança e saúde no trabalho em empresas de abate e processamento de carnes']);
  return refs;
}

export type Assinante = { nome: string | null; papel: string; registro?: string | null };

export function blocoAssinaturas(local: string | null, emitidoEm: Date, assinantes: Assinante[]): string {
  return `
    <div class="bloco-assinaturas">
      <p class="local-data">${local ? `${escape(local)}, ` : ''}${emitidoEm.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })}.</p>
      <div class="assinaturas">
        ${assinantes
          .map((a) => `<div class="assinatura">${a.nome ? escape(a.nome) : '&nbsp;'}<span>${escape(a.papel)}${a.registro ? ` · ${escape(a.registro)}` : ''}</span><span class="data">Data: ____/____/________</span></div>`)
          .join('')}
      </div>
    </div>`;
}

// Cidade da empresa a partir do endereço (último trecho "Cidade - UF" ou "Cidade/UF").
export function cidadeDoEndereco(endereco: string | null): string | null {
  if (!endereco) return null;
  const partes = endereco.split(',').map((x) => x.trim()).filter(Boolean);
  const ultimo = partes.reverse().find((x) => /[A-Za-zÀ-ú]{3,}\s*[-/]\s*[A-Z]{2}\b/.test(x));
  return ultimo ? ultimo.replace(/\s*CEP.*$/i, '').trim() : null;
}

export const CSS_SECOES = `
  .sumario { page-break-after: always; }
  .sumario.sem-quebra { page-break-after: auto; }
  .indice { list-style: none; padding: 0; margin: 4px 0 18px; columns: 1; }
  .indice li { display: flex; align-items: baseline; gap: 10px; padding: 5px 0; border-bottom: 1px dotted ${tokens.colors.border}; margin: 0; }
  .indice .n { flex: 0 0 26px; height: 20px; line-height: 20px; text-align: center; border-radius: 5px; background: ${tokens.colors.primary}; color: #fff; font-weight: 700; font-size: 10.5px; }
  .indice .t { font-weight: 500; }
  .indice.duas-colunas { columns: 2; column-gap: 28px; }
  .indice.duas-colunas li { break-inside: avoid; }
  .preambulo h2 { margin-top: 18px; }
  .secao { margin-bottom: 6px; }
  .secao:first-of-type h2 { margin-top: 0; }
  .secao p, .secao li { text-align: justify; }
  h2 .num { display: inline-block; min-width: 24px; height: 24px; line-height: 24px; padding: 0 6px; margin-right: 10px; border-radius: 6px; background: ${tokens.colors.primary}; color: #fff; text-align: center; font-size: 12.5px; vertical-align: 1px; }
  .ficha th { width: 32%; }
  .duas td:first-child { width: 30%; }
  .bloco-assinaturas { page-break-inside: avoid; }
  .destaque-conclusao { background: #EEF6F7; border-radius: 8px; padding: 10px 14px; margin: 8px 0 12px; }
  .destaque-conclusao p:last-child { margin-bottom: 0; }
  .numeros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 14px; page-break-inside: avoid; }
  .numeros div { border: 1px solid ${tokens.colors.border}; border-radius: 8px; padding: 8px 10px; text-align: center; }
  .numeros strong { display: block; font-size: 20px; color: ${tokens.colors.primary}; line-height: 1.1; }
  .numeros span { font-size: 10px; color: #5B6B73; }
`;

// Dados de cabeça que quase todo programa ou laudo usa, montados de uma vez a partir da empresa.
export type ExtrasDoc = {
  controle: Controle;
  empresa: { razaoSocial: string; cnae: string | null; endereco: string | null; numFuncionarios: number };
  formacao: string | null;
  representanteLegal: string | null;
  local: string | null;
};
type EmpresaDoc = {
  razaoSocial: string; cnae: string | null; endereco: string | null; numFuncionarios: number; representanteLegalNome: string | null;
  responsavelTecnicoNome: string | null; responsavelTecnicoFormacao: string | null; consultoria: { cidade: string | null };
};
export function extrasDe(sigla: string, titulo: string, e: EmpresaDoc, versao: number, historico: Revisao[], emitidoEm: Date, mesesRevisao: number | null, responsavel?: string | null): ExtrasDoc {
  let proximaRevisao: Date | null = null;
  if (mesesRevisao) {
    proximaRevisao = new Date(emitidoEm);
    proximaRevisao.setMonth(proximaRevisao.getMonth() + mesesRevisao);
  }
  return {
    controle: {
      sigla, titulo, versao, emitidoEm, proximaRevisao, historico,
      responsavel: responsavel !== undefined ? responsavel : [e.responsavelTecnicoNome, e.responsavelTecnicoFormacao].filter(Boolean).join(', ') || null,
    },
    empresa: { razaoSocial: e.razaoSocial, cnae: e.cnae, endereco: e.endereco, numFuncionarios: e.numFuncionarios },
    formacao: e.responsavelTecnicoFormacao,
    representanteLegal: e.representanteLegalNome,
    local: cidadeDoEndereco(e.endereco) ?? e.consultoria.cidade ?? null,
  };
}

// Tabela de identificação padrão (empresa, endereço, CNAE, trabalhadores e responsável).
export function identificacaoBasica(x: ExtrasDoc, total: number, responsavel: { nome: string | null; registro: string | null }, papel = 'Responsável técnico', extra: [string, string][] = []): string {
  const e = x.empresa;
  const falta = '<span class="falta">não informado</span>';
  return tabelaDuasColunas(['Dado', 'Informação'], [
    ['Empresa', escape(e.razaoSocial)],
    ['Endereço', e.endereco ? escape(e.endereco) : falta],
    ['CNAE', e.cnae ? escape(e.cnae) : falta],
    ['Trabalhadores', String(total)],
    [papel, responsavel.nome ? `${escape(responsavel.nome)}${x.formacao ? `, ${escape(x.formacao)}` : ''}${responsavel.registro ? ` · ${escape(responsavel.registro)}` : ''}` : falta],
    ['Representante legal', x.representanteLegal ? escape(x.representanteLegal) : falta],
    ...extra,
  ]);
}

// Caixa curta no começo dos documentos de campo (APR, PT, inspeção, investigação): diz para que
// serve o documento e em que norma ele se apoia, sem transformar um formulário em apostila.
export const objetivoDoc = (texto: string, titulo = 'Para que serve') =>
  `<section class="caixa-texto"><h2>${escape(titulo)}</h2><p>${texto}</p></section>`;

// Cronograma anual de ações: 12 meses a partir da emissão, com P (previsto) e R (realizado).
// É o quadro que todo programa costuma trazer: treinamentos, palestras, inspeções, revisão do programa etc.
export type ItemCronograma = { acao: string; responsavel: string; meses: number[]; realizados?: number[] };
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const TODO_MES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const TRIMESTRAL = [0, 3, 6, 9];

// Mês do cronograma (0 a 11) em que cai uma data, ou null se fora dos 12 meses.
export function mesDoCronograma(inicio: Date, data: Date | null): number | null {
  if (!data) return null;
  const n = (data.getUTCFullYear() - inicio.getFullYear()) * 12 + (data.getUTCMonth() - inicio.getMonth());
  return n >= 0 && n < 12 ? n : null;
}

export function cronogramaHtml(inicio: Date, itens: ItemCronograma[]): string {
  const colunas = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    return { mes: MESES[d.getMonth()], ano: d.getFullYear() };
  });
  const anos = colunas.reduce<{ ano: number; n: number }[]>((acc, c) => {
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.ano === c.ano) ultimo.n += 1;
    else acc.push({ ano: c.ano, n: 1 });
    return acc;
  }, []);
  const linhas = itens
    .map((it, i) => {
      const celulas = colunas
        .map((_, m) => {
          const r = it.realizados?.includes(m);
          const p = it.meses.includes(m);
          return `<td class="cm ${r ? 'r' : p ? 'p' : ''}">${r ? 'R' : p ? 'P' : ''}</td>`;
        })
        .join('');
      return `<tr><td class="c">${String(i + 1).padStart(2, '0')}</td><td>${escape(it.acao)}</td><td>${escape(it.responsavel)}</td>${celulas}</tr>`;
    })
    .join('');
  return `<table class="cronograma">
    <thead>
      <tr><th rowspan="2" class="c">Nº</th><th rowspan="2">Ação</th><th rowspan="2">Responsável</th>${anos.map((a) => `<th colspan="${a.n}" class="c">${a.ano}</th>`).join('')}</tr>
      <tr>${colunas.map((c) => `<th class="cm">${c.mes}</th>`).join('')}</tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <p class="nota">Legenda: <strong>P</strong> = previsto · <strong>R</strong> = realizado. O cronograma é acompanhado mês a mês e atualizado no sistema conforme as ações são feitas.</p>`;
}

export const CSS_CRONOGRAMA = `
  .cronograma { font-size: 9px; } .cronograma td, .cronograma th { padding: 3px 4px; }
  .cronograma .cm { width: 22px; text-align: center; padding: 3px 0; }
  .cronograma td.p { background: #E0F2FE; font-weight: 700; color: #075985; }
  .cronograma td.r { background: #DCFCE7; font-weight: 700; color: #166534; }
`;
