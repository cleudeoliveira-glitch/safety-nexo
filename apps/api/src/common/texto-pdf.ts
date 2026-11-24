import { execFile } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (b: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js');

// Lê o texto do PDF com o pdftotext (poppler-utils, instalar no servidor), que respeita os espaços das tabelas
// e separa as páginas com \f. Sem ele, usa o pdf-parse, que é pior mas não precisa de nada instalado.
export function textoDoPdf(pdf: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const p = execFile('pdftotext', ['-layout', '-enc', 'UTF-8', '-', '-'], { maxBuffer: 20_000_000, timeout: 60_000 }, (erro, saida) => {
      if (!erro) return resolve(saida);
      pdfParse(pdf).then((r) => resolve(r.text)).catch(() => resolve(''));
    });
    p.stdin?.on('error', () => undefined);
    p.stdin?.end(pdf);
  });
}
