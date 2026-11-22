import * as tokens from '@safety-nexo/design-tokens';
import { cabecalhoHtml, escape, folhaHtml, Moldura, rodapeHtml } from './layout';
import { medidasPartes, nivelRisco, NOME_NIVEL } from './nivel-risco';

// Mapa de risco: o desenho com círculos que fica afixado em cada setor, para todo mundo ver
// os riscos do lugar onde trabalha. Segue o padrão que a CIPA usa desde a Portaria 25/1994:
// a cor diz o grupo do risco e o tamanho do círculo diz a intensidade.

export type GrupoRisco = 'FISICO' | 'QUIMICO' | 'BIOLOGICO' | 'ERGONOMICO' | 'ACIDENTE';
export type Tamanho = 'PEQUENO' | 'MEDIO' | 'GRANDE';

export const GRUPOS: Record<GrupoRisco, { nome: string; cor: string; texto: string; exemplos: string }> = {
  FISICO: { nome: 'Físico', cor: '#16a34a', texto: '#ffffff', exemplos: 'ruído, calor, frio, vibração, radiação, umidade' },
  QUIMICO: { nome: 'Químico', cor: '#dc2626', texto: '#ffffff', exemplos: 'poeira, fumo, névoa, gás, vapor, produto químico' },
  BIOLOGICO: { nome: 'Biológico', cor: '#8b5a2b', texto: '#ffffff', exemplos: 'vírus, bactéria, fungo, parasita' },
  ERGONOMICO: { nome: 'Ergonômico', cor: '#facc15', texto: '#1f2937', exemplos: 'esforço, postura, repetição, ritmo, pressão, estresse' },
  ACIDENTE: { nome: 'Acidente', cor: '#2563eb', texto: '#ffffff', exemplos: 'máquina, queda, choque, incêndio, corte, animal' },
};
export const ORDEM_GRUPOS = Object.keys(GRUPOS) as GrupoRisco[];

export const TAMANHOS: Record<Tamanho, { nome: string; raio: number; explica: string }> = {
  PEQUENO: { nome: 'Pequeno', raio: 16, explica: 'risco baixo' },
  MEDIO: { nome: 'Médio', raio: 25, explica: 'risco moderado' },
  GRANDE: { nome: 'Grande', raio: 36, explica: 'risco alto ou crítico' },
};

// O tamanho vem do nível de risco que já está no GHE (severidade x probabilidade).
export function tamanhoDoRisco(severidade: string, probabilidade: string): Tamanho {
  const nivel = nivelRisco(severidade, probabilidade);
  if (nivel === 'BAIXO') return 'PEQUENO';
  if (nivel === 'MODERADO') return 'MEDIO';
  return 'GRANDE';
}

const PESO: Record<Tamanho, number> = { PEQUENO: 1, MEDIO: 2, GRANDE: 3 };

type RiscoGhe = {
  tipo: string; agente: string; fonteGeradora: string; severidade: string; probabilidade: string;
  medidasControle: string | null; medidasEpc?: string | null; medidasEpi?: string | null;
};
type GheMapa = { nome: string; codigo?: string | null; setor?: string | null; riscos: RiscoGhe[]; _count: { colaboradores: number } };

export type CirculoMapa = {
  numero: number;
  grupo: GrupoRisco;
  tamanho: Tamanho;
  agente: string;
  fontes: string[];
  nivel: string;
  trabalhadores: number;
  medidas: string;
};
export type SetorMapa = { nome: string; grupos: string[]; trabalhadores: number; circulos: CirculoMapa[] };

const chave = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Junta os GHEs pelo setor (o mapa é do lugar, não do grupo). O mesmo agente em dois GHEs do
// mesmo setor vira um círculo só, com o maior tamanho e a soma dos trabalhadores expostos.
export function montarSetores(ghes: GheMapa[]): SetorMapa[] {
  const setores = new Map<string, SetorMapa & { porAgente: Map<string, CirculoMapa & { peso: number }> }>();
  for (const g of ghes) {
    const nomeSetor = g.setor?.trim() || g.nome.trim();
    const k = chave(nomeSetor);
    if (!setores.has(k)) setores.set(k, { nome: nomeSetor, grupos: [], trabalhadores: 0, circulos: [], porAgente: new Map() });
    const s = setores.get(k)!;
    s.grupos.push(g.codigo?.trim() && !g.nome.includes(g.codigo.trim()) ? `${g.codigo.trim()} · ${g.nome}` : g.nome);
    s.trabalhadores += g._count.colaboradores;
    for (const r of g.riscos) {
      if (!(r.tipo in GRUPOS)) continue;
      const tamanho = tamanhoDoRisco(r.severidade, r.probabilidade);
      const kr = `${r.tipo}|${chave(r.agente)}`;
      const medidas = medidasPartes(r).map(([rotulo, texto]) => `${rotulo}: ${texto}`).join(' · ');
      const ja = s.porAgente.get(kr);
      if (ja) {
        ja.trabalhadores += g._count.colaboradores;
        if (r.fonteGeradora?.trim() && !ja.fontes.includes(r.fonteGeradora.trim())) ja.fontes.push(r.fonteGeradora.trim());
        if (PESO[tamanho] > ja.peso) { ja.tamanho = tamanho; ja.peso = PESO[tamanho]; ja.nivel = NOME_NIVEL[nivelRisco(r.severidade, r.probabilidade)]; }
        if (!ja.medidas && medidas) ja.medidas = medidas;
        continue;
      }
      s.porAgente.set(kr, {
        numero: 0, grupo: r.tipo as GrupoRisco, tamanho, peso: PESO[tamanho], agente: r.agente.trim(),
        fontes: r.fonteGeradora?.trim() ? [r.fonteGeradora.trim()] : [], nivel: NOME_NIVEL[nivelRisco(r.severidade, r.probabilidade)],
        trabalhadores: g._count.colaboradores, medidas,
      });
    }
  }
  return [...setores.values()].map(({ porAgente, ...s }) => {
    // Ordem fixa: pelo grupo (cor) e, dentro dele, do maior para o menor.
    const circulos = [...porAgente.values()]
      .sort((a, b) => ORDEM_GRUPOS.indexOf(a.grupo) - ORDEM_GRUPOS.indexOf(b.grupo) || b.peso - a.peso || a.agente.localeCompare(b.agente))
      .map(({ peso: _peso, ...c }, i) => ({ ...c, numero: i + 1 }));
    return { ...s, circulos };
  });
}

// Quebra o nome do agente em até duas linhas curtas para caber embaixo do círculo.
function rotulo(texto: string, max = 18): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [''];
  for (const p of palavras) {
    const atual = linhas[linhas.length - 1];
    if (!atual) linhas[linhas.length - 1] = p;
    else if ((atual + ' ' + p).length <= max) linhas[linhas.length - 1] = `${atual} ${p}`;
    else if (linhas.length < 2) linhas.push(p);
    else { linhas[1] = `${linhas[1]}…`; break; }
  }
  return linhas.map((l) => (l.length > max + 1 ? `${l.slice(0, max)}…` : l));
}

// Desenha os círculos dentro do contorno do setor, em fileiras, do jeito que se afixa na parede.
export function svgSetor(s: SetorMapa, largura: number, comRotulo: boolean): string {
  const celula = comRotulo ? 112 : 84;
  const porLinha = Math.max(1, Math.floor((largura - 24) / celula));
  const linhas = Math.max(1, Math.ceil(s.circulos.length / porLinha));
  const alturaLinha = comRotulo ? 112 : 84;
  const altura = 36 + linhas * alturaLinha + 8;
  const circulos = s.circulos.map((c, i) => {
    const col = i % porLinha;
    const lin = Math.floor(i / porLinha);
    const cx = 12 + celula / 2 + col * celula;
    const cy = 36 + lin * alturaLinha + 38;
    const g = GRUPOS[c.grupo];
    const r = TAMANHOS[c.tamanho].raio;
    const nome = comRotulo
      ? rotulo(c.agente).map((l, j) => `<text x="${cx}" y="${cy + 50 + j * 12}" text-anchor="middle" font-size="10" fill="#1f2937">${escape(l)}</text>`).join('')
      : '';
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${g.cor}" stroke="#1f2937" stroke-width="1"/>
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${r > 20 ? 13 : 11}" font-weight="700" fill="${g.texto}">${c.numero}</text>${nome}`;
  }).join('');
  const vazio = s.circulos.length
    ? ''
    : `<text x="${largura / 2}" y="${36 + alturaLinha / 2}" text-anchor="middle" font-size="12" fill="#6b7280">Nenhum risco cadastrado neste setor</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">
    <rect x="1" y="1" width="${largura - 2}" height="${altura - 2}" rx="6" fill="#f9fafb" stroke="${tokens.colors.primary}" stroke-width="2"/>
    <rect x="1" y="1" width="${largura - 2}" height="26" rx="6" fill="${tokens.colors.primary}"/>
    <text x="12" y="19" font-size="13" font-weight="700" fill="#ffffff">${escape(s.nome)}</text>
    <text x="${largura - 12}" y="19" text-anchor="end" font-size="11" fill="#ffffff">${s.trabalhadores} trabalhador(es)</text>
    ${circulos}${vazio}
  </svg>`;
}

function legendaHtml(): string {
  const bolinha = (cor: string, r: number) =>
    `<svg width="${r * 2 + 2}" height="${r * 2 + 2}"><circle cx="${r + 1}" cy="${r + 1}" r="${r}" fill="${cor}" stroke="#1f2937"/></svg>`;
  return `
  <div class="legenda">
    <div>
      <h3>Cor = tipo de risco</h3>
      ${ORDEM_GRUPOS.map((k) => `<p>${bolinha(GRUPOS[k].cor, 8)} <strong>${GRUPOS[k].nome}</strong> <span>${GRUPOS[k].exemplos}</span></p>`).join('')}
    </div>
    <div>
      <h3>Tamanho = intensidade</h3>
      ${(Object.keys(TAMANHOS) as Tamanho[]).map((k) => `<p class="tam">${bolinha('#9ca3af', Math.round(TAMANHOS[k].raio / 2.2))} <strong>${TAMANHOS[k].nome}</strong> <span>${TAMANHOS[k].explica}</span></p>`).join('')}
      <p class="nota">O número dentro do círculo leva à tabela de riscos.</p>
    </div>
  </div>`;
}

function tabelaHtml(s: SetorMapa): string {
  if (!s.circulos.length) return '';
  return `
  <table class="riscos">
    <thead><tr><th>Nº</th><th>Tipo</th><th>Risco</th><th>De onde vem</th><th>Intensidade</th><th>Expostos</th><th>Como se proteger</th></tr></thead>
    <tbody>${s.circulos.map((c) => `
      <tr>
        <td class="num"><span style="background:${GRUPOS[c.grupo].cor};color:${GRUPOS[c.grupo].texto}">${c.numero}</span></td>
        <td>${GRUPOS[c.grupo].nome}</td>
        <td><strong>${escape(c.agente)}</strong></td>
        <td>${escape(c.fontes.join('; ') || '—')}</td>
        <td>${TAMANHOS[c.tamanho].nome} (${escape(c.nivel)})</td>
        <td>${c.trabalhadores}</td>
        <td>${escape(c.medidas || '—')}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

const CSS = `
  @page { size: A4 landscape; }
  body { margin: 20px 28px; }
  header { margin-bottom: 12px; padding-bottom: 8px; }
  .pagina { page-break-after: always; }
  .pagina:last-of-type { page-break-after: auto; }
  .faixa { display: flex; gap: 18px; align-items: flex-start; }
  .desenho { flex: 1; }
  .legenda { width: 260px; display: flex; flex-direction: column; gap: 10px; font-size: 11px; }
  .legenda h3 { font-size: 12px; margin: 0 0 4px; color: ${tokens.colors.primary}; }
  .legenda p { margin: 2px 0; display: flex; align-items: center; gap: 6px; }
  .legenda p span { color: #6b7280; font-size: 10px; }
  .legenda .nota { color: #6b7280; font-size: 10px; display: block; margin-top: 4px; }
  .geral { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .riscos { margin-top: 8px; font-size: 10.5px; }
  .riscos td, .riscos th { padding: 4px 6px; }
  .riscos td.num span { display: inline-block; min-width: 20px; text-align: center; border-radius: 999px; padding: 2px 5px; font-weight: 700; }
  .grupos { color: #6b7280; font-size: 11px; margin: 0 0 8px; }
  .para-que { font-size: 11px; background: ${tokens.colors.background}; border-left: 4px solid ${tokens.colors.primary}; padding: 6px 10px; margin: 0 0 12px; }
  .assina { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; margin-top: 22px; page-break-inside: avoid; }
  footer { margin-top: 12px; padding-top: 6px; }
  footer p { margin: 2px 0 0; }
  .riscos tr { page-break-inside: avoid; }
  .assina div { border-top: 1px solid #1f2937; padding-top: 3px; text-align: center; font-size: 10px; }
`;

export function renderMapaRiscoHtml(moldura: Moldura, setores: SetorMapa[], extras: { consultoria: string; responsavel: string | null }): string {
  const assinaturas = `
    <div class="assina">
      <div>Presidente da CIPA ou representante (NR-05)</div>
      <div>${escape(extras.responsavel ?? 'Responsável técnico')}</div>
      <div>Data em que foi afixado</div>
    </div>`;
  const paraQue = `<p class="para-que"><strong>Para que serve:</strong> mostrar a quem trabalha no setor quais riscos existem ali, de onde vêm e como se proteger.
    É feito pela CIPA, ouvindo os trabalhadores, com base no inventário de riscos do PGR (NR-01), e deve ficar afixado em lugar visível do setor.
    Quando mudar o processo, a máquina ou o layout, o mapa deve ser refeito.</p>`;

  // Primeira folha: visão geral da empresa, todos os setores lado a lado (só quando há mais de um).
  const geral = setores.length > 1
    ? `<section class="pagina">
        ${cabecalhoHtml({ ...moldura, titulo: `${moldura.titulo}: visão geral` })}
        ${paraQue}
        <div class="faixa">
          <div class="desenho geral">${setores.map((s) => svgSetor(s, 370, false)).join('')}</div>
          ${legendaHtml()}
        </div>
        ${rodapeHtml(moldura)}
      </section>`
    : '';

  // Uma folha por setor: é a que vai para a parede.
  const porSetor = setores.map((s) => `
    <section class="pagina">
      ${cabecalhoHtml({ ...moldura, titulo: `${moldura.titulo}: ${s.nome}` })}
      ${s.grupos.length ? `<p class="grupos">Grupo(s) de exposição neste setor: ${escape(s.grupos.join('; '))}</p>` : ''}
      ${setores.length === 1 ? paraQue : ''}
      <div class="faixa">
        <div class="desenho">${svgSetor(s, 760, true)}</div>
        ${legendaHtml()}
      </div>
      ${tabelaHtml(s)}
      ${assinaturas}
      ${rodapeHtml(moldura)}
    </section>`).join('');

  return folhaHtml(geral + porSetor, CSS);
}
