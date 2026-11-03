// Comparação de rostos: distância euclidiana entre descritores de 128 números (face-api.js).
// Quanto menor, mais parecido. Abaixo do limite (0,6 por padrão) é a mesma pessoa.
export function distancia(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export function menorDistancia(d: number[], amostras: number[][]) {
  return Math.min(...amostras.map((x) => distancia(d, x)));
}

export function descritorValido(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === 128 && d.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 10);
}

export function configFacial() {
  const limiar = Number(process.env.FACE_RECOGNITION_THRESHOLD ?? '0.6');
  return {
    ativo: process.env.FACE_API_ENABLED !== 'false',
    limiar: Number.isFinite(limiar) && limiar > 0 && limiar < 1.5 ? limiar : 0.6,
    consentimentoObrigatorio: process.env.LGPD_FACIAL_CONSENT_REQUIRED !== 'false',
  };
}

export const TEXTO_CONSENTIMENTO =
  'Autorizo o uso da minha biometria facial para confirmar entregas de EPI e minha presença em treinamentos e DDS, nos termos da Lei 13.709/2018 (LGPD). ' +
  'Sei que a foto do cadastro não é guardada, só um código numérico do rosto, e que posso retirar esta autorização a qualquer momento.';
