// Envio de e-mail pelo Resend. Sem RESEND_API_KEY no servidor, nada é enviado.
export type Anexo = { filename: string; content: string }; // content em base64

export const emailLigado = () => !!process.env.RESEND_API_KEY;

export async function enviarEmail(para: string[], assunto: string, html: string, anexos: Anexo[] = [], responderPara?: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.AVISOS_REMETENTE || 'Safety Nexo <onboarding@resend.dev>',
      to: para,
      subject: assunto,
      html,
      ...(anexos.length ? { attachments: anexos } : {}),
      ...(responderPara ? { reply_to: responderPara } : {}),
    }),
  });
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
