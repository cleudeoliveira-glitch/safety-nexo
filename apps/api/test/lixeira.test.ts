// Lixeira: o que é excluído volta com tudo o que saiu junto. Precisa de um banco de teste vazio:
// TESTE_BANCO=postgresql://... npm test (sem a variável, o teste é pulado, como na conferência do GitHub).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { caixaPlano } from '../src/common/plano';
import { Arvore, contar, devolver } from '../src/lixeira/arvore';

const banco = process.env.TESTE_BANCO;

test('Colaborador excluído volta com ASO, entrega de EPI e a ligação com o GHE', { skip: !banco }, async () => {
  process.env.DATABASE_URL = banco;
  const { PrismaService } = await import('../src/prisma/prisma.service');
  const prisma = new PrismaService();
  const c = await prisma.consultoria.create({ data: { nome: 'Teste Lixeira' } });
  const e = await prisma.empresa.create({ data: { consultoriaId: c.id, razaoSocial: 'Padaria Teste', cnpj: '11222333000181' } });
  const g = await prisma.ghe.create({ data: { empresaId: e.id, nome: 'Produção' } });
  const col = await prisma.colaborador.create({ data: { empresaId: e.id, nome: 'Maria Teste', cargo: 'Padeira', gheId: g.id } });
  await prisma.aso.create({ data: { colaboradorId: col.id, tipo: 'ADMISSIONAL', dataExame: new Date('2026-01-10'), resultado: 'APTO', medicoExaminadorNome: 'Dr. A', medicoExaminadorCrm: '123', exames: ['Clínico'], riscos: [] } });
  await prisma.entregaEpi.create({ data: { colaboradorId: col.id, epi: 'Luva', ca: '12345', quantidade: 1, motivo: 'ENTREGA_INICIAL', dataEntrega: new Date('2026-01-10') } });

  // 1) Exclusão do colaborador dentro de um pedido DELETE
  const caixa = { lixeira: { arvores: [] as unknown[], arquivos: [] } };
  await caixaPlano.run(caixa, async () => { await prisma.colaborador.delete({ where: { id: col.id } }); });
  assert.equal(await prisma.aso.count({ where: { colaboradorId: col.id } }), 0);
  const arvores = caixa.lixeira.arvores as Arvore[];
  assert.equal(contar(arvores), 3); // colaborador + ASO + entrega

  // 2) Exclusão do GHE: o colaborador (se existisse) perderia a ligação; aqui conferimos que o GHE volta e religa
  const caixaGhe = { lixeira: { arvores: [] as unknown[], arquivos: [] } };
  await prisma.$transaction((tx) => devolver(tx, arvores[0]));
  await caixaPlano.run(caixaGhe, async () => { await prisma.ghe.delete({ where: { id: g.id } }); });
  assert.equal((await prisma.colaborador.findUnique({ where: { id: col.id } }))?.gheId, null);
  await prisma.$transaction(async (tx) => { for (const a of [...(caixaGhe.lixeira.arvores as Arvore[])].reverse()) await devolver(tx, a); });

  const volta = await prisma.colaborador.findUnique({ where: { id: col.id }, include: { asos: true, entregasEpi: true } });
  assert.equal(volta?.nome, 'Maria Teste');
  assert.equal(volta?.asos.length, 1);
  assert.equal(volta?.asos[0].exames[0], 'Clínico');
  assert.equal(volta?.entregasEpi.length, 1);
  assert.equal(volta?.gheId, g.id);

  // 3) Fora de um pedido DELETE nada é guardado (limpezas internas do sistema)
  await prisma.consultoria.delete({ where: { id: c.id } });
  await prisma.$disconnect();
});
