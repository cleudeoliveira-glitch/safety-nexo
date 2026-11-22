'use client';

import { lerUsuario } from './sessao';

// Lembra os nomes já digitados (responsável, ministrante, emitente, médico...) neste aparelho.
// Assim a pessoa não digita o mesmo nome toda vez: o campo já vem com o último usado
// e os outros aparecem como sugestão ao começar a digitar.
const CHAVE = 'sn-lembrar-v1';
type Guardado = { ultimos: Record<string, string>; nomes: string[] };

function ler(): Guardado {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const g = bruto ? (JSON.parse(bruto) as Partial<Guardado>) : {};
    return { ultimos: g.ultimos ?? {}, nomes: Array.isArray(g.nomes) ? g.nomes : [] };
  } catch {
    return { ultimos: {}, nomes: [] };
  }
}

// Último valor usado num campo (ex.: 'apr.responsavel'). Vazio se nunca usou.
export function ultimo(campo: string): string {
  if (typeof window === 'undefined') return '';
  return ler().ultimos[campo] ?? '';
}

// Guarda o que foi digitado. Os nomes de pessoas entram na lista de sugestões (os 30 mais recentes).
export function lembrar(valores: Record<string, string | null | undefined>, ehNome = true) {
  if (typeof window === 'undefined') return;
  const g = ler();
  for (const [campo, bruto] of Object.entries(valores)) {
    const valor = (bruto ?? '').trim();
    if (!valor) continue;
    g.ultimos[campo] = valor;
    if (ehNome) g.nomes = [valor, ...g.nomes.filter((n) => n.toLowerCase() !== valor.toLowerCase())].slice(0, 30);
  }
  try { window.localStorage.setItem(CHAVE, JSON.stringify(g)); } catch { /* aparelho sem espaço ou modo anônimo: segue sem lembrar */ }
}

export function nomesLembrados(): string[] {
  if (typeof window === 'undefined') return [];
  return ler().nomes;
}

// Preenche os campos vazios com o último valor usado. Recebe { idDoCampo: chave }.
// Os ids em "meuNome" usam o nome de quem está logado quando ainda não há nada guardado
// (quem faz a APR ou o DDS costuma ser a própria técnica).
// Chame depois de abrir a tela e depois de limpar o formulário.
export function preencherLembrados(campos: Record<string, string>, meuNome: string[] = []) {
  if (typeof window === 'undefined') return;
  const g = ler();
  const eu = lerUsuario()?.nome ?? '';
  for (const [id, campo] of Object.entries(campos)) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el || el.value.trim()) continue;
    const valor = g.ultimos[campo] ?? (meuNome.includes(id) ? eu : '');
    if (valor) el.value = valor;
  }
}
