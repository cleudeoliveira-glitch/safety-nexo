import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer-core';
import { emPrevia, planoAtual, temRecurso } from '../common/plano';

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
body{max-width:820px;margin-left:auto!important;margin-right:auto!important;background:#fff}</style>
<div class="sn-previa"><span>Pré-visualização<br/>ainda não é o documento</span></div>`;

@Injectable()
export class PdfService {
  async render(html: string): Promise<Buffer> {
    // Na pré-visualização não abre o navegador: devolve a página pronta para mostrar na tela.
    if (emPrevia()) {
      const pagina = htmlDoPlano(html);
      return Buffer.from(pagina.includes('</body>') ? pagina.replace('</body>', `${MARCA_PREVIA}</body>`) : pagina + MARCA_PREVIA, 'utf-8');
    }
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
