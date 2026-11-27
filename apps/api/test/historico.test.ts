// O registro de alterações nunca pode derrubar o motor, mesmo se o banco falhar na hora de gravar.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { lastValueFrom, of } from 'rxjs';
import { HistoricoInterceptor } from '../src/historico/historico.interceptor';

test('Falha ao gravar o registro só vira aviso, sem erro solto', async () => {
  const soltos: unknown[] = [];
  const pegar = (e: unknown) => soltos.push(e);
  process.on('unhandledRejection', pegar);
  const prisma = { usuario: { findUnique: async () => { throw new Error('banco fora do ar'); } } };
  const i = new HistoricoInterceptor(prisma as never);
  (i as unknown as { log: { warn: () => void } }).log = { warn: () => undefined };
  const req = { method: 'POST', baseUrl: '', route: { path: '/empresas/:empresaId/ghes' }, path: '/empresas/e1/ghes', params: { empresaId: 'e1' }, headers: {}, sessao: { sub: 'u1', consultoriaId: 'c1', papel: 'CONSULTORIA' } };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as never;
  await lastValueFrom(i.intercept(ctx, { handle: () => of({ ok: true }) }));
  await new Promise((r) => setTimeout(r, 50));
  process.off('unhandledRejection', pegar);
  assert.equal(soltos.length, 0);
});
