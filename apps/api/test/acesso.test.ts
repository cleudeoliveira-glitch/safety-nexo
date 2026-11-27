// Separação dos dados: o login da empresa cliente só entra na própria empresa e só nas telas liberadas.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../src/auth/auth.guard';
import { PERMITE_EMPRESA } from '../src/auth/permite-empresa.decorator';
import { ROTA_PUBLICA } from '../src/auth/publica.decorator';
import { SOMENTE_ADMIN } from '../src/admin/admin-plataforma';
import { SO_DONO } from '../src/auth/so-dono.decorator';

type Usuario = { id: string; email: string; papel: string; empresaId: string | null; bloqueada?: boolean; dono?: boolean; senhaHash?: string };

function guarda(usuario: Usuario | null, marcas: Record<string, unknown> = {}, marcaSenha?: string) {
  const auth = { verificar: (t: string) => { if (t !== 'ok') throw new Error('token ruim'); return { sub: 'u1', s: marcaSenha }; } };
  const reflector = { getAllAndOverride: (chave: string) => marcas[chave] };
  const prisma = {
    usuario: {
      findUnique: async () => usuario && {
        senhaHash: 'hash-da-senha-atual-1234', ...usuario, consultoriaId: 'c1', ultimoAcesso: new Date(),
        consultoria: { id: 'c1', limiteEmpresas: 100000, empresasAtivas: [], bloqueada: !!usuario.bloqueada, plano: 'ENTERPRISE', testeAte: null, planoPagoAte: null, assinaturaStatus: null, usuarios: [{ email: 'dono@consultoria.com' }] },
      },
      update: async () => ({}),
    },
  };
  return new AuthGuard(auth as never, reflector as never, prisma as never);
}

function pedido(caminho: string, token = 'ok', metodo = 'GET', params: Record<string, string> = {}) {
  const req = { headers: { authorization: `Bearer ${token}` }, method: metodo, path: caminho, params };
  return { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req }) } as never;
}

const consultoria: Usuario = { id: 'u1', email: 'dono@consultoria.com', papel: 'CONSULTORIA', empresaId: null };
const cliente: Usuario = { id: 'u1', email: 'rh@cliente.com', papel: 'EMPRESA', empresaId: 'emp-A' };

test('Sem entrar no sistema, nada abre (só rotas públicas)', async () => {
  await assert.rejects(guarda(consultoria).canActivate(pedido('/empresas', 'ruim')), UnauthorizedException);
  assert.equal(await guarda(null, { [ROTA_PUBLICA]: true }).canActivate(pedido('/validar/x', '')), true);
});

test('Acesso removido para de funcionar na hora', async () => {
  await assert.rejects(guarda(null).canActivate(pedido('/empresas')), UnauthorizedException);
});

test('Consultoria bloqueada no painel ADM não entra', async () => {
  await assert.rejects(guarda({ ...consultoria, bloqueada: true }).canActivate(pedido('/empresas')), ForbiddenException);
});

test('Login da empresa cliente não abre a empresa de outro cliente', async () => {
  const marcas = { [PERMITE_EMPRESA]: true };
  assert.equal(await guarda(cliente, marcas).canActivate(pedido('/empresas/emp-A/colaboradores')), true);
  await assert.rejects(guarda(cliente, marcas).canActivate(pedido('/empresas/emp-B/colaboradores')), ForbiddenException);
  await assert.rejects(guarda(cliente, marcas).canActivate(pedido('/x', 'ok', 'GET', { empresaId: 'emp-B' })), ForbiddenException);
});

test('Login da empresa cliente não usa telas só da consultoria', async () => {
  await assert.rejects(guarda(cliente).canActivate(pedido('/empresas/emp-A/excluir', 'ok', 'POST')), ForbiddenException);
});

test('Painel ADM é só da dona da plataforma', async () => {
  await assert.rejects(guarda(consultoria, { [SOMENTE_ADMIN]: true }).canActivate(pedido('/admin')), ForbiddenException);
});

test('Técnico da equipe não mexe em plano, pagamento nem equipe; o dono mexe', async () => {
  const tecnico: Usuario = { id: 'u1', email: 'tecnico@consultoria.com', papel: 'CONSULTORIA', empresaId: null, dono: false };
  await assert.rejects(guarda(tecnico, { [SO_DONO]: true }).canActivate(pedido('/equipe', 'ok', 'POST')), ForbiddenException);
  assert.equal(await guarda(tecnico).canActivate(pedido('/empresas/e1/ghes', 'ok', 'POST')), true);
  assert.equal(await guarda({ ...tecnico, dono: true }, { [SO_DONO]: true }).canActivate(pedido('/equipe', 'ok', 'POST')), true);
});

test('Senha trocada: a sessão aberta em outro aparelho deixa de valer', async () => {
  const atual = 'hash-da-senha-atual-1234'.slice(-12);
  assert.equal(await guarda(consultoria, {}, atual).canActivate(pedido('/empresas')), true);
  await assert.rejects(guarda(consultoria, {}, 'marca-antiga!').canActivate(pedido('/empresas')), UnauthorizedException);
  assert.equal(await guarda(consultoria, {}, undefined).canActivate(pedido('/empresas')), true); // sessões antigas, sem marca
});
