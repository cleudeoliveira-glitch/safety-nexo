import * as tokens from '@safety-nexo/design-tokens';

// Moldura comum a todos os documentos: logo da empresa cliente no cabeçalho,
// logo da consultoria no rodapé.

export type Moldura = {
  titulo: string;
  logoEmpresa: string | null;
  consultoria: { nome: string; logo: string | null };
  infos: [rotulo: string, valor: string | number | null][];
  aviso: string;
};

export const escape = (valor: string | number | null | undefined) =>
  String(valor ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Folha em branco com os estilos comuns. Serve para documentos com várias páginas iguais
// (certificados, cédulas), em que cada página traz as próprias logos.
export function folhaHtml(corpo: string, cssExtra = ''): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Inter, system-ui, sans-serif; color: ${tokens.colors.text}; margin: 32px; font-size: 12px; }
    header { border-bottom: 3px solid ${tokens.colors.primary}; padding-bottom: 12px; margin-bottom: 20px; }
    .topo { display: flex; align-items: center; gap: 16px; }
    .topo img { height: 56px; }
    h1 { color: ${tokens.colors.primary}; font-size: 22px; margin: 0; }
    h2 { color: ${tokens.colors.primary}; font-size: 15px; margin: 18px 0 6px; }
    .meta { color: #6b7280; font-size: 11px; font-weight: normal; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: ${tokens.colors.background}; text-align: left; padding: 6px; border: 1px solid ${tokens.colors.border}; font-size: 11px; }
    td { padding: 6px; border: 1px solid ${tokens.colors.border}; vertical-align: top; }
    .badge { color: #fff; border-radius: 999px; padding: 2px 8px; font-size: 10px; }
    footer { margin-top: 28px; font-size: 10px; color: #6b7280; border-top: 1px solid ${tokens.colors.border}; padding-top: 10px; }
    .elaborado { display: flex; align-items: center; gap: 8px; font-size: 11px; color: ${tokens.colors.text}; }
    .elaborado img { height: 28px; }
    footer p { margin: 6px 0 0; }
    .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 36px 32px; margin-top: 44px; }
    .assinatura { border-top: 1px solid ${tokens.colors.text}; padding-top: 4px; text-align: center; font-size: 11px; }
    .assinatura span { display: block; color: #6b7280; font-size: 10px; }
    .quebra { page-break-after: always; }
    ${cssExtra}
  </style>
</head>
<body>
  ${corpo}
</body>
</html>`;
}

export function cabecalhoHtml(moldura: Pick<Moldura, 'titulo' | 'logoEmpresa' | 'infos'>): string {
  return `
  <header>
    <div class="topo">
      ${moldura.logoEmpresa ? `<img src="${moldura.logoEmpresa}" alt="Logo da empresa" />` : ''}
      <h1>${escape(moldura.titulo)}</h1>
    </div>
    <div class="info">
      ${moldura.infos.map(([rotulo, valor]) => `<div><strong>${escape(rotulo)}:</strong> ${escape(valor)}</div>`).join('')}
    </div>
  </header>`;
}

export function rodapeHtml(moldura: Pick<Moldura, 'consultoria' | 'aviso'>): string {
  return `
  <footer>
    <div class="elaborado">
      ${moldura.consultoria.logo ? `<img src="${moldura.consultoria.logo}" alt="Logo da consultoria" />` : ''}
      <span>Elaborado por <strong>${escape(moldura.consultoria.nome)}</strong></span>
    </div>
    <p>${escape(moldura.aviso)}</p>
  </footer>`;
}

export function documentoHtml(moldura: Moldura, corpo: string, cssExtra = ''): string {
  return folhaHtml(cabecalhoHtml(moldura) + corpo + rodapeHtml(moldura), cssExtra);
}
