import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

// A consultoria vem da sessão do usuário (token validado pelo AuthGuard).
export const ConsultoriaId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  const id = req.sessao?.consultoriaId;
  if (typeof id !== 'string' || id.length === 0) {
    throw new UnauthorizedException('Entre no sistema para continuar.');
  }
  return id;
});
