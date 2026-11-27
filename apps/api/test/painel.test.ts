// Botão "Resolver": cada aviso do painel leva à tela onde ele se resolve.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ondeResolver } from '../src/painel/onde-resolver';

const casos: [string, string][] = [
  ['Complete os dados da empresa', '#dados'],
  ['Cadastre ao menos um GHE', '#ghes'],
  ['PGR: faltam riscos em 2 GHE', '#ghes'],
  ['PCMSO: faltam exames em 1 GHE', '#ghes'],
  ['Vincule os colaboradores a um GHE', '/colaboradores'],
  ['Revise o PGR', '/conferencia'],
  ['Gere o primeiro PCMSO', '@/emitir'],
  ['Reunião mensal da CIPA atrasada', '/cipa#reunioes'],
  ['Publique o edital da CIPA em até 10 dia(s)', '/cipa#eleicao'],
  ['Nomeie o representante da NR-05', '/cipa#dimensionamento'],
  ['Envie a CAT de CATARINA SOUZA', '/saude#cat'],
  ['ASO de retorno de CATARINA SOUZA', '/saude#afastamentos'],
  ['JOÃO afastado há 20 dias', '/saude#afastamentos'],
  ['MARIA: 18 dias de atestado', '/conectores#faltas'],
  ['CA vencido no almoxarifado: Luva', '/almoxarifado'],
  ['Comprar Protetor auricular', '/almoxarifado'],
  ['3 relato(s) novo(s) pelo QR code', '/prevencao#relatos'],
  ['2 ação(ões) do plano atrasada(s)', '/prevencao#acoes'],
  ['Inspeção atrasada: Galpão', '/operacao#checklist'],
  ['Brigada incompleta: 1 de 4', '/emergencia'],
  ['Treinamento vencido: 3', '/treinamentos'],
  ['ASO vencido: 2 colaborador(es)', '/colaboradores'],
  ['EPI com CA vencido: 1', '/colaboradores'],
  ['Vacina ou exame atrasado: 1', '/prontuario'],
  ['Espaço confinado sem sinalização ou bloqueio: 1', '/confinados'],
];

test('Cada pendência do painel tem a tela certa para resolver', () => {
  for (const [titulo, rota] of casos) assert.equal(ondeResolver(titulo), rota, titulo);
});

import { situacaoEspaco } from '../src/diagnostico/backup-espaco';

test('Espaço do Supabase: verde até 70%, amarelo até 90%, vermelho acima', () => {
  assert.equal(situacaoEspaco(300, 500), 'ok');
  assert.equal(situacaoEspaco(360, 500), 'atencao');
  assert.equal(situacaoEspaco(460, 500), 'falha');
});
