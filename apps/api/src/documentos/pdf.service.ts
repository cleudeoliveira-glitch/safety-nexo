import { Injectable, Optional } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import puppeteer, { Browser } from 'puppeteer-core';
import * as QRCode from 'qrcode';
import { emPrevia, planoAtual, temRecurso } from '../common/plano';
import { WEB } from '../common/email';
import { PrismaService } from '../prisma/prisma.service';
import { COR, ConfigDocumento, DEGRADE, MARCA_CODIGO, MARCA_QR, escape } from './layout';

// Plano Grátis: o PDF sai com a marca "Versão Teste" em todas as páginas.
const MARCA_TESTE = `<style>.sn-marca-teste{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999}
.sn-marca-teste span{transform:rotate(-35deg);font:700 54px Inter,Arial,sans-serif;color:rgba(14,74,91,.13);text-align:center;line-height:1.2}</style>
<div class="sn-marca-teste"><span>Feito no Safety Nexo<br/>Versão Teste</span></div>`;

// Ajusta o HTML ao plano de quem pediu: marca d'água no Grátis; sem a marca Safety Nexo no Ilimitado.
export function htmlDoPlano(html: string): string {
  const plano = planoAtual();
  if (!plano) return html;
  let saida = html;
  if (temRecurso(plano, 'semMarca')) saida = saida.replace(/Feito com o Safety Nexo[.,]\s?/g, '').replace(/(gerad[oa]s? |guardad[oa]s? )(pelo|no) Safety Nexo/g, '$1$2 sistema').replace(/no Safety Nexo/g, 'no sistema');
  if (!temRecurso(plano, 'logoEmpresa')) saida = saida.includes('</body>') ? saida.replace('</body>', `${MARCA_TESTE}</body>`) : saida + MARCA_TESTE;
  return saida;
}

// Faixa da pré-visualização: deixa claro que aquilo ainda não é o documento final.
const MARCA_PREVIA = `<style>.sn-previa{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999}
.sn-previa span{transform:rotate(-35deg);font:700 60px Inter,Arial,sans-serif;color:rgba(220,38,38,.12);text-align:center;line-height:1.2}
body{max-width:820px;margin-left:auto!important;margin-right:auto!important;background:#fff}
body.sn-documento{padding:0 28px}
.sn-documento .capa{width:auto;margin:0 -28px}</style>
<div class="sn-previa"><span>Pré-visualização<br/>ainda não é o documento</span></div>`;

// Documentos no padrão Safety Nexo trazem um bloco com título, empresa e logos (ver layout.ts).
export function lerConfig(html: string): ConfigDocumento | null {
  const m = html.match(/<script type="application\/json" id="sn-doc">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as ConfigDocumento;
  } catch {
    return null;
  }
}

// Código de validação: sigla do documento + 8 caracteres sem letras que confundem (0/O, 1/I).
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function novoCodigo(sigla: string): string {
  const b = randomBytes(8);
  const s = Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join('');
  const prefixo = sigla.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) || 'DOC';
  return `${prefixo}-${s.slice(0, 4)}-${s.slice(4)}`;
}
export const urlValidacao = (codigo: string) => `${WEB()}/validar-documento/${codigo}`;

const FONTE = `font-family: Inter, 'Liberation Sans', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact;`;

// Cabeçalho de todas as páginas: logo da empresa cliente, nome do documento e o selo com a sigla.
export function cabecalhoPagina(c: ConfigDocumento): string {
  return `<div style="${FONTE} width:100%; padding:0 15mm; font-size:8px; color:${COR.suave};">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:6mm; padding-bottom:2.2mm; border-bottom:0.3mm solid ${COR.linha}; position:relative;">
      <div style="display:flex; align-items:center; min-height:9mm;">${c.logoEmpresa ? `<img src="${c.logoEmpresa}" style="max-height:9mm; max-width:42mm;"/>` : `<strong style="color:${COR.petroleo}; font-size:9px;">${escape(c.empresa ?? '')}</strong>`}</div>
      <div style="display:flex; align-items:center; gap:3mm; text-align:right;">
        <div><div style="font-size:9px; font-weight:700; color:${COR.petroleo};">${escape(c.titulo)}</div>${c.empresa ? `<div>${escape(c.empresa)}</div>` : ''}</div>
        <span style="background:${DEGRADE}; color:#fff; font-weight:700; font-size:8px; letter-spacing:1px; padding:1.2mm 2.6mm; border-radius:3mm;">${escape(c.sigla)}</span>
      </div>
      <div style="position:absolute; left:0; bottom:-0.3mm; width:24mm; height:0.6mm; background:${DEGRADE};"></div>
    </div>
  </div>`;
}

// Rodapé de todas as páginas: logo da consultoria, responsável técnico, paginação e QR de validação.
// Sem o nome do sistema em nenhum plano (pedido do Rodrigo, 2026-11-26): o documento leva a marca da consultoria.
export function rodapePagina(c: ConfigDocumento, codigo: string, qr: string): string {
  return `<div style="${FONTE} width:100%; padding:0 15mm; font-size:7.2px; color:${COR.suave};">
    <div style="height:0.6mm; background:${DEGRADE}; border-radius:1mm; margin-bottom:2mm;"></div>
    <div style="display:flex; align-items:center; justify-content:space-between; gap:4mm;">
      <div style="flex:1; display:flex; align-items:center; gap:2.5mm; min-width:0;">
        ${c.consultoria.logo ? `<img src="${c.consultoria.logo}" style="max-height:8.5mm; max-width:26mm;"/>` : ''}
        <div style="line-height:1.35;"><div>Elaborado por <strong style="color:${COR.texto};">${escape(c.consultoria.nome)}</strong></div>${c.consultoria.responsavel ? `<div>Responsável técnico: ${escape(c.consultoria.responsavel)}</div>` : ''}</div>
      </div>
      <div style="flex:0 0 auto; text-align:center;">
        <div style="font-size:9px; font-weight:700; color:${COR.petroleo};">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
      </div>
      <div style="flex:1; display:flex; align-items:center; justify-content:flex-end; gap:2mm;">
        <div style="text-align:right; line-height:1.35;"><div>Código de validação</div><strong style="color:${COR.texto}; font-family:'Liberation Mono', monospace; font-size:8px;">${escape(codigo)}</strong><div>Aponte a câmera para conferir</div></div>
        <img src="${qr}" style="width:13mm; height:13mm;"/>
      </div>
    </div>
  </div>`;
}

// Rodapé de exemplo na pré-visualização (o de verdade só existe no PDF, com o código e o QR).
function rodapePrevia(c: ConfigDocumento): string {
  return `<div style="margin:30px 0 10px; padding-top:8px; border-top:3px solid; border-image:${DEGRADE} 1; font-size:10px; color:${COR.suave}; display:flex; justify-content:space-between; align-items:center; gap:12px;">
    <span>${c.consultoria.logo ? `<img src="${c.consultoria.logo}" style="height:26px; vertical-align:middle; margin-right:6px;"/>` : ''}Elaborado por <strong>${escape(c.consultoria.nome)}</strong></span>
    <span>Em todas as páginas do PDF: paginação, logo da consultoria e QR Code de validação.</span>
  </div>`;
}

@Injectable()
export class PdfService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async render(html: string, opcoes: { paisagem?: boolean } = {}): Promise<Buffer> {
    const config = lerConfig(html);
    // Na pré-visualização não abre o navegador: devolve a página pronta para mostrar na tela.
    if (emPrevia()) {
      let pagina = htmlDoPlano(html);
      if (config) {
        pagina = pagina
          .split(MARCA_CODIGO).join('gerado no PDF')
          .split(MARCA_QR).join('<span class="qr-previa">QR Code no PDF final</span>')
          .replace('</body>', `${rodapePrevia(config)}</body>`);
      }
      return Buffer.from(pagina.includes('</body>') ? pagina.replace('</body>', `${MARCA_PREVIA}</body>`) : pagina + MARCA_PREVIA, 'utf-8');
    }
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    try {
      if (!config) {
        const page = await browser.newPage();
        await page.setContent(htmlDoPlano(html), { waitUntil: 'load' });
        const pdf = await page.pdf({ format: 'A4', landscape: !!opcoes.paisagem, printBackground: true, margin: { top: '12mm', bottom: '12mm' } });
        return Buffer.from(pdf);
      }
      return await this.documento(browser, html, config, !!opcoes.paisagem);
    } finally {
      await browser.close();
    }
  }

  // Padrão Safety Nexo: capa sem cabeçalho e rodapé; o resto com cabeçalho, rodapé, paginação e QR em todas as páginas.
  private async documento(browser: Browser, html: string, config: ConfigDocumento, paisagem: boolean): Promise<Buffer> {
    const codigo = novoCodigo(config.sigla);
    const qr = await QRCode.toDataURL(urlValidacao(codigo), { margin: 0, width: 240, color: { dark: COR.petroleo, light: '#ffffff' } });
    const pronto = htmlDoPlano(html).split(MARCA_CODIGO).join(codigo).split(MARCA_QR).join(`<img src="${qr}" alt="QR Code de validação"/>`);
    const comEstilo = (css: string) => pronto.replace('</head>', `<style>${css}</style></head>`);

    const page = await browser.newPage();
    await page.setContent(comEstilo(config.capa ? '.capa{display:none!important}' : ''), { waitUntil: 'load' });
    const corpo = await page.pdf({
      format: 'A4', landscape: paisagem, printBackground: true, displayHeaderFooter: true,
      headerTemplate: cabecalhoPagina(config), footerTemplate: rodapePagina(config, codigo, qr),
      margin: { top: '25mm', bottom: '25mm', left: '15mm', right: '15mm' },
    });

    let final: Buffer = Buffer.from(corpo);
    if (config.capa) {
      await page.setContent(comEstilo('.sn-documento > :not(.capa){display:none!important} .capa{page-break-after:auto!important}'), { waitUntil: 'load' });
      const capa = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' }, pageRanges: '1' });
      const junto = await PDFDocument.create();
      for (const parte of [capa, corpo]) {
        const doc = await PDFDocument.load(parte);
        (await junto.copyPages(doc, doc.getPageIndices())).forEach((p) => junto.addPage(p));
      }
      junto.setTitle(config.titulo);
      junto.setProducer('Safety Nexo');
      final = Buffer.from(await junto.save());
    }

    // Guarda a emissão para a página pública de validação. Se falhar, o PDF sai assim mesmo.
    const paginas = (await PDFDocument.load(final)).getPageCount();
    await this.prisma?.documentoEmitido
      .create({ data: { codigo, titulo: config.titulo, empresa: config.empresa, consultoria: config.consultoria.nome, responsavel: config.consultoria.responsavel ?? null, paginas } })
      .catch(() => undefined);
    return final;
  }
}
