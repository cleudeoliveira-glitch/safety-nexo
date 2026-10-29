// Funções puras para ler a tabela da NR-04 e normalizar códigos CNAE.

export type LinhaNr04 = { classe: string; denominacao: string; grauRisco: number };

// Aceita "1091-1/01", "10.91-1-01", "10911" etc. e devolve a classe no formato da NR-04: "10.91-1".
export function classeDoCnae(cnae: string): string | null {
  const digitos = cnae.replace(/\D/g, '');
  if (digitos.length < 5) return null;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 4)}-${digitos.slice(4, 5)}`;
}

// Lê o texto da NR-04 (pdftotext -layout) e extrai as linhas "XX.XX-X  Denominação  GR".
export function extrairLinhasNr04(texto: string): LinhaNr04[] {
  const linhas: LinhaNr04[] = [];
  for (const bruta of texto.split('\n')) {
    const m = bruta.trim().match(/^(\d{2}\.\d{2}-\d)\s+(.+?)\s+([1-4])$/);
    if (m) linhas.push({ classe: m[1], denominacao: m[2].replace(/\s+/g, ' '), grauRisco: Number(m[3]) });
  }
  return linhas;
}
