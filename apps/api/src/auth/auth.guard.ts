import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ehAdminPlataforma, SOMENTE_ADMIN } from '../admin/admin-plataforma';
import { caixaPlano, mensagemUpgrade, planoEfetivo, Recurso, RECURSO, temRecurso } from '../common/plano';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { PERMITE_EMPRESA } from './permite-empresa.decorator';
import { ROTA_PUBLICA } from './publica.decorator';

// Toda rota exige o token "Bearer", exceto as marcadas com @Publica().
// O login da empresa cliente só usa rotas marcadas com @PermiteEmpresa() e só da própria empresa.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ROTA_PUBLICA, alvos)) return true;

    const req = ctx.switchToHttp().getRequest();
    const [tipo, token] = String(req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Entre no sistema para continuar.');
    let sub: string;
    try {
      sub = this.auth.verificar(token).sub;
    } catch {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }

    // Lê o usuário a cada pedido: um acesso removido para de funcionar na hora.
    const usuario = await this.prisma.usuario.findUnique({ where: { id: sub }, include: { consultoria: { select: { bloqueada: true, plano: true, testeAte: true, usuarios: { where: { papel: 'CONSULTORIA' }, select: { email: true } } } } } });
    if (!usuario) throw new UnauthorizedException('Seu acesso foi removido. Fale com a sua consultoria.');
    const admin = usuario.papel === 'CONSULTORIA' && ehAdminPlataforma(usuario.email);
    // Consultoria bloqueada pelo painel ADM para de funcionar na hora (inclusive o login das empresas dela).
    if (usuario.consultoria.bloqueada && !admin) {
      throw new ForbiddenException('Este acesso está suspenso. Fale com o suporte do Safety Nexo.');
    }
    // Plano que vale agora (teste de 14 dias, plano pago ou consultoria do dono da plataforma).
    const plano = planoEfetivo(usuario.consultoria, usuario.consultoria.usuarios.some((u) => ehAdminPlataforma(u.email)));
    const caixa = caixaPlano.getStore();
    if (caixa) caixa.plano = plano;
    req.sessao = { sub: usuario.id, consultoriaId: usuario.consultoriaId, papel: usuario.papel, empresaId: usuario.empresaId, admin, plano };

    // Último acesso (para o painel ADM), gravado no máximo uma vez por hora.
    if (!usuario.ultimoAcesso || Date.now() - usuario.ultimoAcesso.getTime() > 3600_000) {
      this.prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } }).catch(() => undefined);
    }

    const exige = this.reflector.getAllAndOverride<{ r: Recurso; oQue: string } | undefined>(RECURSO, alvos);
    if (exige && !temRecurso(plano, exige.r)) throw new ForbiddenException(mensagemUpgrade(exige.r, exige.oQue));

    if (this.reflector.getAllAndOverride<boolean>(SOMENTE_ADMIN, alvos)) {
      if (!admin) throw new ForbiddenException('Esta área é só do administrador da plataforma.');
      return true;
    }
    if (usuario.papel !== 'EMPRESA') return true;

    if (!this.reflector.getAllAndOverride<boolean>(PERMITE_EMPRESA, alvos)) {
      throw new ForbiddenException('Esta parte é feita pela sua consultoria.');
    }
    const empresaDaRota = req.params?.empresaId ?? String(req.path ?? '').match(/^\/empresas\/([^/]+)/)?.[1];
    if (empresaDaRota && empresaDaRota !== usuario.empresaId) throw new ForbiddenException('Você só tem acesso à sua empresa.');
    return true;
  }
}
