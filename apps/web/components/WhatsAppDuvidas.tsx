'use client';

// Botão flutuante do WhatsApp para dúvidas.
// Aparece SÓ na página de Planos e no Painel inicial. Nas telas de preenchimento fica escondido,
// para não cobrir o botão de salvar nem o teclado do celular.
const TELAS_COM_WHATSAPP = ['/', '/planos', '/plano'];

// Número com DDI e DDD, só dígitos. Troque na variável NEXT_PUBLIC_WHATSAPP_SUPORTE do Netlify.
const NUMERO = (process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE ?? '5562994343838').replace(/\D/g, '');
const MENSAGEM = 'Olá! Tenho uma dúvida sobre o Safety Nexo.';

export function WhatsAppDuvidas({ caminho, acimaDaAjuda }: { caminho: string; acimaDaAjuda: boolean }) {
  if (!NUMERO || !TELAS_COM_WHATSAPP.includes(caminho)) return null;
  return (
    <a
      href={`https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAGEM)}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Tirar dúvidas pelo WhatsApp"
      title="Tirar dúvidas pelo WhatsApp"
      className={`fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105 print:hidden ${acimaDaAjuda ? 'bottom-20' : 'bottom-4'}`}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C9.4 3 4 8.36 4 14.96c0 2.1.56 4.16 1.62 5.97L4 29l8.3-1.6a12.1 12.1 0 0 0 3.74.6C22.66 28 28 22.64 28 16.04 28 9.4 22.66 3 16.04 3Zm0 22.8c-1.2 0-2.38-.2-3.5-.6l-.25-.09-4.92.95.98-4.76-.16-.26a9.8 9.8 0 0 1-1.5-5.08C6.7 9.66 10.88 5.2 16.04 5.2c5.12 0 9.76 4.5 9.76 10.84 0 5.36-4.38 9.76-9.76 9.76Zm5.38-7.3c-.3-.15-1.74-.86-2-.96-.28-.1-.48-.15-.68.15-.2.29-.78.96-.95 1.16-.18.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.45.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.74-.71 1.99-1.4.25-.68.25-1.27.17-1.4-.07-.12-.27-.2-.57-.34Z" />
      </svg>
    </a>
  );
}
