// Pré-visualização antes de gerar qualquer PDF.
// O pedido vai à API com "X-Previa: 1", o documento volta em HTML e aparece inteiro na tela.
// O PDF de verdade só é pedido depois que a pessoa clica em "Está correto, gerar PDF".

export type PedidoPrevia = { nome: string; html: string; responder: (autorizou: boolean) => void };
type Ouvinte = (pedido: PedidoPrevia) => void;

let ouvinte: Ouvinte | null = null;

// A tela de pré-visualização (components/PreviaDocumento.tsx) se registra aqui ao abrir o site.
export function ouvirPrevia(f: Ouvinte | null) {
  ouvinte = f;
}

// Mensagem usada quando a pessoa volta para corrigir. O Aviso não mostra essa mensagem como erro.
export const VOLTOU_PARA_CORRIGIR = 'Nada foi gerado. Corrija o que precisar e gere de novo.';

export function pedirAutorizacao(nome: string, html: string): Promise<boolean> {
  // Sem a tela montada (não deveria acontecer), segue direto para não travar a pessoa.
  if (!ouvinte) return Promise.resolve(true);
  return new Promise((responder) => ouvinte?.({ nome, html, responder }));
}
