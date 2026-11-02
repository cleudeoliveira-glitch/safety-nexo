import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type SessaoUsuario = { sub: string; consultoriaId: string; papel: 'CONSULTORIA' | 'EMPRESA'; empresaId: string | null };

// Sessão completa montada pelo AuthGuard (quem é, de qual consultoria e, se for empresa, qual).
export const Sessao = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessaoUsuario => ctx.switchToHttp().getRequest().sessao);
