// Importa a tabela da NR-04 Anexo I para o banco.
// Uso: pdftotext -layout nr-04.pdf nr04.txt && node scripts/importar-nr04.js nr04.txt
// Requer o build da API (usa dist/cnae/cnae.js) e DATABASE_URL.
const { readFileSync } = require('fs');
const { PrismaClient } = require('@prisma/client');
const { extrairLinhasNr04 } = require('../dist/cnae/cnae');

async function main() {
  const arquivo = process.argv[2];
  if (!arquivo) throw new Error('Informe o arquivo de texto da NR-04.');
  const linhas = extrairLinhasNr04(readFileSync(arquivo, 'utf8'));
  if (linhas.length === 0) throw new Error('Nenhuma linha "XX.XX-X Denominação GR" encontrada no arquivo.');

  const prisma = new PrismaClient();
  for (const linha of linhas) {
    await prisma.cnaeGrauRisco.upsert({ where: { classe: linha.classe }, create: linha, update: linha });
  }
  await prisma.$disconnect();
  console.log(`${linhas.length} classes CNAE importadas.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
