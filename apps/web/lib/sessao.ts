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

// Quem entrou: a consultoria vê todas as empresas; a empresa cliente vê só a dela.
export type Usuario = { nome: string; papel: 'CONSULTORIA' | 'EMPRESA'; empresaId: string | null };
const CHAVE_USUARIO = 'safety-nexo:usuario';

export function salvarUsuario(usuario: Usuario) {
  try {
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  } catch {}
}

export function lerUsuario(): Usuario | null {
  try {
    const bruto = localStorage.getItem(CHAVE_USUARIO);
    return bruto ? (JSON.parse(bruto) as Usuario) : null;
  } catch {
    return null;
  }
}

export const ehEmpresa = () => lerUsuario()?.papel === 'EMPRESA';

export function sair() {
  try {
    localStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE_USUARIO);
  } catch {}
  window.location.href = '/entrar';
}
