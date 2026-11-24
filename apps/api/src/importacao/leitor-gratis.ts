import { textoDoPdf } from '../common/texto-pdf';
import { DocumentoLido } from './esquema';

// Leitura gratuita, sem IA: tira o texto do PDF aqui mesmo no servidor e procura os GHEs e os riscos
// pelos nomes de campo que os PGRs costumam usar ("GHE 01", "Agente", "Fonte geradora", "EPI"...).
// Não acerta tudo como a IA, por isso a consultora confere e completa na tela antes de importar.

type Tipo = DocumentoLido['ghes'][number]['riscos'][number]['tipo'];
type Sev = 'BAIXA' | 'MEDIA' | 'ALTA';
type Risco = DocumentoLido['ghes'][number]['riscos'][number];
type Linha = { t: string; pag: number };

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const limpar = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s:–—;-]+$/g, '').trim();
// Primeira coluna de uma linha de tabela (as colunas vêm separadas por 3 espaços ou mais).
const coluna1 = (s: string) => limpar(s.trim().split(/\s{3,}/)[0] ?? '');

const PALAVRAS_TIPO: [Tipo, RegExp][] = [
  ['BIOLOGICO', /biolog|virus|bacteri|fung|parasit|protozo|microrganism|micro-organism|sangue|saliva/],
  ['QUIMICO', /quimic|poeira|fumo|nevoa|neblina|gases|vapor|solvente|produto|sabao|detergente|tinta|oleo|graxa|silica|amianto|benzeno|cloro/],
  ['ERGONOMICO', /ergonom|postura|repetit|levantamento|transporte manual|peso|ritmo|monoton|psicossocial|estresse|jornada|mobiliario/],
  ['FISICO', /fisico|ruido|calor|vibrac|radiac|frio|umidade|pressao|iluminac|temperatura/],
  ['ACIDENTE', /acidente|mecanic|queda|escorreg|trope|maquina|eletric|choque|incendio|explos|corte|perfuro|animal|ferramenta|arranjo|atropel|batida|prensa/],
];
export function tipoPorTexto(...textos: (string | null | undefined)[]): Tipo | null {
  for (const t of textos) {
    if (!t) continue;
    const s = semAcento(t);
    for (const [tipo, re] of PALAVRAS_TIPO) if (re.test(s)) return tipo;
  }
  return null;
}

export function severidadePorTexto(t: string | null | undefined): Sev | null {
  if (!t) return null;
  const s = semAcento(t);
  if (/extrem|critic|grave|alt[oa]|severa|catastrof/.test(s)) return 'ALTA';
  if (/moderad|oderad|medi[oa]|seri[oa]/.test(s)) return 'MEDIA';
  if (/leve|baix[oa]|pouco|insignific|minim/.test(s)) return 'BAIXA';
  const n = s.match(/\b([1-5])\b/)?.[1];
  return n ? (n <= '2' ? 'BAIXA' : n === '3' ? 'MEDIA' : 'ALTA') : null;
}

// Rótulos que encerram o valor de outro campo.
const ROTULO = /^\s*(agente|grupo|categoria|frequencia|classificacao|fonte|epi|epc|efeito|orientacao|medidas|analise|fundamentacao|observac|conclusao|insalubridade|periculosidade|meio de propagacao|tempo de exposicao|detalhamento|causas|controles|prevencao|monitoramento|mitigacao|intensidade|limite|probabilidade|severidade|nivel|risco \d)/;

// Valor de um campo "Rótulo   valor" que pode continuar nas linhas de baixo (mesma coluna).
function valorDoCampo(linhas: Linha[], i: number, rotulo: RegExp, maxLinhas = 3): string | null {
  const m = linhas[i].t.match(rotulo);
  if (!m || m.index === undefined) return null;
  const inicio = m.index + m[0].length;
  let v = linhas[i].t.slice(inicio);
  // Se na mesma linha vier outro rótulo depois ("Fonte Geradora  xxx   Grupo  yyy"), corta.
  v = v.split(/\s{3,}(?:grupo|classifica[cç][aã]o|frequ[eê]ncia|periculosidade)\b/i)[0];
  const partes = [v];
  const resto = linhas[i].t.slice(inicio);
  const col = inicio + (resto.length - resto.trimStart().length);
  for (let k = i + 1; k < Math.min(linhas.length, i + 1 + maxLinhas); k++) {
    const l = linhas[k].t;
    if (!l.trim() || ROTULO.test(semAcento(l))) break;
    const recuo = l.length - l.trimStart().length;
    if (recuo < col - 4) break;
    partes.push(l.trim());
  }
  const r = limpar(partes.join(' '));
  return r && !/^(nao (aplicavel|informad)|n\/?a|-+|ausente)$/.test(semAcento(r)) ? r.slice(0, 300) : null;
}

// Procura um campo nas linhas do risco e devolve o primeiro valor encontrado.
function campo(linhas: Linha[], de: number, ate: number, rotulo: RegExp, maxLinhas = 3): string | null {
  for (let i = de; i < ate; i++) {
    if (rotulo.test(linhas[i].t)) {
      const v = valorDoCampo(linhas, i, rotulo, maxLinhas);
      if (v) return v;
    }
  }
  return null;
}

// Valor de uma tabela em que o título está numa linha e o valor logo abaixo, na mesma coluna.
function valorAbaixo(linhas: Linha[], de: number, ate: number, titulo: RegExp): string | null {
  for (let i = de; i < ate; i++) {
    const m = linhas[i].t.match(titulo);
    if (!m || m.index === undefined) continue;
    for (let k = i + 1; k < Math.min(ate, i + 4); k++) {
      const l = linhas[k].t;
      if (!l.trim()) continue;
      const trecho = l.slice(Math.max(0, m.index - 6), m.index + m[0].length + 12).trim().split(/\s{2,}/)[0];
      return trecho ? limpar(trecho) : null;
    }
  }
  return null;
}

const MEDICAO = /(\d+(?:[.,]\d+)?\s*(?:dB\s*\(?A\)?|dB|°C|ºC|IBUTG|ppm|mg\/m[³3]|m\/s[²2]|lux))/i;

function lerRisco(linhas: Linha[], de: number, ate: number, agente: string, categoria: string | null): Risco {
  const trecho = linhas.slice(de, ate).map((l) => l.t).join(' ');
  const fonte = campo(linhas, de, ate, /fonte\s+geradora\s*:?/i, 2)
    ?? (trecho.match(/decorre de ([^.]{4,200})\./i)?.[1] ?? null)
    ?? campo(linhas, de, ate, /^\s*detalhamento\s*:?/i, 1)?.replace(/^1\.\s*/, '') ?? null;
  const epi = campo(linhas, de, ate, /^\s*EPI'?s?\s*(?:recomendados?|utilizados?)?\s*:?/i, 2);
  const epc = campo(linhas, de, ate, /^\s*EPC'?s?\s*:?/i, 2);
  const medidas = campo(linhas, de, ate, /^\s*medidas?\s+(?:propostas?|de\s+controle|existentes?)\s*:?/i, 2)
    ?? campo(linhas, de, ate, /^\s*controles?\s+(?:existentes?|gerais?)?\s*:?/i, 2);
  const sevTexto = campo(linhas, de, ate, /(?:classifica[cç][aã]o\s+)?do\s+efeito\s*:?/i, 1)
    ?? trecho.match(/severidade\s+(?:foi\s+)?(?:\S+\s+){0,2}como\s+([A-Za-zÀ-ú]+)/i)?.[1]
    ?? campo(linhas, de, ate, /^\s*severidade\s*:?/i, 1)
    ?? valorAbaixo(linhas, de, ate, /severidade/i);
  const medicao = campo(linhas, de, ate, /(?:intensidade|concentra[cç][aã]o|resultado\s+da\s+avalia[cç][aã]o|n[ií]vel\s+medido)\s*:?/i, 1);
  const limite = campo(linhas, de, ate, /limite\s+de\s+toler[aâ]ncia\s*:?/i, 1);
  return {
    tipo: tipoPorTexto(categoria, agente, fonte) ?? 'ACIDENTE',
    agente: agente.slice(0, 200),
    fonteGeradora: fonte,
    medidasControle: [epc && `EPC: ${epc}`, epi && `EPI: ${epi}`, medidas].filter(Boolean).join('. ').slice(0, 600) || null,
    severidade: severidadePorTexto(sevTexto),
    intensidade: medicao?.match(MEDICAO)?.[1] ?? null,
    limiteTolerancia: limite?.match(MEDICAO)?.[1] ?? null,
    pagina: linhas[de]?.pag ?? null,
  };
}

// ---- Inventário em tabela: "Tipo | Agente | Fonte | Medidas | Severidade" ----
const TIPO_CELULA = /^(fisicos?|quimicos?|biologicos?|ergonomicos?|acidentes?|mecanicos?|de acidente|psicossocia(l|is))$/;
type Coluna = { ini: number; rotulo: string };

// Colunas pelo título da tabela, que pode ocupar até 4 linhas ("Perigo ou / fator de / risco").
function colunasDoTitulo(linhas: Linha[], i: number): Coluna[] | null {
  if (!/^\s*(tipo|grupo|categoria|classe)\b/i.test(linhas[i].t)) return null;
  const titulo: string[] = [];
  for (let k = Math.max(0, i - 3); k <= Math.min(linhas.length - 1, i + 1); k++) {
    const l = linhas[k].t;
    if (k > i && (!l.trim() || TIPO_CELULA.test(semAcento(coluna1(l))))) break;
    if (l.trim() && l.trim().split(/\s{2,}/).length >= 2) titulo.push(l);
  }
  const junto = semAcento(titulo.join(' '));
  if (!/agente|perigo|fator/.test(junto) || !/fonte|circunst|medida|sever/.test(junto)) return null;
  const inis = new Set<number>();
  for (const l of titulo) for (const m of l.matchAll(/(?:^\s*|\s{2,})(\S)/g)) inis.add((m.index ?? 0) + m[0].length - 1);
  const ordem = [...inis].sort((a, b) => a - b).filter((v, n, arr) => n === 0 || v - arr[n - 1] > 3);
  return ordem.map((ini, n) => {
    const fim = ordem[n + 1] ?? 9999;
    const rotulo = titulo.map((l) => l.slice(ini, fim)).join(' ');
    return { ini, rotulo: semAcento(limpar(rotulo)) };
  });
}

function riscosDaTabela(linhas: Linha[], i: number, cols: Coluna[]): { riscos: Risco[]; fim: number } {
  const acha = (re: RegExp) => cols.findIndex((c) => re.test(c.rotulo));
  const cAg = acha(/agente|perigo|fator/); const cFo = acha(/fonte|circunst/); const cMe = acha(/medida|controle|preven|epi/);
  const cSe = acha(/sever|sev\b|sev\./); const cAv = acha(/avalia|intensidade|medic|resultado/); const cLi = acha(/limite/);
  // Cada palavra vai para a coluna onde fica o meio dela: texto centralizado ou um pouco torto não se perde.
  const celulas = (l: string): string[] => {
    const r = cols.map(() => [] as string[]);
    for (const m of l.matchAll(/\S+/g)) {
      const meio = (m.index ?? 0) + m[0].length / 2;
      let n = 0; while (n + 1 < cols.length && cols[n + 1].ini - 1 <= meio) n++;
      r[n].push(m[0]);
    }
    return r.map((p) => p.join(' '));
  };
  const riscos: Risco[] = [];
  let atual: { tipo: string; cel: string[][]; pag: number } | null = null;
  const fechar = () => {
    if (!atual) return;
    const t = (n: number) => (n < 0 ? '' : limpar(atual!.cel[n].join(' ')));
    const agente = t(cAg);
    if (agente.length >= 2) {
      const av = `${t(cAv)} ${t(cLi)}`;
      riscos.push({
        tipo: tipoPorTexto(atual.tipo, agente, t(cFo)) ?? 'ACIDENTE', agente: agente.slice(0, 200),
        fonteGeradora: t(cFo) && t(cFo) !== '—' ? t(cFo).slice(0, 300) : null,
        medidasControle: t(cMe) && t(cMe) !== '—' ? t(cMe).slice(0, 600) : null,
        severidade: severidadePorTexto(t(cSe)),
        intensidade: av.match(MEDICAO)?.[1] ?? null,
        limiteTolerancia: (t(cLi) || av.match(/limite[^0-9]{0,15}([^)]*)/i)?.[1] || '').match(MEDICAO)?.[1] ?? null,
        pagina: atual.pag,
      });
    }
    atual = null;
  };
  let k = i + 1; let brancas = 0;
  for (; k < linhas.length; k++) {
    const l = linhas[k].t;
    if (!l.trim()) { if (++brancas >= 3) break; continue; }
    if (/p[aá]gina\s+\d+\s+de\s+\d+/i.test(l) || /^\s*GHE\s*[-–—.:]?\s*\d/i.test(l)) break;
    const cel = celulas(l);
    const primeira = cel[0];
    const tipoAqui = semAcento(primeira.split(/\s+/)[0] ?? '');
    if (TIPO_CELULA.test(tipoAqui)) {
      fechar(); brancas = 0;
      // Tipo e agente às vezes encostam ("ERGONOMICO Levantamento de"): o resto da 1ª célula vai para o agente.
      const sobra = primeira.slice(primeira.split(/\s+/)[0].length).trim();
      atual = { tipo: primeira, cel: cel.map((v, n) => [n === 0 ? '' : v]), pag: linhas[k].pag };
      if (sobra && cAg > 0) atual.cel[cAg].unshift(sobra);
      continue;
    }
    if (!atual) { if (brancas >= 1) break; continue; }
    // Texto corrido depois da tabela (começa na margem e é comprido): acabou a tabela.
    if (brancas >= 2 || (primeira.length > 25 && cols[1] && l.length - l.trimStart().length < cols[1].ini - 3)) break;
    brancas = 0;
    if (primeira && cAg > 0) atual.cel[cAg].push(primeira);
    cel.forEach((v, n) => { if (n > 0 && v) atual!.cel[n].push(v); });
  }
  fechar();
  return { riscos, fim: k };
}

const AGENTE = /^\s*(?:agente(?:\s+de\s+risco)?|perigo(?:\s*\/\s*fator\s+de\s+risco)?|fator\s+de\s+risco)\s*(?::\s*|\s{2,})(\S.*)$/i;
const RISCO_N = /^\s*RISCO\s*\d{1,3}\s*$/i;

// Acha os riscos de um bloco de linhas (o trecho de um GHE).
function riscosDoBloco(linhas: Linha[]): Risco[] {
  const inicios: { i: number; agente: string; categoria: string | null }[] = [];
  const daTabela: Risco[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const t = linhas[i].t;
    const cols = colunasDoTitulo(linhas, i);
    if (cols) { const r = riscosDaTabela(linhas, i, cols); daTabela.push(...r.riscos); i = r.fim - 1; continue; }
    const a = t.match(AGENTE);
    if (a) {
      const [nome0, ...resto] = a[1].split(/\s{3,}/);
      const nome = nome0.replace(/\s+grupo$/i, '');
      const grupoNaLinha = resto.join(' ').replace(/^grupo\s*/i, '');
      let agente = limpar(nome);
      // "Agente  Ergonômicos" só repete o grupo: usa a fonte geradora como nome mais à frente.
      if (agente.length < 2 || /^(fisicos?|quimicos?|biologicos?|ergonomicos?|acidentes?|mecanicos?)$/.test(semAcento(agente))) agente = `Risco ${agente}`.trim();
      inicios.push({ i, agente, categoria: grupoNaLinha || agente });
      continue;
    }
    if (RISCO_N.test(t)) {
      let k = i + 1;
      while (k < linhas.length && !linhas[k].t.trim()) k++;
      if (k >= linhas.length) continue;
      const agente = limpar(linhas[k].t);
      const cat = linhas.slice(k + 1, k + 3).map((l) => l.t).join(' ').match(/categoria\s*:\s*([A-Za-zÀ-ú]+)/i)?.[1] ?? null;
      if (agente.length >= 2) inicios.push({ i, agente, categoria: cat });
    }
  }
  const riscos: Risco[] = [];
  inicios.forEach((r, n) => {
    const ate = n + 1 < inicios.length ? inicios[n + 1].i : linhas.length;
    const lido = lerRisco(linhas, r.i, Math.min(ate, r.i + 80), r.agente, r.categoria);
    if (lido.agente.startsWith('Risco ') && lido.fonteGeradora) lido.agente = lido.fonteGeradora.slice(0, 120);
    riscos.push(lido);
  });
  return [...daTabela, ...riscos];
}

const GHE = /^\s{0,8}(GHE\s*[-–—.:]?\s*(\d{1,3})\b.*)$/i;
const SETOR = /^\s{0,8}(?:setor|local\s+de\s+trabalho|local\s+do\s+trabalho)\s*:\s*(\S.{1,80})$/i;

export function lerTextoSemIa(paginas: string[]): DocumentoLido {
  const linhas: Linha[] = paginas.flatMap((p, n) => p.split('\n').map((t) => ({ t: t.replace(/\t/g, '    '), pag: n + 1 })));
  const todo = paginas.join('\n');
  const avisos: string[] = ['Leitura grátis, sem IA: o sistema procurou GHEs e riscos pelos nomes dos campos. Confira tudo com o original e complete o que faltar.'];

  // Marcadores de GHE: "GHE 01", "GHE – 01", "GHE-01 — GHE 01 - Administrativo". Linhas do sumário (com "....") ficam de fora.
  const marcas: { i: number; num: string; nome: string }[] = [];
  linhas.forEach((l, i) => {
    if (/\.{5,}/.test(l.t)) return;
    const m = l.t.match(GHE);
    if (!m) return;
    let nome = coluna1(m[1]).replace(/^GHE\s*[-–—.:]?\s*\d+\s*[—–-]\s*(?=GHE)/i, '');
    nome = nome.replace(/^GHE\s*[-–—.:]?\s*(\d+)/i, (_x, d: string) => `GHE ${d.padStart(2, '0')}`);
    // "GHE 01" sozinho: tenta o setor/local logo abaixo para dar um nome melhor.
    if (/^GHE \d+$/.test(nome)) {
      for (let k = i + 1; k < Math.min(linhas.length, i + 4); k++) {
        const s = linhas[k].t.match(SETOR);
        if (s) { nome = `${nome} - ${coluna1(s[1])}`; break; }
      }
    }
    nome = nome.replace(/\s*[:(].*$/, '').replace(/\s+\d+\s+(colaborador|trabalhador|funcion).*$/i, '').trim();
    marcas.push({ i, num: String(Number(m[2])), nome: nome.slice(0, 120) });
  });

  const porNumero = new Map<string, { nome: string; riscos: Risco[] }>();
  marcas.forEach((m, n) => {
    const ate = n + 1 < marcas.length ? marcas[n + 1].i : linhas.length;
    const riscos = riscosDoBloco(linhas.slice(m.i + 1, ate));
    const g = porNumero.get(m.num) ?? { nome: m.nome, riscos: [] };
    if (m.nome.length > g.nome.length && !/\s{3,}/.test(m.nome)) g.nome = m.nome;
    const ja = new Set(g.riscos.map((r) => semAcento(r.agente)));
    for (const r of riscos) if (!ja.has(semAcento(r.agente))) { ja.add(semAcento(r.agente)); g.riscos.push(r); }
    porNumero.set(m.num, g);
  });

  let ghes = [...porNumero.values()].map((g) => ({ nome: g.nome, descricao: null, cargos: [] as string[], trabalhadores: null, riscos: g.riscos }));
  // Sem "GHE" no documento: procura por setor ou junta tudo num grupo só.
  if (!ghes.some((g) => g.riscos.length)) {
    const riscos = riscosDoBloco(linhas);
    if (riscos.length) {
      ghes = [{ nome: 'Riscos encontrados (sem GHE no documento)', descricao: null, cargos: [], trabalhadores: null, riscos }];
      avisos.push('O documento não separa os riscos por GHE. Eles vieram num grupo só: renomeie ou divida antes de importar.');
    }
  }
  const comRisco = ghes.filter((g) => g.riscos.length);
  const semRisco = ghes.filter((g) => !g.riscos.length).map((g) => g.nome);
  if (semRisco.length && comRisco.length) avisos.push(`Não achei riscos em: ${semRisco.join(', ')}. Se tiverem, adicione na tela.`);
  if (!comRisco.length) {
    avisos.push(ghes.length
      ? 'Achei os GHEs, mas não consegui separar os riscos deste modelo de documento. Adicione os riscos na tela, olhando o original.'
      : 'Não consegui achar GHEs nem riscos neste modelo de documento. Use "Adicionar GHE" para digitar olhando o original.');
  }
  const semFonte = comRisco.reduce((s, g) => s + g.riscos.filter((r) => !r.fonteGeradora).length, 0);
  if (semFonte) avisos.push(`${semFonte} risco(s) ficaram sem fonte geradora: preencha os campos em amarelo.`);

  const cnpj = todo.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/)?.[0] ?? null;
  const s = semAcento(todo.slice(0, 20000));
  const tipoDocumento = /programa de gerenciamento de riscos?/.test(s) ? 'PGR' : /ltcat|laudo tecnico das condicoes/.test(s) ? 'LTCAT' : /ppra|programa de prevencao de riscos ambientais/.test(s) ? 'PPRA' : null;
  const razao = todo.match(/raz[aã]o\s+social\s*:?\s+(\S.{2,100})/i)?.[1];
  const data = todo.match(/(?:data\s+(?:de\s+)?elabora[cç][aã]o|elaborado\s+em|vig[eê]ncia)\s*:?\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null;
  return {
    tipoDocumento, cnpj, dataElaboracao: data,
    empresa: razao ? coluna1(razao) : null,
    responsavelTecnico: null,
    ghes,
    avisos,
  };
}

const ESCANEADO = 'Este PDF parece ser escaneado (foto do papel): não tem texto para o sistema ler de graça. Use "Adicionar GHE" para digitar olhando o original.';

export async function lerPdfSemIa(pdf: Buffer): Promise<DocumentoLido> {
  const texto = await textoDoPdf(pdf);
  if ((texto.match(/[A-Za-zÀ-ú]/g) ?? []).length < 300) {
    return { tipoDocumento: null, empresa: null, cnpj: null, dataElaboracao: null, responsavelTecnico: null, ghes: [], avisos: [ESCANEADO] };
  }
  return lerTextoSemIa(texto.split('\f'));
}
