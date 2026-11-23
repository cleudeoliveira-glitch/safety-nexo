import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

// Onde ficam os arquivos (logos e documentos).
// Com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY: no Supabase Storage (bucket privado), que não se perde quando o servidor reinicia.
// Sem elas: numa pasta do disco (uso local).

// Endereço do Supabase (https://<ref>.supabase.co). Se o SUPABASE_URL do Render estiver vazio ou com um texto
// que não é endereço (já aconteceu de colarem a dica "Project Settings > API > Project URL."), o endereço é
// montado a partir do DATABASE_URL, que no pooler do Supabase traz o ref no usuário (postgres.<ref>).
export function enderecoSupabase(env: NodeJS.ProcessEnv = process.env): { url?: string; aviso?: string } {
  const bruto = env.SUPABASE_URL?.trim();
  if (bruto) {
    try {
      const u = new URL(bruto);
      if (u.protocol === 'https:' || u.protocol === 'http:') return { url: u.origin };
    } catch { /* não é endereço: tenta o DATABASE_URL abaixo */ }
  }
  const ref = refDoBanco(env.DATABASE_URL);
  const url = ref ? `https://${ref}.supabase.co` : undefined;
  if (!bruto) return { url };
  const errado = `o SUPABASE_URL no Render está "${bruto.slice(0, 60)}", que não é um endereço (o certo é https://xxxx.supabase.co)`;
  return { url, aviso: url ? `Usando ${url}, tirado do DATABASE_URL, porque ${errado}.` : `Não dá para guardar arquivos: ${errado}.` };
}

function refDoBanco(dbUrl?: string): string | undefined {
  if (!dbUrl) return undefined;
  try {
    const u = new URL(dbUrl);
    const doUsuario = /^postgres\.([a-z0-9]{15,30})$/i.exec(decodeURIComponent(u.username))?.[1];
    const doHost = /^db\.([a-z0-9]{15,30})\.supabase\.co$/i.exec(u.hostname)?.[1];
    return (doUsuario ?? doHost)?.toLowerCase();
  } catch { return undefined; }
}

const ENDERECO = enderecoSupabase();
const URL_SB = ENDERECO.url;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const BUCKET = process.env.SUPABASE_BUCKET ?? 'safety-nexo';
export const guardaNaNuvem = !!(URL_SB && CHAVE);
if (ENDERECO.aviso) console.warn(`[guarda] ${ENDERECO.aviso}`);

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

// Diagnóstico: o Supabase Storage responde e a pasta (bucket) existe?
export async function conferirGuarda(): Promise<{ ok: boolean; motivo: string }> {
  if (!guardaNaNuvem) {
    if (CHAVE && ENDERECO.aviso) return { ok: false, motivo: ENDERECO.aviso };
    return { ok: false, motivo: 'Sem SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY: os arquivos ficam no disco do servidor e somem quando ele reinicia.' };
  }
  const obs = ENDERECO.aviso ? ` Funciona, mas vale corrigir: ${ENDERECO.aviso}` : '';
  try {
    const r = await fetch(`${URL_SB}/storage/v1/bucket/${BUCKET}`, { headers: cabecalho(), signal: AbortSignal.timeout(8000) });
    if (r.ok) return { ok: true, motivo: `Pasta "${BUCKET}" do Supabase Storage respondendo.${obs}` };
    if (r.status === 404 || r.status === 400) return { ok: true, motivo: `A pasta "${BUCKET}" ainda não existe; ela é criada sozinha no primeiro arquivo enviado.${obs}` };
    if (r.status === 401 || r.status === 403) return { ok: false, motivo: `O Supabase recusou a chave (${r.status}). Confira se o SUPABASE_SERVICE_ROLE_KEY no Render é a chave secreta (service_role ou sb_secret_...) do mesmo projeto de ${URL_SB}.` };
    return { ok: false, motivo: `O Supabase Storage respondeu ${r.status}: ${(await r.text()).slice(0, 200)}` };
  } catch (e) {
    return { ok: false, motivo: `O Supabase Storage não respondeu: ${(e as Error).message}` };
  }
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
