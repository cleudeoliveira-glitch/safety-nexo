import * as tokens from '@safety-nexo/design-tokens';

// Moldura comum a todos os documentos: logo da empresa cliente no cabeçalho,
// logo da consultoria no rodapé.

export type Moldura = {
  titulo: string;
  logoEmpresa: string | null;
  consultoria: { nome: string; logo: string | null };
  infos: [rotulo: string, valor: string | number | null][];
  aviso: string;
  capa?: Capa; // programas e laudos (PGR, PCMSO, LTCAT, LIP, LPP, PGRTR, AET) abrem com capa
};

// Capa: identificação da empresa, do responsável técnico e o que é o documento.
export type Capa = {
  sigla: string;
  empresa: { razaoSocial: string; cnpj: string; cnae: string | null; grauRisco: number | null; endereco: string | null; numFuncionarios?: number };
  responsaveis: { papel: string; nome: string | null; formacao?: string | null; registro?: string | null; documento?: { rotulo: string; numero: string | null } }[];
  versao?: number;
  emitidoEm: Date;
  vigencia?: string;
  escopo: { oQueE: string; paraQue: string; norma: string };
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

const falta = (v: string | number | null | undefined, oQue: string) =>
  v === null || v === undefined || v === '' ? `<span class="falta">${escape(oQue)} não informado</span>` : escape(v);

export function capaHtml(moldura: Pick<Moldura, 'titulo' | 'logoEmpresa' | 'consultoria'>, c: Capa): string {
  const e = c.empresa;
  return `
  <section class="capa">
    <div class="capa-topo">${moldura.logoEmpresa ? `<img src="${moldura.logoEmpresa}" alt="Logo da empresa" />` : ''}</div>
    <div class="capa-titulo">
      <p class="capa-sigla">${escape(c.sigla)}</p>
      <h1>${escape(moldura.titulo)}</h1>
      <p class="capa-empresa">${escape(e.razaoSocial)}</p>
      <p class="meta">${c.versao ? `Versão ${c.versao} · ` : ''}emitido em ${c.emitidoEm.toLocaleDateString('pt-BR')}${c.vigencia ? ` · ${escape(c.vigencia)}` : ''}</p>
    </div>
    <div class="capa-bloco">
      <h2>Empresa</h2>
      <table>
        <tr><th>Razão social</th><td>${escape(e.razaoSocial)}</td></tr>
        <tr><th>CNPJ</th><td>${falta(e.cnpj, 'CNPJ')}</td></tr>
        <tr><th>CNAE</th><td>${falta(e.cnae, 'CNAE')}</td></tr>
        <tr><th>Grau de risco (NR-04)</th><td>${falta(e.grauRisco, 'Grau de risco')}</td></tr>
        <tr><th>Endereço</th><td>${falta(e.endereco, 'Endereço')}</td></tr>
        ${e.numFuncionarios !== undefined ? `<tr><th>Trabalhadores</th><td>${e.numFuncionarios}</td></tr>` : ''}
      </table>
    </div>
    <div class="capa-bloco">
      <h2>${c.responsaveis.length > 1 ? 'Responsáveis técnicos' : 'Responsável técnico'}</h2>
      <table>
        ${c.responsaveis.map((r) => `
        <tr><th>${escape(r.papel)}</th><td>
          <strong>${falta(r.nome, 'Nome')}</strong>${r.formacao ? ` · ${escape(r.formacao)}` : ''}<br>
          ${[r.registro !== undefined ? `Registro: ${falta(r.registro, 'Registro')}` : '', r.documento ? `${escape(r.documento.rotulo)}: ${falta(r.documento.numero, r.documento.rotulo)}` : ''].filter(Boolean).join(' · ')}
        </td></tr>`).join('')}
      </table>
    </div>
    <div class="capa-bloco capa-escopo">
      <h2>Sobre este documento</h2>
      <p><strong>O que é:</strong> ${escape(c.escopo.oQueE)}</p>
      <p><strong>Para que serve:</strong> ${escape(c.escopo.paraQue)}</p>
      <p><strong>O que a norma pede:</strong> ${escape(c.escopo.norma)}</p>
    </div>
    <div class="capa-rodape">
      ${moldura.consultoria.logo ? `<img src="${moldura.consultoria.logo}" alt="Logo da consultoria" />` : ''}
      <span>Elaborado por <strong>${escape(moldura.consultoria.nome)}</strong></span>
    </div>
  </section>`;
}

const CSS_CAPA = `
  .capa { page-break-after: always; min-height: 1000px; display: flex; flex-direction: column; gap: 18px; }
  .capa-topo img { height: 80px; }
  .capa-titulo { border-left: 5px solid ${tokens.colors.primary}; padding: 6px 0 6px 16px; margin-top: 40px; }
  .capa-titulo h1 { font-size: 26px; }
  .capa-sigla { margin: 0; font-size: 40px; font-weight: 700; color: ${tokens.colors.primary}; letter-spacing: 1px; }
  .capa-empresa { margin: 8px 0 2px; font-size: 16px; font-weight: 600; }
  .capa-bloco table th { width: 30%; }
  .capa-escopo p { margin: 4px 0; line-height: 1.45; }
  .capa-rodape { margin-top: auto; display: flex; align-items: center; gap: 10px; font-size: 11px; border-top: 1px solid ${tokens.colors.border}; padding-top: 10px; }
  .capa-rodape img { height: 32px; }
  .falta { color: #b45309; font-style: italic; }
`;

export function documentoHtml(moldura: Moldura, corpo: string, cssExtra = ''): string {
  const capa = moldura.capa ? capaHtml(moldura, moldura.capa) : '';
  return folhaHtml(capa + cabecalhoHtml(moldura) + corpo + rodapeHtml(moldura), moldura.capa ? cssExtra + CSS_CAPA : cssExtra);
}
