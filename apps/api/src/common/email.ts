// Envio de e-mail pelo Resend. Sem RESEND_API_KEY no servidor, nada é enviado.
export type Anexo = { filename: string; content: string }; // content em base64

export const emailLigado = () => !!process.env.RESEND_API_KEY;

const REMETENTE_TESTE = 'Safety Nexo <onboarding@resend.dev>';

function mandar(de: string, para: string[], assunto: string, html: string, anexos: Anexo[], responderPara?: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: de,
      to: para,
      subject: assunto,
      html,
      ...(anexos.length ? { attachments: anexos } : {}),
      ...(responderPara ? { reply_to: responderPara } : {}),
    }),
  });
}

export async function enviarEmail(para: string[], assunto: string, html: string, anexos: Anexo[] = [], responderPara?: string) {
  const de = process.env.AVISOS_REMETENTE || REMETENTE_TESTE;
  let r = await mandar(de, para, assunto, html, anexos, responderPara);
  // Se o domínio do remetente ainda não foi verificado no Resend, tenta com o remetente de teste
  // (que só entrega para o dono da conta do Resend) em vez de não mandar nada.
  if (!r.ok && de !== REMETENTE_TESTE && r.status === 403) {
    const motivo = await r.text();
    if (/domain/i.test(motivo)) {
      console.warn(`Remetente ${de} recusado pelo Resend (${motivo}); usando o remetente de teste.`);
      r = await mandar(REMETENTE_TESTE, para, assunto, html, anexos, responderPara);
    } else throw new Error(`Resend recusou (403): ${motivo}`);
  }
  if (!r.ok) throw new Error(`Resend recusou (${r.status}): ${await r.text()}`);
}

// Moldura simples dos e-mails do Safety Nexo.
export function emailMoldura(titulo: string, corpo: string, rodape = '') {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1F2937;max-width:620px;margin:auto">
    <div style="background:#0E4A5B;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0"><strong style="font-size:18px">${titulo}</strong></div>
    <div style="border:1px solid #E5E7EB;border-top:0;padding:18px 20px;border-radius:0 0 12px 12px">${corpo}
    ${rodape ? `<p style="margin-top:24px;font-size:12px;color:#6b7280">${rodape}</p>` : ''}</div></div>`;
}

export const WEB = () => (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
