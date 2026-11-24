// Leitura do Diário Oficial da União, onde toda mudança de NR é publicada por lei.
// (As páginas das NRs no gov.br recusam acesso de servidores fora do Brasil, por isso o DOU é a fonte.)
// Só texto e expressões simples, sem biblioteca de HTML.

export const PAGINA_NRS =
  'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes';
export const DOU = 'https://www.in.gov.br';

// Nome honesto do robô: o DOU atende normalmente quem se identifica assim.
const NAVEGADOR = 'Mozilla/5.0 (compatible; SafetyNexo/1.0; acompanhamento de normas)';

// O DOU às vezes responde 502/503 por alguns segundos: tenta de novo até 3 vezes.
export async function baixar(url: string, tempo = 30000): Promise<Buffer> {
  for (let tentativa = 1; ; tentativa++) {
    try { return await baixarUmaVez(url, tempo); } catch (e) {
      if (tentativa >= 3 || !/respondeu 5\d\d|demorou|fetch failed/.test((e as Error).message)) throw e;
      await new Promise((r) => setTimeout(r, 4000 * tentativa));
    }
  }
}

async function baixarUmaVez(url: string, tempo: number): Promise<Buffer> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), tempo);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': NAVEGADOR, accept: '*/*' } });
    if (!r.ok) throw new Error(`${new URL(url).host} respondeu ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error(`${new URL(url).host} demorou demais para responder`);
    throw e;
  } finally { clearTimeout(t); }
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ordm: 'º', ordf: 'ª', deg: '°', sect: '§' };
export function semHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// "NR-1", "NR 01", "Norma Regulamentadora nº 35" -> "NR-01", "NR-35"
export function nrsCitadas(texto: string): string[] {
  const achadas = new Set<string>();
  const re = /\b(?:NR|Norma\s+Regulamentadora)\s*(?:n[º°o.]?\s*)?[-–]?\s*(\d{1,2})\b/gi;
  for (const m of texto.matchAll(re)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 40) achadas.add(`NR-${String(n).padStart(2, '0')}`);
  }
  return [...achadas].sort();
}

// Chave da portaria para não cadastrar a mesma duas vezes: "Portaria MTE nº 1.419, de 27 de agosto de 2024" -> "portaria:1419:2024"
export function chaveDoAto(titulo: string): string | null {
  const m = titulo.match(/\b(portaria|resolu[çc][ãa]o|instru[çc][ãa]o normativa)\b[^\d]{0,40}?([\d.]+)\s*,?\s*de\s+\d{1,2}[º°]?\s+de\s+[a-zç]+\s+de\s+(\d{4})/i);
  if (!m) return null;
  const tipo = m[1].toLowerCase().startsWith('portaria') ? 'portaria' : m[1].toLowerCase().startsWith('resol') ? 'resolucao' : 'in';
  return `${tipo}:${m[2].replace(/\./g, '')}:${m[3]}`;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function dataPorExtenso(t: string): string | null {
  const m = t.match(/(\d{1,2})[º°]?\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const mes = MESES.indexOf(m[2].toLowerCase().replace('marco', 'março')) + 1;
  if (!mes) return null;
  return `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const somarDias = (iso: string, dias: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + dias * 864e5).toISOString().slice(0, 10);

// Quando começa a valer, lido do próprio texto ("entra em vigor ...").
export function vigencia(texto: string, publicadaEm: string | null): string | null {
  const m = texto.match(/entra(?:rá|m)?\s+em\s+vigor\s+([^.;]{0,160})/i);
  if (!m) return null;
  const trecho = m[1];
  if (/data\s+de\s+sua\s+publica/i.test(trecho) && !/ap[óo]s|dias|meses/i.test(trecho)) return publicadaEm;
  const data = dataPorExtenso(trecho);
  if (data) return data;
  const dias = trecho.match(/(\d+)\s*(?:\([^)]*\)\s*)?dias/i);
  if (dias && publicadaEm) return somarDias(publicadaEm, Number(dias[1]));
  const meses = trecho.match(/(\d+)\s*(?:\([^)]*\)\s*)?meses/i);
  if (meses && publicadaEm) { const d = new Date(`${publicadaEm}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + Number(meses[1])); return d.toISOString().slice(0, 10); }
  return null;
}

// Pega a ementa (a frase que diz do que trata o ato) e os primeiros artigos, já cortados num tamanho de leitura.
export function pontosDoTexto(texto: string): { ementa: string | null; artigos: string[] } {
  const limpo = texto.replace(/\s+/g, ' ');
  const em = limpo.match(/\d{4}\s+((?:Aprova|Altera|Disp[õo]e|Prorroga|Revoga|Estabelece|Institui|Inclui|Acrescenta|Atualiza|D[áa] nova reda[çc][ãa]o)(?:[^.]|\.(?=\S)){10,400}\.)/);
  const artigos: string[] = [];
  for (const m of limpo.matchAll(/Art\.\s*(\d+)[º°o]?\.?\s*(.{10,600}?)(?=\s+Art\.\s*\d+[º°o]?|$)/g)) {
    if (artigos.length >= 4) break;
    let a = m[2].trim();
    if (/^Esta Portaria entra em vigor/i.test(a)) continue;
    if (a.length > 320) a = `${a.slice(0, 317).replace(/\s+\S*$/, '')}…`;
    artigos.push(`Art. ${m[1]}º ${a}`);
  }
  return { ementa: em ? em[1].trim() : null, artigos };
}

// ---------- Diário Oficial da União ----------

// Endereço da busca do DOU (espaço vira "+", como o próprio site faz).
export function urlBuscaDou(termo: string, periodo: 'dia' | 'semana' | 'mes' | 'ano') {
  return `${DOU}/consulta/-/buscar/dou?${new URLSearchParams({ q: termo, s: 'do1', exactDate: periodo, sortType: '1' })}`;
}

export type AtoDou = { chave: string | null; titulo: string; ementa: string; orgao: string; publicadaEm: string | null; url: string; tipo: string };

// A busca do DOU devolve a lista em JSON dentro da própria página.
export function lerBuscaDou(html: string): AtoDou[] {
  const m = html.match(/<script[^>]+id="[^"]*BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) throw new Error('A página de busca do Diário Oficial mudou de formato.');
  const dados = JSON.parse(m[1]) as { jsonArray?: Record<string, string>[] };
  return (dados.jsonArray ?? []).map((i) => {
    const pub = (i.pubDate ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const titulo = semHtml(i.title ?? '').replace(/\s+/g, ' ');
    return {
      chave: chaveDoAto(titulo),
      titulo,
      ementa: semHtml(i.content ?? '').replace(/\s+/g, ' '),
      orgao: i.hierarchyStr ?? '',
      publicadaEm: pub ? `${pub[3]}-${pub[2]}-${pub[1]}` : null,
      url: `${DOU}/web/dou/-/${i.urlTitle}`,
      tipo: i.artType ?? '',
    };
  });
}

// Texto do ato na página do DOU (div "texto-dou") e a ementa, que o DOU marca à parte.
export function lerAtoDou(html: string): { texto: string; ementa: string | null } {
  const ini = html.search(/<div[^>]+class="[^"]*texto-dou[^"]*"/i);
  if (ini < 0) return { texto: '', ementa: null };
  const fim = html.indexOf('</div>', ini);
  const bloco = html.slice(ini, fim > ini ? fim : undefined);
  const em = bloco.match(/<p[^>]+class="[^"]*ementa[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  return { texto: semHtml(bloco), ementa: em ? semHtml(em[1]).replace(/\s+/g, ' ') : null };
}

// É ato do Ministério do Trabalho que mexe em NR? (tira nomeações, CA de EPI e outros que só citam a NR)
export function atoQueMudaNr(a: AtoDou): boolean {
  if (!/^Minist[ée]rio do Trabalho/i.test(a.orgao)) return false; // tira MP do Trabalho, conselhos e outros órgãos que só citam a NR
  if (!/portaria|resolu|instru/i.test(`${a.tipo} ${a.titulo}`)) return false;
  return /(aprova|altera|d[áa] nova reda|prorroga|revoga|inclui|acrescenta|atualiza).{0,250}?(norma regulamentadora|NR[-\s]?\d)/i.test(a.ementa);
}
