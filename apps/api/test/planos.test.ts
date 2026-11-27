// Regras de plano e acesso. Estes testes só conferem o que já existe: se algum falhar, alguma mudança alterou a regra.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { planoEfetivo, situacaoPlano, temRecurso, travaConsulta, TOLERANCIA_DIAS } from '../src/common/plano';
import { PLANOS } from '../src/admin/planos';
import { PLANOS_SITE } from '../../web/lib/planos';

const DIA = 86_400_000;

test('Tabela de planos aprovada em 08/11 continua igual', () => {
  const resumo = PLANOS.map((p) => `${p.codigo}:${p.precoMensal}:${p.limiteEmpresas ?? 'ilimitado'}`);
  assert.deepEqual(resumo, ['FREE:0:1', 'START:47:1', 'ESSENCIAL:97:5', 'PROFISSIONAL:197:15', 'ENTERPRISE:397:ilimitado', 'PREMIUM:197:30']);
});

test('O site mostra os mesmos preços e limites do motor', () => {
  for (const p of PLANOS_SITE) {
    const motor = PLANOS.find((m) => m.codigo === p.codigo);
    assert.ok(motor, `plano ${p.codigo} do site não existe no motor`);
    assert.equal(p.precoMensal, motor!.precoMensal, `preço do ${p.codigo}`);
    assert.equal(p.limiteEmpresas, motor!.limiteEmpresas, `limite do ${p.codigo}`);
  }
});

test('Teste de 14 dias libera os recursos do Profissional; depois volta ao Grátis', () => {
  const emTeste = planoEfetivo({ plano: 'FREE', testeAte: new Date(Date.now() + 3 * DIA) }, false);
  assert.equal(emTeste.emTeste, true);
  assert.ok(temRecurso(emTeste, 'equipe'));
  const acabou = planoEfetivo({ plano: 'FREE', testeAte: new Date(Date.now() - DIA) }, false);
  assert.equal(acabou.emTeste, false);
  assert.equal(temRecurso(acabou, 'documentos'), false);
});

test('Conta da dona da plataforma tem tudo, sem plano', () => {
  const dono = planoEfetivo({ plano: 'FREE', testeAte: null }, true);
  assert.equal(dono.dono, true);
  assert.ok(temRecurso(dono, 'semMarca'));
});

test(`Plano vencido: ${TOLERANCIA_DIAS} dias de tolerância, depois só consulta`, () => {
  const venceu = (dias: number) => situacaoPlano({ plano: 'ESSENCIAL', planoPagoAte: new Date(Date.now() - dias * DIA) }).situacao;
  assert.equal(venceu(-3), 'EM_DIA');
  assert.equal(venceu(2), 'TOLERANCIA');
  assert.equal(venceu(TOLERANCIA_DIAS + 2), 'CONSULTA');
  assert.equal(situacaoPlano({ plano: 'ESSENCIAL', planoPagoAte: new Date(Date.now() - 30 * DIA), assinaturaStatus: 'CANCELADA' }).situacao, 'EM_DIA');
});

test('Só consulta: deixa ver e baixar, trava criar e mudar, libera pagar', () => {
  assert.equal(travaConsulta('GET', '/empresas/x', false), false);
  assert.equal(travaConsulta('POST', '/empresas/x/pgr/pdf', false), false);
  assert.equal(travaConsulta('POST', '/empresas/x/colaboradores', false), true);
  assert.equal(travaConsulta('POST', '/pagamentos/assinar', false), false);
});
