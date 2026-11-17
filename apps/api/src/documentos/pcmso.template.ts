import { documentoHtml, escape, Moldura } from './layout';
import { Controle, CSS_SECOES, blocoAssinaturas, controleDocumento, dataBr, lista, p, secoesNumeradas, tabelaDuasColunas, tabelaReferencias } from './secoes';

export type ExamePdf = {
  nome: string;
  tipo: string;
  admissional: boolean;
  periodico: boolean;
  retornoTrabalho: boolean;
  mudancaRisco: boolean;
  demissional: boolean;
  periodicidadeMeses: number | null;
};
export type GhePcmso = { nome: string; colaboradores: number; riscos: string[]; funcoes?: string[]; exames: ExamePdf[] };
export type Medico = { nome: string | null; crm: string | null };
export type ExtrasPcmso = {
  controle: Controle;
  empresa: { razaoSocial: string; cnae: string | null; grauRisco: number | null; endereco: string | null; numFuncionarios: number };
  responsavelPgr: string | null;
  representanteLegal: string | null;
  servicoSaude: boolean; // empresa de serviço de saúde: entra a NR-32 e a vacinação obrigatória
  local: string | null;
};

const marca = (sim: boolean) => (sim ? '●' : '');

function blocoGhe(ghe: GhePcmso): string {
  return `
    <section class="ghe">
      <h3>${escape(ghe.nome)} <span class="meta">${ghe.colaboradores} colaborador(es)</span></h3>
      ${ghe.funcoes?.length ? `<p class="riscos"><strong>Funções:</strong> ${ghe.funcoes.map(escape).join(', ')}</p>` : ''}
      <p class="riscos"><strong>Riscos do PGR:</strong> ${ghe.riscos.length ? ghe.riscos.map(escape).join(', ') : 'nenhum risco específico cadastrado no PGR'}</p>
      ${
        ghe.exames.length
          ? `<table>
        <thead>
          <tr><th>Exame</th><th>Tipo</th><th class="c">Admissional</th><th class="c">Periódico</th><th class="c">Retorno</th><th class="c">Mudança de risco</th><th class="c">Demissional</th><th>Periodicidade</th></tr>
        </thead>
        <tbody>
          ${ghe.exames
            .map(
              (e) => `<tr>
                <td>${escape(e.nome)}</td>
                <td>${e.tipo === 'CLINICO' ? 'Clínico' : 'Complementar'}</td>
                <td class="c">${marca(e.admissional)}</td>
                <td class="c">${marca(e.periodico)}</td>
                <td class="c">${marca(e.retornoTrabalho)}</td>
                <td class="c">${marca(e.mudancaRisco)}</td>
                <td class="c">${marca(e.demissional)}</td>
                <td>${e.periodicidadeMeses ? `${e.periodicidadeMeses} meses` : '—'}</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>`
          : '<p class="falta">Nenhum exame programado para este GHE.</p>'
      }
    </section>`;
}

export function renderPcmsoHtml(moldura: Moldura, medico: Medico, ghes: GhePcmso[], extras: ExtrasPcmso): string {
  const e = extras.empresa;
  const nomeEmpresa = escape(e.razaoSocial);
  const total = ghes.reduce((t, g) => t + g.colaboradores, 0) || e.numFuncionarios;
  const medicoTexto = medico.nome ? `${escape(medico.nome)}${medico.crm ? `, CRM ${escape(medico.crm)}` : ''}` : '<span class="falta">médico responsável não informado</span>';
  const prazoDemissional = (e.grauRisco ?? 3) <= 2 ? 135 : 90;

  const secoes = secoesNumeradas([
    { titulo: 'Controle do documento', html: controleDocumento(extras.controle) },
    {
      titulo: 'Identificação',
      html: tabelaDuasColunas(['Dado', 'Informação'], [
        ['Empresa', nomeEmpresa],
        ['Endereço', e.endereco ? escape(e.endereco) : '<span class="falta">não informado</span>'],
        ['Grau de risco (NR-04)', e.grauRisco ? String(e.grauRisco) : '<span class="falta">não informado</span>'],
        ['Trabalhadores', String(total)],
        ['Médico responsável pelo PCMSO', medicoTexto],
        ['PGR usado como base', extras.responsavelPgr ? `elaborado por ${escape(extras.responsavelPgr)}` : 'PGR da empresa'],
        ['Representante legal', extras.representanteLegal ? escape(extras.representanteLegal) : '<span class="falta">não informado</span>'],
      ]),
    },
    {
      titulo: 'Introdução',
      html: p(
        `O Programa de Controle Médico de Saúde Ocupacional (PCMSO) cuida da saúde de quem trabalha na ${nomeEmpresa}. Ele parte dos
        riscos levantados no PGR e define, para cada grupo de trabalhadores, quais exames fazer e com que frequência.`,
        `A ideia não é só cumprir a lista de exames. É acompanhar cada pessoa ao longo do tempo para perceber cedo qualquer sinal de que o
        trabalho está afetando a saúde, como uma perda de audição que começa ou uma alteração no sangue, e agir antes que vire doença.`,
        'Este programa segue a NR-07 e deve ser lido junto com o PGR. Quando o PGR mudar, o PCMSO também precisa ser revisto.',
      ),
    },
    {
      titulo: 'Objetivos',
      html: lista([
        'proteger e preservar a saúde dos trabalhadores em relação aos riscos do trabalho;',
        'rastrear e detectar cedo problemas de saúde relacionados ao trabalho, inclusive os de natureza subclínica;',
        'verificar se cada pessoa está apta para a função que exerce ou vai exercer;',
        'identificar trabalhadores que precisam de cuidado diferenciado, como gestantes e pessoas com doenças que podem piorar com a exposição;',
        'dar retorno à empresa sobre os resultados coletivos, para que as medidas do PGR sejam revistas quando necessário.',
      ]),
    },
    {
      titulo: 'Campo de aplicação',
      html: p(
        `Este PCMSO vale para todos os empregados da ${nomeEmpresa}, em todos os setores e funções, ${total} trabalhador(es) na data de emissão,
        organizados em ${ghes.length} grupo(s) de exposição (GHE), os mesmos usados no PGR.`,
        'Trabalhadores temporários e de empresas terceirizadas seguem o PCMSO da própria empregadora, mas a empresa deve informar a elas os riscos do local onde vão trabalhar.',
      ),
    },
    {
      titulo: 'Referências normativas',
      html: tabelaReferencias([
        ['NR-07', 'Programa de Controle Médico de Saúde Ocupacional e seus anexos (audiometria, agentes químicos, exames de imagem e outros)'],
        ['NR-01', 'Gerenciamento de riscos ocupacionais: o PGR é a base deste programa'],
        ['NR-09 e NR-15', 'Avaliação dos agentes físicos, químicos e biológicos e seus limites'],
        ['NR-17', 'Ergonomia'],
        ...(extras.servicoSaude ? ([['NR-32', 'Segurança e saúde em serviços de saúde, inclusive vacinação']] as [string, string][]) : []),
        ['CLT, art. 168 e 169', 'Exames médicos obrigatórios e notificação de doenças profissionais'],
        ['Lei 8.213/1991, art. 19 a 23', 'Acidente do trabalho, doença ocupacional e emissão da CAT'],
        ['eSocial S-2220', 'Envio das informações do monitoramento da saúde do trabalhador'],
      ]),
    },
    {
      titulo: 'Definições',
      html: tabelaDuasColunas(['Termo', 'O que quer dizer neste documento'], [
        ['ASO', 'Atestado de Saúde Ocupacional. É o documento que diz se o trabalhador está apto ou inapto para a função.'],
        ['Exame clínico', 'Consulta com o médico, com conversa sobre a saúde e o trabalho (anamnese) e exame físico.'],
        ['Exame complementar', 'Exames que ajudam a avaliar a exposição a um risco, como audiometria, raio-X, exames de sangue e espirometria.'],
        ['Admissional', 'Feito antes de a pessoa começar a trabalhar.'],
        ['Periódico', 'Repetido de tempos em tempos, no intervalo definido neste programa.'],
        ['Retorno ao trabalho', 'Feito antes de voltar ao trabalho depois de afastamento de 30 dias ou mais por doença ou acidente.'],
        ['Mudança de risco', 'Feito antes de a pessoa passar para uma função ou setor com riscos diferentes.'],
        ['Demissional', 'Feito no desligamento, em até 10 dias após o fim do contrato.'],
        ['Relatório analítico', 'Balanço anual dos exames feitos, dos resultados alterados e dos casos de doença ligada ao trabalho.'],
      ]),
    },
    {
      titulo: 'Responsabilidades',
      html: tabelaDuasColunas(['Quem', 'O que faz'], [
        ['Empresa (empregador)', 'Garantir que o PCMSO seja feito e cumprido, pagar os exames sem nenhum custo para o trabalhador, liberar a pessoa no horário dos exames e indicar o médico responsável.'],
        ['Médico responsável', 'Elaborar o programa a partir do PGR, definir os exames e a periodicidade, acompanhar os resultados, guardar os prontuários com sigilo e emitir o relatório analítico anual.'],
        ['Médicos examinadores', 'Realizar os exames conforme este programa e emitir o ASO.'],
        ['Setor pessoal ou RH', 'Agendar os exames nos prazos, encaminhar o trabalhador, arquivar o ASO e enviar o evento S-2220 ao eSocial.'],
        ['Trabalhador', 'Comparecer aos exames, informar o médico sobre a sua saúde com sinceridade e seguir as orientações recebidas.'],
      ]),
    },
    {
      titulo: 'Riscos considerados e exames por grupo',
      html: `${p(
        `Os riscos de cada grupo foram tirados do PGR. Para cada um, o médico definiu os exames necessários e o intervalo entre eles.
        Os exames complementares seguem os anexos da NR-07 e o critério do médico responsável.`,
      )}${ghes.map(blocoGhe).join('') || '<p class="falta">Nenhum GHE cadastrado.</p>'}`,
    },
    {
      titulo: 'Quando cada exame é feito',
      html: tabelaDuasColunas(['Exame', 'Quando'], [
        ['Admissional', 'Antes de a pessoa assumir as atividades.'],
        ['Periódico', 'No intervalo da tabela de cada grupo. Pela NR-07, é anual para quem está exposto a riscos ou tem doença crônica, e a cada 2 anos para os demais. O médico pode encurtar o prazo quando achar necessário.'],
        ['Retorno ao trabalho', 'No primeiro dia de volta, antes de reassumir a função, após afastamento de 30 dias ou mais por doença ou acidente, ligado ou não ao trabalho.'],
        ['Mudança de risco', 'Antes da mudança de função, setor ou atividade que exponha a pessoa a riscos diferentes.'],
        ['Demissional', `Em até 10 dias após o fim do contrato. Pode ser dispensado se o último exame clínico foi feito há menos de ${prazoDemissional} dias (grau de risco ${e.grauRisco ?? 'da empresa'}).`],
      ]),
    },
    {
      titulo: 'Atestado de Saúde Ocupacional (ASO)',
      html: `${p('Em cada exame clínico o médico emite o ASO, em duas vias: uma fica com a empresa e a outra é entregue ao trabalhador. O ASO traz:')}
        ${lista([
          'razão social e CNPJ da empresa;',
          'nome completo e CPF do trabalhador, e a função que exerce;',
          'os riscos a que está exposto, conforme o PGR;',
          'os exames feitos, com as datas;',
          'a conclusão: apto ou inapto para a função;',
          'nome, CRM e assinatura do médico que fez o exame, e a data.',
        ])}`,
    },
    {
      titulo: 'Prontuário e sigilo',
      html: p(
        'Os dados de cada exame ficam no prontuário médico do trabalhador, sob responsabilidade do médico. A empresa recebe apenas o ASO e os resultados coletivos, sem diagnósticos individuais.',
        'O prontuário deve ser guardado por, no mínimo, 20 anos depois do desligamento do trabalhador. Se o médico responsável mudar, os prontuários passam para o novo médico.',
      ),
    },
    {
      titulo: 'Ações de saúde',
      html: `${lista([
        '<strong>Primeiros socorros:</strong> a empresa deve manter material de primeiros socorros adequado aos riscos, guardado em local conhecido e com pessoa treinada para usá-lo.',
        extras.servicoSaude
          ? '<strong>Vacinação:</strong> pela NR-32, os trabalhadores devem receber gratuitamente as vacinas contra tétano, difteria e hepatite B, além das indicadas pelo médico. A vacinação fica registrada no prontuário.'
          : '<strong>Vacinação:</strong> o médico pode indicar vacinas conforme os riscos da função. As campanhas públicas devem ser incentivadas.',
        '<strong>Doença ou acidente ligado ao trabalho:</strong> quando um exame mostrar relação entre o trabalho e um problema de saúde, o médico orienta o afastamento quando preciso, a empresa emite a CAT e o PGR é revisto para corrigir a causa.',
        '<strong>Gestantes e pessoas com restrição:</strong> o médico avalia caso a caso e pode indicar mudança de atividade enquanto durar a situação.',
      ])}`,
    },
    {
      titulo: 'Relatório analítico',
      html: p(
        'Uma vez por ano, o médico responsável prepara o relatório analítico do PCMSO, com o número de exames feitos, os resultados alterados por grupo e os casos de doença ligada ao trabalho, comparando com o ano anterior.',
        'O relatório é apresentado à empresa e discutido com a CIPA, quando existir. Ele serve para avaliar se as medidas do PGR estão protegendo de fato.',
      ),
    },
    {
      titulo: 'Revisão e vigência',
      html: `${p(`Este PCMSO passa a valer na data de emissão${extras.controle.proximaRevisao ? ` e deve ser revisto até ${dataBr(extras.controle.proximaRevisao)}` : ''}, junto com o relatório analítico. Ele também deve ser revisto antes disso quando:`)}
        ${lista(['o PGR for atualizado ou surgirem riscos novos;', 'mudar a estrutura da empresa, os setores ou as funções;', 'os resultados dos exames indicarem necessidade de ajuste;', 'mudar a NR-07 ou outra norma que se aplique.'])}`,
    },
    {
      titulo: 'Considerações finais',
      html: p(
        'O PCMSO só cumpre o seu papel se os exames forem feitos no prazo e se os resultados forem usados para melhorar as condições de trabalho. Um exame alterado não é motivo de punição: é um sinal para agir.',
        'Este programa deve ficar disponível na empresa para os trabalhadores, para a CIPA e para a fiscalização.',
      ),
    },
  ]);

  return documentoHtml(
    moldura,
    `${secoes}
     ${blocoAssinaturas(extras.local, extras.controle.emitidoEm, [
       { nome: medico.nome, papel: 'Médico responsável pelo PCMSO', registro: medico.crm ? `CRM ${medico.crm}` : null },
       { nome: extras.representanteLegal, papel: 'Representante da organização' },
     ])}`,
    `${CSS_SECOES} .c { text-align: center; } .riscos { margin: 0 0 4px; } .ghe table { font-size: 10px; }`,
  );
}
