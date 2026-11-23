import * as tokens from '@safety-nexo/design-tokens';

// Moldura comum a todos os documentos: logo da empresa cliente no cabeçalho,
// logo da consultoria no rodapé. O visual é um só para todos os documentos (o padrão Safety Nexo):
// capa, faixa de título, cabeçalho e rodapé em todas as páginas, com paginação e QR Code de validação.

export type Moldura = {
  titulo: string;
  logoEmpresa: string | null;
  consultoria: { nome: string; logo: string | null; responsavel?: string | null }; // responsavel: técnico da empresa, com o registro (CREA)
  infos: [rotulo: string, valor: string | number | null][];
  aviso: string;
  capa?: Capa; // programas e laudos (PGR, PCMSO, LTCAT, LIP, LPP, PGRTR, AET) abrem com capa
  sigla?: string; // aparece no selo do cabeçalho (PGR, OS, APR...); sem ela, sai do título
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
// (certificados, cédulas, mapa de risco), em que cada página traz as próprias logos.
// Os documentos de texto usam documentoHtml, mais abaixo, com o padrão visual completo.
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
      <span>Elaborado por <strong>${escape(moldura.consultoria.nome)}</strong>${moldura.consultoria.responsavel ? ` · Responsável técnico: ${escape(moldura.consultoria.responsavel)}` : ''}</span>
    </div>
    <p>${escape(moldura.aviso)}</p>
  </footer>`;
}

const falta = (v: string | number | null | undefined, oQue: string) =>
  v === null || v === undefined || v === '' ? `<span class="falta">${escape(oQue)} não informado</span>` : escape(v);

// ---------------------------------------------------------------------------------------------
// Padrão visual Safety Nexo
// ---------------------------------------------------------------------------------------------

// Cores da marca: azul petróleo e o degradê do símbolo SN (petróleo, verde-água e menta).
export const COR = {
  petroleo: tokens.colors.primary,
  agua: '#13808A',
  menta: '#34D399',
  claro: '#EEF6F7',
  linha: '#D9E6E9',
  texto: tokens.colors.text,
  suave: '#5B6B73',
};
export const DEGRADE = `linear-gradient(90deg, ${COR.petroleo} 0%, ${COR.agua} 55%, ${COR.menta} 100%)`;

// Marcadores trocados pelo PdfService na hora de gerar: o código e o QR de validação só existem no PDF final.
export const MARCA_CODIGO = '%%SN_CODIGO%%';
export const MARCA_QR = '%%SN_QR%%';

// O que o PdfService precisa para montar o cabeçalho e o rodapé de todas as páginas.
export type ConfigDocumento = {
  titulo: string;
  sigla: string;
  empresa: string | null;
  logoEmpresa: string | null;
  consultoria: { nome: string; logo: string | null; responsavel?: string | null };
  aviso: string;
  capa: boolean;
};

// Sigla do selo: a que vem entre parênteses no título (PGR, APR...) ou as iniciais.
export function siglaDe(titulo: string): string {
  const entre = titulo.match(/\(([A-ZÀ-Ú0-9/-]{2,8})\)/);
  if (entre) return entre[1];
  const conhecidas: [RegExp, string][] = [
    [/^ordem de servi/i, 'OS'], [/^permiss[aã]o de trabalho/i, 'PT'], [/^ata/i, 'ATA'], [/cipa/i, 'CIPA'], [/^lista de presen/i, 'LP'],
    [/^inspe/i, 'INSP'], [/^investiga/i, 'INV'], [/^plano de emerg/i, 'PAE'], [/^plano de resgate/i, 'PR'], [/^plano de a[cç][aã]o/i, 'PA'],
  ];
  const achada = conhecidas.find(([re]) => re.test(titulo));
  if (achada) return achada[1];
  return titulo.split(/\s+/).filter((p) => p.length > 2 && /^[A-Za-zÀ-ú]/.test(p)).slice(0, 3).map((p) => p[0].toUpperCase()).join('') || 'DOC';
}

const empresaDaMoldura = (m: Moldura) => m.capa?.empresa.razaoSocial ?? (m.infos.find(([r]) => /^empresa$/i.test(r))?.[1] as string | undefined) ?? null;

export function configDe(moldura: Moldura): ConfigDocumento {
  return {
    titulo: moldura.titulo,
    sigla: moldura.sigla ?? moldura.capa?.sigla ?? siglaDe(moldura.titulo),
    empresa: empresaDaMoldura(moldura),
    logoEmpresa: moldura.logoEmpresa,
    consultoria: moldura.consultoria,
    aviso: moldura.aviso,
    capa: !!moldura.capa,
  };
}

// Vai dentro do HTML e é lido pelo PdfService. Quem não tem o bloco (certificados, cédulas) sai como antes.
const blocoConfig = (c: ConfigDocumento) => `<script type="application/json" id="sn-doc">${JSON.stringify(c).replace(/</g, '\\u003c')}</script>`;

const dataLonga = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const cidadeDe = (endereco: string | null) => {
  if (!endereco) return null;
  const parte = endereco.split(',').map((x) => x.trim()).reverse().find((x) => /[A-Za-zÀ-ú]{3,}\s*[-/]\s*[A-Z]{2}\b/.test(x));
  return parte ? parte.replace(/\s*CEP.*$/i, '').trim() : null;
};

// Capa: nome do documento, empresa, cidade e data, responsável técnico. Ocupa a folha inteira.
export function capaHtml(moldura: Pick<Moldura, 'titulo' | 'logoEmpresa' | 'consultoria'>, c: Capa): string {
  const e = c.empresa;
  const titulo = moldura.titulo.replace(/\s*\([A-ZÀ-Ú0-9/-]{2,8}\)\s*$/, '');
  const cidade = cidadeDe(e.endereco);
  const resp = c.responsaveis;
  return `
  <section class="capa">
    <div class="capa-faixa"></div>
    <div class="capa-conteudo">
      <div class="capa-topo">
        <div class="capa-logo">${moldura.logoEmpresa ? `<img src="${moldura.logoEmpresa}" alt="Logo da empresa" />` : `<span class="capa-logo-nome">${escape(e.razaoSocial)}</span>`}</div>
        <div class="capa-selo"><span>Documento técnico de</span><strong>Segurança e Saúde no Trabalho</strong></div>
      </div>

      <div class="capa-titulo">
        <p class="capa-sigla">${escape(c.sigla)}<span class="capa-ponto"></span></p>
        <h1>${escape(titulo)}</h1>
        <div class="capa-traco"></div>
        <p class="capa-empresa">${escape(e.razaoSocial)}</p>
        <p class="capa-cnpj">CNPJ ${falta(e.cnpj, 'CNPJ')}${e.cnae ? ` · CNAE ${escape(e.cnae)}` : ''}${e.grauRisco ? ` · Grau de risco ${e.grauRisco}` : ''}</p>
      </div>

      <div class="capa-dados">
        <div><span>Local e data</span><strong>${cidade ? `${escape(cidade)}<br/>` : ''}${dataLonga(c.emitidoEm)}</strong></div>
        <div><span>Versão</span><strong>${c.versao ? `Revisão ${String(c.versao - 1).padStart(2, '0')}` : 'Emissão única'}</strong></div>
        <div><span>Vigência</span><strong>${c.vigencia ? escape(c.vigencia.charAt(0).toUpperCase() + c.vigencia.slice(1)) : 'Até a próxima revisão'}</strong></div>
        ${e.numFuncionarios !== undefined ? `<div><span>Trabalhadores</span><strong>${e.numFuncionarios}</strong></div>` : ''}
      </div>

      <div class="capa-resp">
        <p class="capa-rotulo">${resp.length > 1 ? 'Responsáveis técnicos' : 'Responsável técnico'}</p>
        ${resp.map((r) => `
        <div class="capa-pessoa">
          <strong>${falta(r.nome, 'Nome')}</strong>
          <span>${[r.papel, r.formacao].filter(Boolean).map((x) => escape(x)).join(' · ')}</span>
          <span>${[r.registro !== undefined ? `Registro: ${falta(r.registro, 'Registro')}` : '', r.documento ? `${escape(r.documento.rotulo)}: ${falta(r.documento.numero, r.documento.rotulo)}` : ''].filter(Boolean).join(' · ')}</span>
        </div>`).join('')}
      </div>

      <div class="capa-sobre">
        <p><strong>O que é.</strong> ${escape(c.escopo.oQueE)}</p>
        <p><strong>Para que serve.</strong> ${escape(c.escopo.paraQue)}</p>
        <p><strong>O que a norma pede.</strong> ${escape(c.escopo.norma)}</p>
      </div>
    </div>

    <div class="capa-base">
      <div class="capa-elaborado">
        ${moldura.consultoria.logo ? `<span class="capa-logo-cons"><img src="${moldura.consultoria.logo}" alt="Logo da consultoria" /></span>` : ''}
        <div><span>Elaborado por</span><strong>${escape(moldura.consultoria.nome)}</strong></div>
      </div>
      <div class="capa-validacao">
        <div><span>Código de validação</span><strong>${MARCA_CODIGO}</strong><em>Aponte a câmera para o QR Code para conferir a autenticidade.</em></div>
        <span class="capa-qr">${MARCA_QR}</span>
      </div>
    </div>
  </section>`;
}

// Faixa de título dos documentos sem capa (OS, APR, PT, atas, inspeções...): mesma identidade, em meia folha.
export function faixaTituloHtml(moldura: Pick<Moldura, 'titulo' | 'logoEmpresa' | 'infos'>, sigla: string): string {
  return `
  <header class="faixa">
    <div class="faixa-topo">
      <div class="faixa-logo">${moldura.logoEmpresa ? `<img src="${moldura.logoEmpresa}" alt="Logo da empresa" />` : ''}</div>
      <div class="faixa-titulo">
        <span class="selo">${escape(sigla)}</span>
        <h1>${escape(moldura.titulo)}</h1>
      </div>
    </div>
    ${moldura.infos.length ? `<div class="faixa-infos">${moldura.infos.map(([rotulo, valor]) => `<div><span>${escape(rotulo)}</span><strong>${escape(valor)}</strong></div>`).join('')}</div>` : ''}
  </header>`;
}

// Estilos do padrão Safety Nexo. Margens da folha ficam no PdfService (cabeçalho e rodapé em todas as páginas).
export const CSS_PADRAO = `
  @page { size: A4; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; }
  body { font-family: Inter, 'Liberation Sans', Arial, sans-serif; color: ${COR.texto}; margin: 0; font-size: 12.5px; line-height: 1.55; }
  p { margin: 0 0 8px; }
  strong { font-weight: 600; }
  h1 { color: ${COR.petroleo}; font-size: 22px; line-height: 1.2; margin: 0; font-weight: 700; letter-spacing: -0.2px; }
  h2 { color: ${COR.petroleo}; font-size: 15px; font-weight: 700; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 2px solid ${COR.linha}; position: relative; page-break-after: avoid; }
  h2::after { content: ''; position: absolute; left: 0; bottom: -2px; width: 72px; height: 2px; background: ${DEGRADE}; }
  h3 { color: ${COR.petroleo}; font-size: 13.5px; font-weight: 700; margin: 16px 0 6px; padding-left: 10px; border-left: 3px solid ${COR.menta}; page-break-after: avoid; }
  h4 { font-size: 12.5px; margin: 12px 0 4px; color: #334155; }
  ul, ol { margin: 4px 0 10px; padding-left: 20px; }
  li { margin-bottom: 3px; }
  li::marker { color: ${COR.agua}; }
  .meta { color: ${COR.suave}; font-size: 11px; font-weight: normal; }
  .falta { color: #b45309; font-style: italic; }
  .nota { font-size: 11px; color: #475569; }
  .alerta { color: #DC2626; font-weight: 600; }
  .c { text-align: center; }
  .quebra { page-break-after: always; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 6px 0 12px; font-size: 11px; border: 1px solid ${COR.linha}; border-radius: 6px; overflow: hidden; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: ${COR.petroleo}; color: #fff; text-align: left; padding: 7px 8px; font-weight: 600; font-size: 10.5px; letter-spacing: 0.2px; border: none; vertical-align: bottom; }
  td { padding: 6px 8px; border: none; border-top: 1px solid ${COR.linha}; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #F7FAFB; }
  tbody tr:first-child td { border-top: none; }
  tbody th { background: ${COR.claro}; color: ${COR.petroleo}; border-top: 1px solid ${COR.linha}; vertical-align: top; font-size: 11px; }
  tbody tr:first-child th { border-top: none; }
  .badge { color: #fff; border-radius: 999px; padding: 2px 8px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }

  .faixa { margin: 0 0 18px; border: 1px solid ${COR.linha}; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
  .faixa-topo { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border-left: 6px solid ${COR.petroleo}; background: linear-gradient(90deg, ${COR.claro} 0%, #fff 70%); }
  .faixa-logo img { max-height: 46px; max-width: 150px; display: block; }
  .faixa-titulo { display: flex; flex-direction: column; gap: 4px; }
  .faixa-titulo h1 { font-size: 19px; }
  .selo { align-self: flex-start; background: ${DEGRADE}; color: #fff; font-weight: 700; font-size: 10px; letter-spacing: 1.2px; padding: 3px 10px; border-radius: 999px; }
  .faixa-infos { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid ${COR.linha}; }
  .faixa-infos div { padding: 6px 16px; border-bottom: 1px solid ${COR.linha}; font-size: 11px; display: flex; flex-direction: column; }
  .faixa-infos div:nth-child(odd) { border-right: 1px solid ${COR.linha}; }
  .faixa-infos span { color: ${COR.suave}; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px; }
  .faixa-infos strong { font-weight: 600; }

  .caixa-texto { background: ${COR.claro}; border-left: 4px solid ${COR.menta}; border-radius: 0 8px 8px 0; padding: 10px 14px; margin: 0 0 14px; page-break-inside: avoid; }
  .caixa-texto h2 { margin-top: 0; border: none; padding: 0; font-size: 13px; } .caixa-texto h2::after { display: none; }
  .caixa-texto p:last-child { margin-bottom: 0; }

  .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 22px; margin-top: 26px; page-break-inside: avoid; }
  .assinatura { border: 1px solid ${COR.linha}; border-radius: 8px; padding: 0 12px 10px; text-align: center; font-size: 11.5px; font-weight: 600; background: #FBFDFD; page-break-inside: avoid; }
  .assinatura::before { content: ''; display: block; height: 48px; border-bottom: 1px solid ${COR.texto}; margin: 0 6px 6px; }
  .assinatura span { display: block; color: ${COR.suave}; font-size: 10px; font-weight: normal; }
  .assinatura .data { margin-top: 6px; color: ${COR.texto}; }
  .local-data { margin-top: 26px; font-weight: 500; }
  .fim-documento { margin-top: 14px; page-break-before: avoid; break-before: avoid; text-align: center; color: ${COR.suave}; font-size: 10px; letter-spacing: 3px; }
  .fim-documento::before, .fim-documento::after { content: ''; display: inline-block; width: 60px; height: 1px; background: ${COR.linha}; vertical-align: middle; margin: 0 10px; }

  /* Capa */
  .capa { position: relative; width: 210mm; height: 296mm; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; background: #fff; }
  .capa-faixa { position: absolute; left: 0; top: 0; bottom: 0; width: 13mm; background: linear-gradient(180deg, ${COR.petroleo} 0%, ${COR.agua} 60%, ${COR.menta} 100%); }
  .capa-faixa::after { content: ''; position: absolute; left: 13mm; top: 0; bottom: 0; width: 2.2mm; background: ${COR.claro}; }
  .capa-conteudo { flex: 1; padding: 18mm 16mm 0 30mm; display: flex; flex-direction: column; }
  .capa-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .capa-logo img { max-height: 26mm; max-width: 70mm; display: block; }
  .capa-logo-nome { font-size: 18px; font-weight: 700; color: ${COR.petroleo}; }
  .capa-selo { text-align: right; font-size: 10px; color: ${COR.suave}; text-transform: uppercase; letter-spacing: 1px; line-height: 1.5; }
  .capa-selo strong { display: block; color: ${COR.petroleo}; font-size: 11px; }
  .capa-titulo { margin-top: 30mm; }
  .capa-sigla { margin: 0; font-size: 84px; line-height: 0.95; font-weight: 800; letter-spacing: -2px; color: ${COR.petroleo}; }
  .capa-ponto { display: inline-block; width: 15px; height: 15px; border-radius: 4px; background: ${COR.menta}; margin-left: 6px; vertical-align: baseline; }
  .capa-titulo h1 { font-size: 27px; margin-top: 10px; max-width: 150mm; }
  .capa-traco { width: 34mm; height: 4px; border-radius: 4px; background: ${DEGRADE}; margin: 14px 0 14px; }
  .capa-empresa { font-size: 19px; font-weight: 700; margin: 0; color: ${COR.texto}; }
  .capa-cnpj { color: ${COR.suave}; margin: 4px 0 0; font-size: 12px; }
  .capa-dados { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 14mm; border-top: 1px solid ${COR.linha}; border-bottom: 1px solid ${COR.linha}; }
  .capa-dados div { padding: 10px 12px 10px 0; display: flex; flex-direction: column; gap: 3px; }
  .capa-dados div + div { padding-left: 12px; border-left: 1px solid ${COR.linha}; }
  .capa-dados span, .capa-rotulo, .capa-base span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.8px; color: ${COR.suave}; }
  .capa-dados strong { font-size: 12.5px; color: ${COR.petroleo}; line-height: 1.35; }
  .capa-resp { margin-top: 9mm; }
  .capa-rotulo { margin: 0 0 6px; }
  .capa-pessoa { display: flex; flex-direction: column; padding: 8px 0 8px 12px; border-left: 3px solid ${COR.menta}; margin-bottom: 6px; }
  .capa-pessoa strong { font-size: 14px; color: ${COR.texto}; }
  .capa-pessoa span { font-size: 11px; color: ${COR.suave}; }
  .capa-sobre { margin-top: auto; margin-bottom: 8mm; background: ${COR.claro}; border-radius: 10px; padding: 12px 14px; font-size: 10.5px; line-height: 1.5; }
  .capa-sobre p { margin: 0 0 4px; } .capa-sobre p:last-child { margin: 0; } .capa-sobre strong { color: ${COR.petroleo}; }
  .capa-base { background: ${COR.petroleo}; color: #fff; padding: 9mm 16mm 9mm 30mm; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .capa-base span { color: rgba(255,255,255,.7); display: block; }
  .capa-base strong { font-size: 13px; display: block; }
  .capa-elaborado { display: flex; align-items: center; gap: 12px; }
  .capa-logo-cons { background: #fff; border-radius: 8px; padding: 6px 8px; display: inline-flex; }
  .capa-logo-cons img { max-height: 13mm; max-width: 42mm; display: block; }
  .capa-validacao { display: flex; align-items: center; gap: 12px; text-align: right; }
  .capa-validacao strong { font-family: 'Liberation Mono', monospace; letter-spacing: 1px; }
  .capa-validacao em { display: block; font-style: normal; font-size: 9px; color: rgba(255,255,255,.7); max-width: 52mm; margin-left: auto; }
  .capa-qr { background: #fff; border-radius: 6px; padding: 4px; display: inline-flex; }
  .capa-qr img { width: 22mm; height: 22mm; display: block; }
  .qr-previa { width: 22mm; height: 22mm; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8px; color: ${COR.suave}; border: 1px dashed ${COR.linha}; }
`;

// Documento completo no padrão Safety Nexo: capa (programas e laudos) ou faixa de título, o corpo e o fecho.
// O cabeçalho e o rodapé de cada página (logo do cliente, logo da consultoria, paginação e QR) são
// colocados pelo PdfService. Na pré-visualização, um rodapé de exemplo aparece no fim da página.
export function documentoHtml(moldura: Moldura, corpo: string, cssExtra = ''): string {
  const config = configDe(moldura);
  const abertura = moldura.capa ? capaHtml(moldura, moldura.capa) : faixaTituloHtml(moldura, config.sigla);
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escape(moldura.titulo)}</title>
  <style>${CSS_PADRAO}${cssExtra}</style>
  ${blocoConfig(config)}
</head>
<body class="sn-documento">
  ${abertura}
  <main class="corpo">${corpo}<p class="fim-documento">FIM DO DOCUMENTO</p></main>
</body>
</html>`;
}

// Várias folhas no mesmo PDF (uma OS por trabalhador): cada uma abre com a faixa de título.
export function documentoVariasFolhasHtml(moldura: Moldura, folhas: string[], cssExtra = ''): string {
  const config = configDe(moldura);
  const corpo = folhas.map((f, i) => `<div class="${i < folhas.length - 1 ? 'quebra' : ''}">${faixaTituloHtml({ ...moldura, infos: [] }, config.sigla)}${f}</div>`).join('');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escape(moldura.titulo)}</title>
  <style>${CSS_PADRAO}${cssExtra}</style>
  ${blocoConfig(config)}
</head>
<body class="sn-documento">${corpo}</body>
</html>`;
}
