import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { comparar } from '../src/historico/antes-depois';
import { emailDoResponsavel } from '../src/prevencao/aviso-responsavel';

test('antes e depois: só os campos que mudaram, com nome que a consultora entende', () => {
  const m = comparar('GheRisco', { agente: 'Ruído', severidade: '3', probabilidade: '4', medidasEpi: null, esocial: { a: 1 } }, { agente: 'Ruído', severidade: '3', probabilidade: '2', medidasEpi: 'Protetor auricular', esocial: { a: 2 } });
  assert.ok(m);
  assert.equal(m.tipo, 'Risco');
  assert.equal(m.rotulo, 'Ruído');
  assert.deepEqual(m.campos, [
    { campo: 'EPI', antes: '(vazio)', depois: 'Protetor auricular' },
    { campo: 'Probabilidade', antes: '4', depois: '2' },
  ]);
});

test('antes e depois: datas, listas e sim/não ficam legíveis; nada mudou = nada gravado', () => {
  const m = comparar('Aso', { tipo: 'PERIODICO', proximoExame: new Date('2026-01-10T00:00:00Z'), exames: ['Audiometria'] }, { tipo: 'PERIODICO', proximoExame: new Date('2027-01-10T00:00:00Z'), exames: ['Audiometria', 'Hemograma'] });
  assert.ok(m);
  assert.deepEqual(m.campos.map((c) => [c.campo, c.antes, c.depois]), [['Exames', 'Audiometria', 'Audiometria, Hemograma'], ['Próximo exame', '10/01/2026', '10/01/2027']]);
  assert.equal(comparar('AcaoCorretiva', { status: 'ABERTA' }, { status: 'ABERTA' }), null);
  assert.equal(comparar('Usuario', { nome: 'a' }, { nome: 'b' }), null);
});

test('lembrete ao responsável: diz o que fazer, marca atraso e escapa o texto', () => {
  const hoje = new Date('2026-12-10T12:00:00Z');
  const base = { local: 'Produção', responsavel: 'João Silva', responsavelEmail: 'joao@x.com', empresa: 'Padaria <Boa>', consultoria: 'Cons' };
  const um = emailDoResponsavel([{ ...base, id: '1', descricao: 'Trocar proteção', prazo: new Date('2026-12-12T00:00:00Z') }], hoje);
  assert.match(um.assunto, /12\/12\/2026/);
  assert.match(um.html, /Olá, João/);
  assert.match(um.html, /Padaria &lt;Boa&gt;/);
  assert.doesNotMatch(um.html, /vencido/);
  const dois = emailDoResponsavel([{ ...base, id: '1', descricao: 'A', prazo: new Date('2026-12-01T00:00:00Z') }, { ...base, id: '2', descricao: 'B', prazo: new Date('2026-12-12T00:00:00Z') }], hoje);
  assert.match(dois.assunto, /2 ações/);
  assert.match(dois.html, /Prazo vencido em 01\/12\/2026/);
});

import { paraCsv } from '../src/painel/agenda';
import { normalizar } from '../src/painel/busca';

test('planilha: abre certo no Excel e não deixa fórmula escondida', () => {
  const csv = paraCsv([['Empresa', 'O que fazer'], ['Padaria; Pão', '=1+1'], ['Aspas "x"', 'ok']]);
  assert.ok(csv.startsWith('﻿'));
  assert.equal(csv.slice(1), 'Empresa;O que fazer\r\n"Padaria; Pão";\'=1+1\r\n"Aspas ""x""";ok\r\n');
});

test('busca: acento e maiúscula não importam', () => {
  assert.equal(normalizar('JOÃO Conceição'), 'joao conceicao');
});

import { liberadoForaDoPlano, proximaTroca } from '../src/common/empresas-ativas';

test('empresas ativas: troca uma vez por mês e excluir a empresa continua liberado', () => {
  const hoje = new Date('2026-12-10T12:00:00Z');
  assert.equal(proximaTroca(null, hoje), null);
  assert.equal(proximaTroca(new Date('2026-11-01T12:00:00Z'), hoje), null);
  assert.equal(proximaTroca(new Date('2026-12-01T12:00:00Z'), hoje)?.toISOString(), '2026-12-31T12:00:00.000Z');
  assert.ok(liberadoForaDoPlano('/empresas/abc/excluir'));
  assert.ok(!liberadoForaDoPlano('/empresas/abc/colaboradores'));
});
