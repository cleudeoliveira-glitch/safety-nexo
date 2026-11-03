// Reconhecimento facial no próprio navegador, com face-api.js (código aberto, sem custo).
// O navegador só calcula o "código do rosto" (128 números). Quem compara é o servidor.
type FaceApi = typeof import('@vladmandic/face-api');
let carregando: Promise<FaceApi> | null = null;

export function carregarFaceApi(): Promise<FaceApi> {
  if (!carregando) {
    carregando = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      // Tipos do tfjs embutido não vêm completos no pacote.
      const tf = faceapi.tf as unknown as { setBackend: (b: string) => Promise<boolean>; getBackend: () => string; ready: () => Promise<void> };
      try { await tf.setBackend('webgl'); } catch { /* sem placa de vídeo */ }
      if (tf.getBackend() !== 'webgl') await tf.setBackend('cpu');
      await tf.ready();
      const pasta = '/modelos-rosto';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(pasta),
        faceapi.nets.faceLandmark68Net.loadFromUri(pasta),
        faceapi.nets.faceRecognitionNet.loadFromUri(pasta),
      ]);
      return faceapi;
    })().catch((e) => { carregando = null; throw e; });
  }
  return carregando;
}

export type Leitura = { descritor: number[]; confianca: number; olhos: number; caixa: { x: number; y: number; w: number; h: number } };

// Abertura dos olhos (EAR): cai perto de zero quando a pessoa pisca. Pontos 36-41 e 42-47 do modelo de 68 pontos.
type P = { x: number; y: number };
const d2 = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const ear = (o: P[]) => (d2(o[1], o[5]) + d2(o[2], o[4])) / (2 * d2(o[0], o[3]));
export const aberturaOlhos = (pts: P[]) => (ear(pts.slice(36, 42)) + ear(pts.slice(42, 48))) / 2;

export async function lerRosto(video: HTMLVideoElement): Promise<Leitura | null | 'varios'> {
  const faceapi = await carregarFaceApi();
  const opcoes = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const todos = await faceapi.detectAllFaces(video, opcoes);
  if (todos.length > 1) return 'varios';
  if (todos.length === 0) return null;
  const r = await faceapi.detectSingleFace(video, opcoes).withFaceLandmarks().withFaceDescriptor();
  if (!r) return null;
  const b = r.detection.box;
  return { descritor: Array.from(r.descriptor), confianca: r.detection.score, olhos: aberturaOlhos(r.landmarks.positions), caixa: { x: b.x, y: b.y, w: b.width, h: b.height } };
}

export function distancia(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export function media(ds: number[][]) {
  return ds[0].map((_, i) => ds.reduce((s, d) => s + d[i], 0) / ds.length);
}

// Foto pequena (320 px) para o comprovante.
export function fotografar(video: HTMLVideoElement, largura = 320) {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = Math.round((video.videoHeight / video.videoWidth) * largura) || 240;
  c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

export function localizacao(): Promise<{ latitude?: number; longitude?: number; precisao?: number }> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok({});
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }),
      () => ok({}),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
    );
  });
}

// Piscada: os olhos fecham (abertura cai a menos de 70% do normal) e abrem de novo.
export class DetectorPiscada {
  private normal: number[] = [];
  private fechou = false;
  ler(olhos: number): boolean {
    const base = this.normal.length >= 2 ? [...this.normal].sort((a, b) => a - b)[Math.floor(this.normal.length / 2)] : null;
    if (base && olhos < base * 0.7) { this.fechou = true; return false; }
    if (base && this.fechou && olhos > base * 0.85) return true;
    if (!this.fechou) { this.normal.push(olhos); if (this.normal.length > 8) this.normal.shift(); }
    return false;
  }
}

const CHAVE_CFG = 'safety-nexo:rosto-config';
export async function configRosto(): Promise<{ provaDeVida: boolean; ativo: boolean }> {
  try {
    const { rosto } = await import('./api');
    const c = await rosto.config();
    try { localStorage.setItem(CHAVE_CFG, JSON.stringify(c)); } catch { /* nada */ }
    return c;
  } catch {
    try { const b = localStorage.getItem(CHAVE_CFG); if (b) return JSON.parse(b); } catch { /* nada */ }
    return { provaDeVida: true, ativo: true };
  }
}
