// Pix copia e cola (BR Code estático) pelo padrão EMV do Banco Central, sem intermediário.
const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63.
export function crc16(texto: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Nome e cidade sem acentos e no tamanho máximo do padrão.
const limpo = (t: string, max: number) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-]/g, '').trim().slice(0, max);

export function pixCopiaECola(p: { chave: string; nome: string; cidade: string; valorCentavos?: number; txid?: string; descricao?: string }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', p.chave.trim()) + (p.descricao ? campo('02', limpo(p.descricao, 40)) : '');
  const txid = (p.txid ?? '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const corpo = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986')
    + (p.valorCentavos ? campo('54', (p.valorCentavos / 100).toFixed(2)) : '')
    + campo('58', 'BR') + campo('59', limpo(p.nome, 25)) + campo('60', limpo(p.cidade, 15)) + campo('62', campo('05', txid)) + '6304';
  return corpo + crc16(corpo);
}

// Confere o formato da chave Pix: CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória.
export function chavePixValida(chave: string) {
  const c = chave.trim();
  return /^\d{11}$/.test(c) || /^\d{14}$/.test(c) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c) || /^\+55\d{10,11}$/.test(c)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);
}
