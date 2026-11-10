import { documentoHtml, escape, Moldura } from './layout';
import { Medico } from './pcmso.template';

// Relatório analítico do PCMSO (NR-07, 7.6.2): o que foi feito no ano, o que deu alterado,
// as doenças e acidentes informados em CAT e a comparação com o ano anterior.

export type AsoAno = { colaboradorId: string; data: Date; tipo: string; resultado: string; exames: string[]; setor: string };
export type ComplementarAno = { colaboradorId: string; data: Date; tipo: string; titulo: string; alterado: boolean; setor: string };
export type CatAno = { tipoCat: string; tipoAcidente: string; setor: string };
export type DadosAno = { asos: AsoAno[]; complementares: ComplementarAno[]; cats: CatAno[]; trabalhadores: number };

const TIPO_ASO: Record<string, string> = {
  ADMISSIONAL: 'Admissional', PERIODICO: 'Periódico', RETORNO_TRABALHO: 'Retorno ao trabalho', MUDANCA_RISCO: 'Mudança de risco', DEMISSIONAL: 'Demissional',
};
const TIPO_REGISTRO: Record<string, string> = { AUDIOMETRIA: 'Audiometria', ESPIROMETRIA: 'Espirometria', OUTRO: 'Outros exames' };
const TIPO_ACIDENTE: Record<string, string> = { TIPICO: 'Acidente típico', TRAJETO: 'Acidente de trajeto', DOENCA: 'Doença do trabalho' };
const clinico = (nome: string) => /cl[ií]nico/i.test(nome);
// "Audiometria tonal" e "Audiometria" são o mesmo exame: compara pela primeira palavra, sem acento.
const raiz = (nome: string) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/)[0];
const DIA = 86_400_000;
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function contar<T>(lista: T[], chave: (x: T) => string) {
  const m = new Map<string, number>();
  for (const x of lista) m.set(chave(x), (m.get(chave(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function resumoAno(d: DadosAno) {
  // Exames complementares: os que o ASO lista (menos o clínico) mais os registrados no prontuário.
  // O mesmo exame pode estar no ASO e no prontuário: conta uma vez só (mesma pessoa, até 60 dias de diferença).
  const noProntuario = (a: AsoAno, exame: string) =>
    d.complementares.some((c) => c.colaboradorId === a.colaboradorId && raiz(c.titulo) === raiz(exame) && Math.abs(c.data.getTime() - a.data.getTime()) <= 60 * DIA);
  const doAso = d.asos.flatMap((a) => a.exames.filter((e) => !clinico(e) && !noProntuario(a, e)));
  const doProntuario = d.complementares.map((c) => TIPO_REGISTRO[c.tipo] ?? c.titulo);
  const doencas = d.cats.filter((c) => c.tipoAcidente === 'DOENCA' && c.tipoCat !== 'REABERTURA');
  return {
    clinicos: d.asos.length,
    porTipoAso: contar(d.asos, (a) => TIPO_ASO[a.tipo] ?? a.tipo),
    inaptos: d.asos.filter((a) => a.resultado !== 'APTO').length,
    inaptosPorSetor: contar(d.asos.filter((a) => a.resultado !== 'APTO'), (a) => a.setor),
    complementares: doAso.length + doProntuario.length,
    complementaresPorTipo: contar([...doAso, ...doProntuario], (x) => x),
    alterados: d.complementares.filter((c) => c.alterado),
    cats: contar(d.cats.filter((c) => c.tipoCat !== 'REABERTURA'), (c) => TIPO_ACIDENTE[c.tipoAcidente] ?? c.tipoAcidente),
    totalCats: d.cats.filter((c) => c.tipoCat !== 'REABERTURA').length,
    doencas: doencas.length,
    doencasPorSetor: contar(doencas, (c) => c.setor),
    trabalhadores: d.trabalhadores,
    incidencia: d.trabalhadores ? Math.round((doencas.length / d.trabalhadores) * 10000) / 10 : 0, // casos novos por 1.000 trabalhadores
  };
}
type Resumo = ReturnType<typeof resumoAno>;

const tabela = (cab: string[], linhas: (string | number)[][], vazio: string) =>
  linhas.length
    ? `<table><thead><tr>${cab.map((c, i) => `<th${i ? ' class="c"' : ''}>${c}</th>`).join('')}</tr></thead>
       <tbody>${linhas.map((l) => `<tr>${l.map((v, i) => `<td${i ? ' class="c"' : ''}>${typeof v === 'number' ? v : escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : `<p class="meta">${vazio}</p>`;

function variacao(atual: number, anterior: number) {
  if (atual === anterior) return 'igual';
  if (!anterior) return 'novo';
  const p = Math.round(((atual - anterior) / anterior) * 100);
  return `${p > 0 ? '+' : ''}${p}%`;
}

export function relatorioPcmsoHtml(moldura: Moldura, medico: Medico, ano: number, atual: Resumo, anterior: Resumo) {
  const alteradosPorTipo = contar(atual.alterados, (c) => TIPO_REGISTRO[c.tipo] ?? c.titulo);
  const alteradosPorSetor = contar(atual.alterados, (c) => c.setor);
  const comparar: [string, number, number][] = [
    ['Exames clínicos (ASO)', atual.clinicos, anterior.clinicos],
    ['Exames complementares', atual.complementares, anterior.complementares],
    ['Resultados alterados', atual.alterados.length, anterior.alterados.length],
    ['Considerados inaptos', atual.inaptos, anterior.inaptos],
    ['CAT emitidas', atual.totalCats, anterior.totalCats],
    ['Doenças relacionadas ao trabalho', atual.doencas, anterior.doencas],
  ];

  const corpo = `
    <section>
      <p>Este relatório resume o que o PCMSO fez de 1º de janeiro a 31 de dezembro de ${ano}. Os números vêm dos ASOs, do prontuário
      de saúde e das CATs registrados no sistema. A análise do médico responsável fica no fim, junto com a assinatura.</p>
      <p class="meta">${plural(atual.trabalhadores, 'trabalhador passou', 'trabalhadores passaram')} pela empresa no ano.</p>
    </section>

    <section>
      <h2>1. Exames clínicos</h2>
      <p>Foram feitos <strong>${atual.clinicos}</strong> exames clínicos.</p>
      ${tabela(['Tipo de exame', 'Quantidade'], atual.porTipoAso, 'Nenhum ASO registrado no ano.')}
    </section>

    <section>
      <h2>2. Exames complementares</h2>
      <p>Foram feitos <strong>${atual.complementares}</strong> exames complementares.</p>
      ${tabela(['Exame', 'Quantidade'], atual.complementaresPorTipo, 'Nenhum exame complementar registrado no ano.')}
    </section>

    <section>
      <h2>3. Resultados alterados</h2>
      ${atual.alterados.length
        ? `<p>${atual.alterados.length === 1 ? '<strong>1</strong> resultado foi marcado' : `<strong>${atual.alterados.length}</strong> resultados foram marcados`} como alterado no prontuário.</p>
           <div class="duas">${tabela(['Por exame', 'Alterados'], alteradosPorTipo, '')}${tabela(['Por setor (GHE)', 'Alterados'], alteradosPorSetor, '')}</div>`
        : '<p>Nenhum resultado foi marcado como alterado no prontuário.</p>'}
      ${atual.inaptos
        ? `<p>${atual.inaptos === 1 ? '1 trabalhador foi considerado inapto' : `${atual.inaptos} trabalhadores foram considerados inaptos`} em algum exame.</p>${tabela(['Setor (GHE)', 'Inaptos'], atual.inaptosPorSetor, '')}`
        : '<p>Ninguém foi considerado inapto no ano.</p>'}
    </section>

    <section>
      <h2>4. Doenças e acidentes informados em CAT</h2>
      ${tabela(['Tipo', 'CATs'], atual.cats, 'Nenhuma CAT emitida no ano.')}
      ${atual.doencas
        ? `<p>${atual.doencas === 1 ? 'Houve 1 caso novo' : `Houve ${atual.doencas} casos novos`} de doença relacionada ao trabalho, o que dá ${atual.incidencia.toLocaleString('pt-BR')} por mil trabalhadores.</p>
           ${tabela(['Setor (GHE)', 'Casos'], atual.doencasPorSetor, '')}`
        : '<p>Nenhuma doença relacionada ao trabalho foi informada em CAT.</p>'}
    </section>

    <section>
      <h2>5. Comparação com ${ano - 1}</h2>
      <table><thead><tr><th>Indicador</th><th class="c">${ano - 1}</th><th class="c">${ano}</th><th class="c">Variação</th></tr></thead>
      <tbody>${comparar.map(([n, a, b]) => `<tr><td>${n}</td><td class="c">${b}</td><td class="c">${a}</td><td class="c">${variacao(a, b)}</td></tr>`).join('')}</tbody></table>
    </section>

    <section>
      <h2>6. Análise do médico responsável</h2>
      <p class="meta">O que mudou de um ano para o outro, o que os resultados alterados indicam e o que muda no PCMSO a partir daqui.</p>
      <div class="linhas">${'<div></div>'.repeat(8)}</div>
    </section>

    <div class="assinaturas">
      <div class="assinatura">${escape(medico.nome ?? '')}<span>Médico responsável pelo PCMSO${medico.crm ? ` · CRM ${escape(medico.crm)}` : ''}</span></div>
    </div>`;

  return documentoHtml(
    moldura,
    corpo,
    `.c { text-align: center; } .duas { display: flex; gap: 16px; } .duas table { flex: 1; }
     .linhas div { border-bottom: 1px solid #d1d5db; height: 24px; }`,
  );
}
