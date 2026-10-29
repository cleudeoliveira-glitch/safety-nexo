// Guarda o token de acesso no navegador.
const CHAVE = 'safety-nexo:token';

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function salvarToken(token: string) {
  try {
    localStorage.setItem(CHAVE, token);
  } catch {}
}

export function sair() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {}
  window.location.href = '/entrar';
}
