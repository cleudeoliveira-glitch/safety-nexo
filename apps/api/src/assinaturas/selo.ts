import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { P12Signer } from '@signpdf/signer-p12';
import signpdf from '@signpdf/signpdf';
import { PDFDocument } from 'pdf-lib';
import { EsocialService } from '../esocial/esocial.service';

// Assina o PDF com o certificado ICP-Brasil da consultoria (NR-01, item 1.6), quando houver um válido.
// Sem certificado, devolve o PDF como está.
export async function selarIcp(esocial: EsocialService, consultoriaId: string, pdf: Buffer, motivo: string, url?: string): Promise<{ pdf: Buffer; titular: string | null }> {
  const credencial = await esocial.credencial(consultoriaId).catch(() => null);
  if (!credencial) return { pdf, titular: null };
  const doc = await PDFDocument.load(pdf);
  doc.setProducer('Safety Nexo');
  pdflibAddPlaceholder({ pdfDoc: doc, reason: motivo, contactInfo: url ?? '', name: credencial.aberto.titular, location: 'Brasil', signatureLength: 16_000 });
  const sem = Buffer.from(await doc.save({ useObjectStreams: false }));
  return { pdf: await signpdf.sign(sem, new P12Signer(credencial.pfx, { passphrase: credencial.senha })), titular: credencial.aberto.titular };
}
