import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer-core';
import { planoAtual, temRecurso } from '../common/plano';

// Plano Grátis: o PDF sai com a marca "Versão Teste" em todas as páginas.
const MARCA_TESTE = `<style>.sn-marca-teste{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999}
.sn-marca-teste span{transform:rotate(-35deg);font:700 54px Inter,Arial,sans-serif;color:rgba(14,74,91,.13);text-align:center;line-height:1.2}</style>
<div class="sn-marca-teste"><span>Feito no Safety Nexo<br/>Versão Teste</span></div>`;

// Ajusta o HTML ao plano de quem pediu: marca d'água no Grátis; sem a marca Safety Nexo no Ilimitado.
export function htmlDoPlano(html: string): string {
  const plano = planoAtual();
  if (!plano) return html;
  let saida = html;
  if (temRecurso(plano, 'semMarca')) saida = saida.replace(/(gerad[oa]s? |guardad[oa]s? )(pelo|no) Safety Nexo/g, '$1$2 sistema').replace(/no Safety Nexo/g, 'no sistema');
  if (!temRecurso(plano, 'logoEmpresa')) saida = saida.includes('</body>') ? saida.replace('</body>', `${MARCA_TESTE}</body>`) : saida + MARCA_TESTE;
  return saida;
}

@Injectable()
export class PdfService {
  async render(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(htmlDoPlano(html), { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm' } });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
