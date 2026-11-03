import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

// Lê a planilha que o RH exporta (Excel .xlsx ou .csv) e devolve as linhas como texto.
export type Celula = string | Date | null;

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Nomes de coluna que os sistemas de RH costumam usar (TOTVS, Senior, Sólides, planilhas próprias).
const SINONIMOS: Record<string, string[]> = {
  nome: ['nome', 'nome completo', 'funcionario', 'nome do funcionario', 'colaborador', 'nome do colaborador', 'empregado', 'nome do empregado', 'trabalhador'],
  cpf: ['cpf', 'cpf do funcionario', 'numero do cpf', 'n cpf'],
  cargo: ['cargo', 'funcao', 'descricao do cargo', 'nome do cargo', 'cargo funcao'],
  cbo: ['cbo', 'codigo cbo', 'cbo do cargo'],
  matricula: ['matricula', 'matricula esocial', 'registro', 'chapa', 'cod funcionario', 'codigo do funcionario'],
  admissao: ['admissao', 'data admissao', 'data de admissao', 'dt admissao', 'dt de admissao', 'data admissional'],
  ghe: ['ghe', 'setor', 'grupo homogeneo', 'grupo homogeneo de exposicao'],
};

export const COLUNAS_RECONHECIDAS = Object.keys(SINONIMOS);

function lerCsv(texto: string): Celula[][] {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';
  const linhas: Celula[][] = [];
  let linha: string[] = []; let campo = ''; let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

async function lerXlsx(buffer: Buffer): Promise<Celula[][]> {
  const livro = new ExcelJS.Workbook();
  try { await livro.xlsx.load(buffer as unknown as ArrayBuffer); } catch { throw new BadRequestException('Não consegui abrir a planilha. Salve como Excel (.xlsx) ou CSV e tente de novo.'); }
  const aba = livro.worksheets[0];
  if (!aba) throw new BadRequestException('A planilha está vazia.');
  const linhas: Celula[][] = [];
  aba.eachRow({ includeEmpty: false }, (row) => {
    const v: Celula[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const x = cell.value as unknown;
      let t: Celula;
      if (x === null || x === undefined) t = null;
      else if (x instanceof Date) t = x;
      else if (typeof x === 'object' && x && 'text' in x) t = String((x as { text: unknown }).text);
      else if (typeof x === 'object' && x && 'result' in x) { const r = (x as { result: unknown }).result; t = r instanceof Date ? r : r == null ? null : String(r); }
      else if (typeof x === 'object' && x && 'richText' in x) t = (x as { richText: { text: string }[] }).richText.map((p) => p.text).join('');
      else t = String(x);
      v[col - 1] = t;
    });
    linhas.push(Array.from(v, (c) => c ?? null));
  });
  return linhas;
}

export type LinhaPlanilha = { linha: number; valores: Partial<Record<string, Celula>> };

export async function lerPlanilha(buffer: Buffer, nomeArquivo: string) {
  const xlsx = buffer.subarray(0, 2).toString('latin1') === 'PK';
  let linhas: Celula[][];
  if (xlsx) linhas = await lerXlsx(buffer);
  else if (/\.xls$/i.test(nomeArquivo)) throw new BadRequestException('Esse é o Excel antigo (.xls). Abra no Excel e salve como .xlsx ou CSV.');
  else {
    let texto = buffer.toString('utf8');
    if (texto.includes('�')) texto = buffer.toString('latin1'); // CSV salvo pelo Excel em português
    linhas = lerCsv(texto.replace(/^﻿/, ''));
  }
  linhas = linhas.filter((l) => l.some((c) => c !== null && String(c).trim() !== ''));
  // O cabeçalho é a primeira linha (entre as 10 primeiras) que tem a coluna do nome.
  const idx = linhas.slice(0, 10).findIndex((l) => l.some((c) => typeof c === 'string' && SINONIMOS.nome.includes(semAcento(c))));
  if (idx < 0) throw new BadRequestException('Não achei a coluna com o nome dos funcionários. A primeira linha precisa ter os títulos, por exemplo: Nome, CPF, Cargo, Admissão.');
  const mapa: Record<number, string> = {};
  linhas[idx].forEach((c, i) => {
    if (typeof c !== 'string') return;
    const t = semAcento(c);
    const campo = Object.entries(SINONIMOS).find(([, s]) => s.includes(t))?.[0];
    if (campo && !Object.values(mapa).includes(campo)) mapa[i] = campo;
  });
  const dados = linhas.slice(idx + 1);
  if (dados.length > 5000) throw new BadRequestException('A planilha tem mais de 5.000 linhas. Divida em partes menores.');
  const resultado: LinhaPlanilha[] = dados.map((l, n) => {
    const valores: Partial<Record<string, Celula>> = {};
    for (const [i, campo] of Object.entries(mapa)) valores[campo] = l[Number(i)] ?? null;
    return { linha: idx + n + 2, valores };
  });
  return { colunas: Object.values(mapa), ignoradas: linhas[idx].filter((c, i) => typeof c === 'string' && c.trim() && !mapa[i]).map(String), linhas: resultado };
}

// Data de planilha: aceita dd/mm/aaaa, aaaa-mm-dd, data do Excel e número serial do Excel.
export function lerData(v: Celula | undefined): Date | null | 'invalida' {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? 'invalida' : new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), 12));
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const ano = m[3].length === 2 ? 2000 + Number(m[3]) - (Number(m[3]) > 50 ? 100 : 0) : Number(m[3]);
    const d = new Date(Date.UTC(ano, Number(m[2]) - 1, Number(m[1]), 12));
    return d.getUTCDate() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 ? d : 'invalida';
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) { const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)); return isNaN(d.getTime()) ? 'invalida' : d; }
  if (/^\d{5}$/.test(t)) return new Date(Date.UTC(1899, 11, 30, 12) + Number(t) * 86_400_000);
  return 'invalida';
}

export const texto = (v: Celula | undefined) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());
export const normalizarNome = semAcento;
