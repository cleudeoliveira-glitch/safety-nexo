// Regras de SST que não podem mudar sem querer. Cada teste cita a norma que a regra segue.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { dimensionarCipa } from '../src/cipa/dimensionamento';
import { prazoCat } from '../src/saude/prazo-cat';
import { dispensaDemissional, proximoExame } from '../src/colaboradores/regras';
import { nivelRisco } from '../src/documentos/nivel-risco';
import { cnpjValido, cpfValido } from '../src/common/documentos-br';

test('CIPA (NR-05, Quadro I): grau 3 com 60 empregados tem 2 efetivos e 1 suplente', () => {
  assert.deepEqual(dimensionarCipa(3, 60), { situacao: 'CIPA', efetivos: 2, suplentes: 1 });
});

test('CIPA (NR-05, 5.4.13): abaixo do Quadro I a empresa nomeia um representante', () => {
  assert.equal(dimensionarCipa(1, 50).situacao, 'REPRESENTANTE');
  assert.equal(dimensionarCipa(null, 50).situacao, 'SEM_GRAU');
});

test('CIPA (NR-05, Quadro I): acima de 10.000, cada grupo completo de 2.500 acrescenta', () => {
  assert.deepEqual(dimensionarCipa(4, 15_000), { situacao: 'CIPA', efetivos: 13 + 2 * 2, suplentes: 10 + 2 * 2 });
});

test('CAT (Lei 8.213/91, art. 22): acidente na sexta vence na segunda; com morte, na hora', () => {
  const sexta = new Date(Date.UTC(2026, 10, 27, 15));
  const prazo = prazoCat(sexta, false);
  assert.equal(prazo.getUTCDay(), 1);
  assert.equal(prazo.getUTCDate(), 30);
  assert.equal(prazoCat(sexta, true).getTime(), sexta.getTime());
});

test('ASO (NR-07): sem prazo do médico, periódico todo ano com risco e a cada 2 anos sem risco', () => {
  const exame = new Date(Date.UTC(2026, 0, 10));
  assert.equal(proximoExame([], 'ADMISSIONAL', 'APTO', exame, true)!.getUTCFullYear(), 2027);
  assert.equal(proximoExame([], 'ADMISSIONAL', 'APTO', exame, false)!.getUTCFullYear(), 2028);
  assert.equal(proximoExame([], 'DEMISSIONAL', 'APTO', exame), null);
  assert.equal(proximoExame([], 'PERIODICO', 'INAPTO', exame), null);
});

test('ASO (NR-07): vale a menor periodicidade dos exames do GHE', () => {
  const programa = [
    { nome: 'Audiometria', admissional: true, periodico: true, retornoTrabalho: false, mudancaRisco: false, demissional: true, periodicidadeMeses: 6 },
    { nome: 'Clínico', admissional: true, periodico: true, retornoTrabalho: true, mudancaRisco: true, demissional: true, periodicidadeMeses: 12 },
  ];
  const proximo = proximoExame(programa, 'PERIODICO', 'APTO', new Date(Date.UTC(2026, 0, 10)))!;
  assert.equal(proximo.getUTCMonth(), 6);
});

test('Demissional (NR-07, 7.5.11): dispensa até 135 dias no grau 1 e 2, até 90 dias no grau 3 e 4', () => {
  const ultimo = new Date(Date.UTC(2026, 0, 1));
  const saida = new Date(Date.UTC(2026, 3, 1)); // 90 dias depois
  assert.equal(dispensaDemissional(2, ultimo, saida).dispensa, true);
  assert.equal(dispensaDemissional(3, ultimo, saida).dispensa, false);
});

test('Matriz 5x5 (NR-01, 1.5.4.4.2): severidade x probabilidade', () => {
  assert.equal(nivelRisco('5', '4'), 'CRITICO');
  assert.equal(nivelRisco('5', '3'), 'ALTO');
  assert.equal(nivelRisco('4', '2'), 'MODERADO');
  assert.equal(nivelRisco('1', '1'), 'BAIXO');
});

test('CPF e CNPJ conferidos pelos dígitos', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11.222.333/0001-82'), false);
});
