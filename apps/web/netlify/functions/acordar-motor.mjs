// Mantém o motor (servidor gratuito do Render) acordado no horário de uso.
// Parado por uns 15 minutos, ele "dorme" e o primeiro cliente espera até 1 minuto para entrar.
// Roda a cada 10 minutos, das 6h às 22h de Brasília (9h às 0h59 UTC). Fora disso ele pode dormir,
// o que também economiza as horas gratuitas do Render.
const MOTOR = process.env.NEXT_PUBLIC_API_URL || 'https://safety-nexo-api.onrender.com';

export default async () => {
  const inicio = Date.now();
  try {
    const res = await fetch(`${MOTOR}/health`, { signal: AbortSignal.timeout(90_000) });
    return new Response(`motor ${res.status} em ${Date.now() - inicio} ms`);
  } catch (e) {
    return new Response(`motor sem resposta: ${e?.message ?? e}`, { status: 502 });
  }
};

export const config = { schedule: '*/10 0,9-23 * * *' };
