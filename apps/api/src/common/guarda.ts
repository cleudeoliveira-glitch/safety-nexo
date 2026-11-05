import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

// Onde ficam os arquivos (logos e documentos).
// Com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY: no Supabase Storage (bucket privado), que não se perde quando o servidor reinicia.
// Sem elas: numa pasta do disco (uso local).
const URL_SB = process.env.SUPABASE_URL?.replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? 'safety-nexo';
export const guardaNaNuvem = !!(URL_SB && CHAVE);

// Chave antiga (JWT "eyJ..."): vai também no Authorization. Chave nova (sb_secret_...): só no apikey,
// porque o Supabase recusa no Authorization o que não é JWT.
const cabecalho = (): Record<string, string> => (CHAVE!.startsWith('eyJ') ? { Authorization: `Bearer ${CHAVE}`, apikey: CHAVE! } : { apikey: CHAVE! });
const urlObjeto = (caminho: string) => `${URL_SB}/storage/v1/object/${BUCKET}/${caminho.split('/').map(encodeURIComponent).join('/')}`;

let bucketPronto: Promise<void> | null = null;
function garantirBucket() {
  bucketPronto ??= fetch(`${URL_SB}/storage/v1/bucket`, {
    method: 'POST', headers: { ...cabecalho(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  }).then(() => undefined).catch(() => { bucketPronto = null; });
  return bucketPronto;
}

export class Guarda {
  constructor(private readonly prefixo: string, private readonly pastaLocal: string) {}

  async gravar(caminho: string, conteudo: Buffer, mime = 'application/octet-stream') {
    if (guardaNaNuvem) {
      await garantirBucket();
      const r = await fetch(urlObjeto(`${this.prefixo}/${caminho}`), { method: 'POST', headers: { ...cabecalho(), 'Content-Type': mime, 'x-upsert': 'true' }, body: new Uint8Array(conteudo) });
      if (!r.ok) throw new Error(`Supabase Storage recusou o arquivo (${r.status}): ${await r.text()}`);
      return;
    }
    const destino = join(this.pastaLocal, caminho);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, conteudo);
  }

  async ler(caminho: string): Promise<Buffer> {
    if (guardaNaNuvem) {
      const r = await fetch(urlObjeto(`${this.prefixo}/${caminho}`), { headers: cabecalho() });
      if (!r.ok) throw new Error(`arquivo não encontrado no Supabase Storage (${r.status})`);
      return Buffer.from(await r.arrayBuffer());
    }
    return readFile(join(this.pastaLocal, caminho));
  }

  async apagar(caminho: string) {
    if (guardaNaNuvem) { await fetch(urlObjeto(`${this.prefixo}/${caminho}`), { method: 'DELETE', headers: cabecalho() }); return; }
    await unlink(join(this.pastaLocal, caminho));
  }
}
