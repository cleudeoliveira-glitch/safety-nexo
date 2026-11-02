import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// Cifra AES-256-GCM com a chave CERT_SECRET do servidor. Sem a chave, não há como abrir o certificado.
function chave(): Buffer {
  const segredo = process.env.CERT_SECRET;
  if (!segredo || segredo.length < 32) throw new Error('CERT_SECRET não configurado no servidor (mínimo 32 caracteres).');
  return createHash('sha256').update(segredo).digest();
}

export function cifrar(dados: Buffer | string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave(), iv);
  const corpo = Buffer.concat([c.update(typeof dados === 'string' ? Buffer.from(dados, 'utf8') : dados), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), corpo]).toString('base64');
}

export function decifrar(texto: string): Buffer {
  const b = Buffer.from(texto, 'base64');
  const d = createDecipheriv('aes-256-gcm', chave(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]);
}
