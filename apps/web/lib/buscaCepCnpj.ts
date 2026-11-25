// Busca de endereço pelo CEP e de dados da empresa pelo CNPJ, direto do navegador.
// Usa serviços públicos e gratuitos, sem chave: ViaCEP e BrasilAPI (com um segundo serviço
// de reserva para cada um). Se tudo falhar, a pessoa continua digitando à mão.

export type EnderecoCep = { cep: string; logradouro: string; bairro: string; cidade: string; uf: string };

export type DadosCnpj = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnae: string; // já no formato 00.00-0-00
  cnaeDescricao: string;
  situacao: string; // ATIVA, BAIXADA, INAPTA...
  endereco: EnderecoCep & { numero: string; complemento: string };
  telefone: string;
  email: string;
};

const soDigitos = (v: string) => (v ?? '').replace(/\D/g, '');

export const formatarCep = (v: string) => {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export const formatarCnpj = (v: string) => {
  const d = soDigitos(v);
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : v;
};

// 1091101 -> 10.91-1-01 (o mesmo formato que o resto do sistema usa).
export const formatarCnae = (v: string | number) => {
  const d = soDigitos(String(v ?? '')).padStart(7, '0');
  return d.length === 7 && d !== '0000000' ? `${d.slice(0, 2)}.${d.slice(2, 4)}-${d.slice(4, 5)}-${d.slice(5)}` : '';
};

// "RUA DAS FLORES" -> "Rua das Flores". Os dados da Receita vêm todos em maiúsculas.
const PEQUENAS = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'no', 'a', 'o']);
export function capitalizar(texto: string) {
  return (texto ?? '').toLowerCase().trim().replace(/\s+/g, ' ').split(' ').map((p, i) => {
    if (i > 0 && PEQUENAS.has(p)) return p;
    if (/^(ltda|me|epp|eireli|s\/a|sa)\.?$/.test(p)) return p.toUpperCase();
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

async function pegarJson(url: string, ms = 8000): Promise<unknown> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), ms);
  try {
    const r = await fetch(url, { signal: controle.signal, headers: { Accept: 'application/json' } });
    if (r.status === 404 || r.status === 400) return null; // não existe: não adianta tentar o serviço de reserva
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(relogio);
  }
}

type Bruto = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v)).trim();

export class BuscaNaoAchou extends Error {}

export async function buscarCep(cep: string): Promise<EnderecoCep> {
  const d = soDigitos(cep);
  if (d.length !== 8) throw new BuscaNaoAchou('O CEP tem 8 números.');
  let nenhumRespondeu = true;
  try {
    const r = (await pegarJson(`https://viacep.com.br/ws/${d}/json/`)) as Bruto | null;
    nenhumRespondeu = false;
    if (r && !r.erro) return { cep: formatarCep(d), logradouro: s(r.logradouro), bairro: s(r.bairro), cidade: s(r.localidade), uf: s(r.uf) };
  } catch { /* tenta o outro serviço */ }
  try {
    const r = (await pegarJson(`https://brasilapi.com.br/api/cep/v1/${d}`)) as Bruto | null;
    nenhumRespondeu = false;
    if (r) return { cep: formatarCep(d), logradouro: s(r.street), bairro: s(r.neighborhood), cidade: s(r.city), uf: s(r.state) };
  } catch { /* segue para o aviso */ }
  if (nenhumRespondeu) throw new Error('A busca de CEP não respondeu agora. Pode digitar o endereço normalmente.');
  throw new BuscaNaoAchou('Não encontramos este CEP. Confira os números ou digite o endereço.');
}

function lerCnpj(r: Bruto, d: string): DadosCnpj {
  const tipo = s(r.descricao_tipo_de_logradouro);
  let rua = s(r.logradouro);
  if (tipo && rua && !rua.toUpperCase().startsWith(tipo.toUpperCase())) rua = `${tipo} ${rua}`;
  const ddd = s(r.ddd_telefone_1);
  return {
    cnpj: formatarCnpj(d),
    razaoSocial: capitalizar(s(r.razao_social)),
    nomeFantasia: capitalizar(s(r.nome_fantasia)),
    cnae: formatarCnae(s(r.cnae_fiscal)),
    cnaeDescricao: s(r.cnae_fiscal_descricao),
    situacao: s(r.descricao_situacao_cadastral).toUpperCase(),
    endereco: {
      cep: formatarCep(s(r.cep)),
      logradouro: capitalizar(rua),
      numero: s(r.numero),
      complemento: capitalizar(s(r.complemento)),
      bairro: capitalizar(s(r.bairro)),
      cidade: capitalizar(s(r.municipio)),
      uf: s(r.uf).toUpperCase(),
    },
    telefone: ddd.length >= 10 ? `(${ddd.slice(0, 2)}) ${ddd.slice(2)}` : ddd,
    email: s(r.email).toLowerCase(),
  };
}

export async function buscarCnpj(cnpj: string): Promise<DadosCnpj> {
  const d = soDigitos(cnpj);
  if (d.length !== 14) throw new BuscaNaoAchou('O CNPJ tem 14 números.');
  let nenhumRespondeu = true;
  for (const url of [`https://brasilapi.com.br/api/cnpj/v1/${d}`, `https://minhareceita.org/${d}`]) {
    try {
      const r = (await pegarJson(url, 10000)) as Bruto | null;
      nenhumRespondeu = false;
      if (r && s(r.razao_social)) return lerCnpj(r, d);
    } catch { /* tenta o próximo */ }
  }
  if (nenhumRespondeu) throw new Error('A consulta do CNPJ não respondeu agora. Pode preencher os dados à mão.');
  throw new BuscaNaoAchou('Não encontramos este CNPJ na Receita. Confira os números ou preencha à mão.');
}

// "Rua das Flores, 120, Sala 2, Centro, Campinas/SP, CEP 13010-000"
export function montarEndereco(e: Partial<EnderecoCep> & { numero?: string; complemento?: string }) {
  const numero = (e.numero ?? '').trim();
  const partes = [
    e.logradouro ? `${e.logradouro}, ${numero || 's/n'}` : numero,
    e.complemento,
    e.bairro,
    e.cidade ? `${e.cidade}${e.uf ? `/${e.uf}` : ''}` : e.uf,
    e.cep ? `CEP ${formatarCep(e.cep)}` : '',
  ];
  return partes.map((p) => (p ?? '').trim()).filter(Boolean).join(', ');
}

// Escreve num campo do formulário como se a pessoa tivesse digitado (funciona com campo comum ou controlado).
export function escreverNoCampo(form: HTMLFormElement | null, nome: string, valor: string, soSeVazio = false) {
  const el = form?.elements.namedItem(nome);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || !valor) return false;
  if (soSeVazio && el.value.trim()) return false;
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
