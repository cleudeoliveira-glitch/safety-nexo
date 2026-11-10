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
    sessionStorage.removeItem('safety-nexo:recursos'); // plano de outra conta
    localStorage.setItem(CHAVE, token);
  } catch {}
}

// Quem entrou: a consultoria vê todas as empresas; a empresa cliente vê só a dela.
export type Usuario = { nome: string; papel: 'CONSULTORIA' | 'EMPRESA'; empresaId: string | null; adminPlataforma?: boolean };
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
// Dono da plataforma: vê o painel ADM com todas as consultorias.
export const ehAdminPlataforma = () => lerUsuario()?.adminPlataforma === true;

export function sair() {
  try {
    localStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE_USUARIO);
    sessionStorage.removeItem('safety-nexo:recursos');
    localStorage.removeItem('safety-nexo:campo'); // lista de empresas guardada para o campo (o que falta enviar fica)
  } catch {}
  // Apaga também o código do rosto guardado para o campo.
  import('./rosto-offline').then((m) => m.esquecerRostosCampo()).catch(() => undefined).finally(() => { window.location.href = '/entrar'; });
}

// Limpa a sessão sem sair da tela (usado quando alguém quer entrar com outra conta no mesmo navegador).
export function esquecerSessao() {
  try {
    localStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE_USUARIO);
  } catch {}
}
