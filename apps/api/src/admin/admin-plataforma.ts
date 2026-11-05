import { SetMetadata } from '@nestjs/common';

// Quem é dono da plataforma (painel ADM). Vem da variável PLATAFORMA_ADMINS (e-mails separados por vírgula).
// Sem a variável, vale o e-mail da fundadora. Nenhuma senha fica no código: ela entra com a conta normal.
const PADRAO = 'cleude.oliveira@gmail.com';

export function emailsAdmin(): string[] {
  return (process.env.PLATAFORMA_ADMINS ?? PADRAO)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const ehAdminPlataforma = (email: string) => emailsAdmin().includes(email.toLowerCase());

// Rotas só do dono da plataforma.
export const SOMENTE_ADMIN = 'somenteAdminPlataforma';
export const SomenteAdmin = () => SetMetadata(SOMENTE_ADMIN, true);
