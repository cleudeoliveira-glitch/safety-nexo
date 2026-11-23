import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { CSS_SECOES, lista, p, secoesNumeradas, tabelaReferencias } from '../documentos/secoes';
import type { situacaoCipa } from './cipa.service';

const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export function renderCipaHtml(moldura: Moldura, cipa: ReturnType<typeof situacaoCipa>, empresa = 'a empresa'): string {
  const d = cipa.dimensionamento;
  const base = `
    <section>
      <h3>Enquadramento</h3>
      <p><strong>Grau de risco:</strong> ${cipa.grauRisco ?? 'não informado'} (NR-04) · <strong>Empregados no estabelecimento:</strong> ${cipa.numFuncionarios}</p>
    </section>`;

  let resultado: string;
  if (d.situacao === 'SEM_GRAU') {
    resultado = '<p class="alerta">Informe o grau de risco da empresa para dimensionar a CIPA.</p>';
  } else if (d.situacao === 'CIPA') {
    resultado = `
      <section>
        <h3>Composição exigida (NR-05, Quadro I)</h3>
        <table>
          <thead><tr><th>Representação</th><th class="c">Efetivos</th><th class="c">Suplentes</th></tr></thead>
          <tbody>
            <tr><td>Representantes dos empregados (eleitos)</td><td class="c">${d.efetivos}</td><td class="c">${d.suplentes}</td></tr>
            <tr><td>Representantes da organização (indicados)</td><td class="c">${d.efetivos}</td><td class="c">${d.suplentes}</td></tr>
            <tr class="total"><td>Total da comissão</td><td class="c">${d.efetivos * 2}</td><td class="c">${d.suplentes * 2}</td></tr>
          </tbody>
        </table>
      </section>`;
  } else {
    resultado = `
      <section>
        <h3>Resultado</h3>
        <p>A empresa está abaixo do Quadro I da NR-05 (CIPA obrigatória a partir de ${d.minimoParaCipa} empregados neste grau de risco).</p>
        <p>${
          cipa.atendidaSesmt
            ? 'Como a empresa é atendida por SESMT, ele cumpre as atribuições da CIPA (item 5.4.13.1).'
            : `A organização deve nomear um representante entre os empregados para auxiliar nas ações de prevenção (item 5.4.13).
               <br><strong>Representante nomeado:</strong> ${escape(cipa.representante ?? 'não informado')}`
        }</p>
      </section>`;
  }

  const c = cipa.calendario;
  const calendario = c
    ? `
      <section>
        <h3>Calendário do mandato</h3>
        <table>
          <tbody>
            <tr><td>Início do mandato</td><td>${data(c.inicioMandato)}</td></tr>
            <tr><td>Fim do mandato (1 ano, item 5.4.6)</td><td>${data(c.fimMandato)}</td></tr>
            ${
              d.situacao === 'CIPA'
                ? `<tr><td>Publicar edital de convocação até (item 5.5.1)</td><td>${data(c.convocacaoAte)}</td></tr>
                   <tr><td>Realizar a eleição até (item 5.5.3, f)</td><td>${data(c.eleicaoAte)}</td></tr>
                   <tr><td>Posse da nova gestão (item 5.4.7)</td><td>${data(c.posse)}</td></tr>`
                : ''
            }
          </tbody>
        </table>
      </section>`
    : '';

  const nome = escape(empresa);
  const encaminhamentos =
    d.situacao === 'SEM_GRAU'
      ? ['informar o grau de risco da empresa (NR-04) no cadastro para concluir o dimensionamento.']
      : d.situacao === 'CIPA'
        ? [
            c ? `publicar o edital de convocação da eleição até ${data(c.convocacaoAte)};` : 'definir a data de início do mandato para montar o calendário da eleição;',
            'indicar os representantes da organização, entre eles o presidente da comissão;',
            'fazer a eleição dos representantes dos empregados por voto secreto e registrar em ata;',
            'dar posse aos eleitos e fazer o treinamento da CIPA (NR-05, item 5.7) antes ou logo após a posse;',
            'manter o calendário de reuniões mensais e guardar as atas.',
          ]
        : cipa.atendidaSesmt
          ? ['manter o SESMT atuando nas atribuições da CIPA e registrar as ações de prevenção.']
          : [
              cipa.representante ? `manter ${escape(cipa.representante)} como representante nomeado e registrar a nomeação;` : 'nomear um representante entre os empregados para cuidar da prevenção (item 5.4.13);',
              'fazer o treinamento do representante (NR-05, item 5.7);',
              'rever o dimensionamento sempre que o número de empregados mudar.',
            ];
  const corpo = secoesNumeradas(
    [
      {
        titulo: 'Introdução',
        html: p(
          `A Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA) é o grupo formado por representantes dos empregados e da empresa
          para ajudar a prevenir acidentes e doenças do trabalho e a combater o assédio. Este documento mostra se a ${nome} precisa ter CIPA,
          de que tamanho e com que calendário.`,
        ),
      },
      {
        titulo: 'Objetivo',
        html: p('Dimensionar a CIPA conforme o grau de risco e o número de empregados do estabelecimento e organizar as datas do mandato e da eleição.'),
      },
      {
        titulo: 'Base legal',
        html: tabelaReferencias([
          ['NR-05', 'CIPA: constituição, dimensionamento (Quadro I), eleição, mandato, treinamento e atribuições'],
          ['NR-04', 'Grau de risco da atividade (Anexo I) e SESMT'],
          ['Lei 14.457/2022', 'Inclusão da prevenção e do combate ao assédio nas atribuições da CIPA'],
        ]),
      },
      { titulo: 'Desenvolvimento', html: base + resultado + calendario },
      {
        titulo: 'Conclusão e encaminhamentos',
        html: `<div class="destaque-conclusao">${p(
          d.situacao === 'SEM_GRAU'
            ? 'O dimensionamento ainda não pode ser concluído porque falta o grau de risco da empresa.'
            : d.situacao === 'CIPA'
              ? `A ${nome} deve manter CIPA com ${d.efetivos} membro(s) efetivo(s) e ${d.suplentes} suplente(s) de cada lado, empregados e organização.`
              : `A ${nome} não precisa constituir CIPA, ${cipa.atendidaSesmt ? 'porque é atendida por SESMT' : 'mas deve ter um representante nomeado para a prevenção'}.`,
        )}</div>
        ${p('Próximos passos:')}${lista(encaminhamentos)}`,
      },
    ],
    { sumario: false },
  );
  return documentoHtml(moldura, corpo, `${CSS_SECOES} .c { text-align: center; } .total td { font-weight: 600; } .alerta { color: #EF4444; }`);
}
