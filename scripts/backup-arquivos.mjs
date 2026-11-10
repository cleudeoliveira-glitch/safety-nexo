// Ajuda o backup (.github/workflows/backup.yml) a falar com o Supabase Storage.
//   node scripts/backup-arquivos.mjs arquivos <pasta>          baixa todos os arquivos do sistema para <pasta>
//   node scripts/backup-arquivos.mjs enviar <arquivo> <nome>   guarda <arquivo> no bucket de backups
// Usa SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Não precisa de nenhum pacote instalado.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const URL_SB = process.env.SUPABASE_URL?.replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? 'safety-nexo';
const BUCKET_BACKUP = process.env.SUPABASE_BUCKET_BACKUP ?? 'safety-nexo-backup';
if (!URL_SB || !CHAVE) throw new Error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

// Mesma regra do servidor (apps/api/src/common/guarda.ts): chave JWT vai também no Authorization.
const cabecalho = CHAVE.startsWith('eyJ') ? { Authorization: `Bearer ${CHAVE}`, apikey: CHAVE } : { apikey: CHAVE };
const caminhoUrl = (c) => c.split('/').map(encodeURIComponent).join('/');

async function pedir(url, opcoes = {}) {
  for (let tentativa = 1; ; tentativa++) {
    const r = await fetch(url, { ...opcoes, headers: { ...cabecalho, ...opcoes.headers } });
    if (r.ok || tentativa === 3 || r.status < 500) return r;
    await new Promise((ok) => setTimeout(ok, 2000 * tentativa));
  }
}

// O Storage lista uma pasta por vez: pastas vêm sem id, e aí entramos nelas.
async function listar(prefixo = '') {
  const achados = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await pedir(`${URL_SB}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: prefixo, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!r.ok) throw new Error(`Não consegui listar "${prefixo}" (${r.status}): ${await r.text()}`);
    const itens = await r.json();
    for (const i of itens) {
      const caminho = prefixo ? `${prefixo}/${i.name}` : i.name;
      if (i.id) achados.push(caminho);
      else achados.push(...(await listar(caminho)));
    }
    if (itens.length < 1000) return achados;
  }
}

async function baixarTudo(pasta) {
  const arquivos = await listar();
  let bytes = 0;
  for (const c of arquivos) {
    const r = await pedir(`${URL_SB}/storage/v1/object/${BUCKET}/${caminhoUrl(c)}`);
    if (!r.ok) throw new Error(`Não consegui baixar ${c} (${r.status})`);
    const conteudo = Buffer.from(await r.arrayBuffer());
    bytes += conteudo.length;
    await mkdir(dirname(join(pasta, c)), { recursive: true });
    await writeFile(join(pasta, c), conteudo);
  }
  console.log(`${arquivos.length} arquivo(s), ${(bytes / 1e6).toFixed(1)} MB.`);
}

async function enviar(arquivo, nome) {
  // Cria o bucket privado na primeira vez; se já existe, o Supabase só recusa e seguimos.
  await pedir(`${URL_SB}/storage/v1/bucket`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET_BACKUP, name: BUCKET_BACKUP, public: false }),
  });
  const r = await pedir(`${URL_SB}/storage/v1/object/${BUCKET_BACKUP}/${caminhoUrl(nome)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' },
    body: await readFile(arquivo),
  });
  if (!r.ok) throw new Error(`O Supabase recusou a cópia (${r.status}): ${await r.text()}`);
  console.log(`Guardado em ${BUCKET_BACKUP}/${nome}.`);
}

const [acao, a, b] = process.argv.slice(2);
if (acao === 'arquivos' && a) await baixarTudo(a);
else if (acao === 'enviar' && a && b) await enviar(a, b);
else throw new Error('Uso: arquivos <pasta> | enviar <arquivo> <nome>');
