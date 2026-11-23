import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { NOME_SITUACAO_EXPOSICAO, SituacaoExposicao } from '../documentos/nivel-acao';
import {
  CSS_CRONOGRAMA, CSS_SECOES, ExtrasDoc, blocoAssinaturas, controleDocumento, cronogramaHtml, dataBr, identificacaoBasica, lista, p,
  secoesNumeradas, tabelaDuasColunas, tabelaReferencias, TODO_MES,
} from '../documentos/secoes';
import { Responsavel } from './templates';

// PCA (conservação auditiva) e PPR (proteção respiratória): programas que saem dos riscos do PGR
// quando o ruído passa do nível de ação ou quando o controle depende de respirador.

export type ExpostoPrograma = {
  ghe: string; agente: string; fonte: string; intensidade: string | null; limite: string | null; situacao: SituacaoExposicao | null;
  epi: string | null; ca: string | null; trabalhadores: number;
};
export type TrabalhadorPrograma = { nome: string; cargo: string; ghe: string; ultimoExame: Date | null; fezExame: boolean; proximo: Date | null };

const situacaoTexto = (s: SituacaoExposicao | null) => (s ? NOME_SITUACAO_EXPOSICAO[s].replace(/^./, (c) => c.toUpperCase()) : 'Sem medição');
const tabelaExpostos = (expostos: ExpostoPrograma[], colEpi: string) =>
  expostos.length
    ? `<table><thead><tr><th>GHE</th><th>Agente e fonte</th><th>Medido</th><th>Limite</th><th>Situação</th><th>${colEpi}</th><th>Trab.</th></tr></thead><tbody>${expostos
        .map((e) => `<tr><td>${escape(e.ghe)}</td><td>${escape(e.agente)}<br><span class="nota">${escape(e.fonte)}</span></td><td>${escape(e.intensidade ?? '—')}</td><td>${escape(e.limite ?? '—')}</td><td>${situacaoTexto(e.situacao)}</td><td>${escape(e.epi ?? '—')}${e.ca ? `<br><span class="nota">CA ${escape(e.ca)}</span>` : ''}</td><td class="c">${e.trabalhadores}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="falta">Nenhum GHE se enquadra hoje. Confira as medições e os EPIs dos riscos no cadastro da empresa.</p>';
const tabelaTrabalhadores = (t: TrabalhadorPrograma[], exame: string) =>
  t.length
    ? `<table><thead><tr><th>Trabalhador</th><th>Cargo</th><th>GHE</th><th>Último ASO</th><th>${exame}</th><th>Próximo exame</th></tr></thead><tbody>${t
        .map((x) => `<tr><td>${escape(x.nome)}</td><td>${escape(x.cargo)}</td><td>${escape(x.ghe)}</td><td>${dataBr(x.ultimoExame)}</td><td>${x.ultimoExame ? (x.fezExame ? 'Sim' : '<span class="falta">Não consta</span>') : '—'}</td><td>${dataBr(x.proximo)}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="nota">Nenhum trabalhador ativo vinculado aos GHEs acima.</p>';

const assinaturas = (extras: ExtrasDoc, responsavel: Responsavel, medico?: { nome: string | null; crm: string | null }) =>
  blocoAssinaturas(extras.local, extras.controle.emitidoEm, [
    { nome: responsavel.nome, papel: extras.formacao ?? 'Responsável técnico', registro: responsavel.registro },
    ...(medico ? [{ nome: medico.nome, papel: 'Médico coordenador do PCMSO', registro: medico.crm }] : []),
    { nome: extras.representanteLegal, papel: 'Representante da organização' },
  ]);

export function pcaHtml(moldura: Moldura, expostos: ExpostoPrograma[], trabalhadores: TrabalhadorPrograma[], responsavel: Responsavel, medico: { nome: string | null; crm: string | null }, extras: ExtrasDoc): string {
  const nomeEmpresa = escape(extras.empresa.razaoSocial);
  const total = expostos.reduce((t, e) => t + e.trabalhadores, 0);
  const inicio = extras.controle.emitidoEm;
  const secoes = secoesNumeradas([
    { titulo: 'Controle do documento', html: controleDocumento(extras.controle) },
    { titulo: 'Identificação', html: identificacaoBasica(extras, extras.empresa.numFuncionarios, responsavel, 'Responsável técnico', [['Trabalhadores no programa', String(total)], ['Médico do PCMSO', medico.nome ? escape(medico.nome) : '<span class="falta">não informado</span>']]) },
    {
      titulo: 'Introdução',
      html: p(
        `A perda auditiva causada pelo ruído não tem cura e avança devagar, sem dor. Quando a pessoa percebe, o dano já está feito. Por isso o cuidado começa antes do limite de tolerância: a partir do nível de ação, que é metade da dose diária de ruído.`,
        `Este Programa de Conservação Auditiva organiza o que a ${nomeEmpresa} faz para proteger a audição de quem trabalha nos setores com ruído: medir, reduzir na fonte, fornecer e cobrar o protetor auditivo, treinar e acompanhar com audiometrias.`,
      ),
    },
    {
      titulo: 'Objetivo',
      html: lista([
        'evitar o aparecimento e o agravamento da perda auditiva induzida por ruído (PAIR);',
        'manter a exposição abaixo do nível de ação sempre que possível e, no mínimo, abaixo do limite de tolerância;',
        'acompanhar a audição dos expostos com audiometrias no prazo certo;',
        'registrar tudo o que foi feito, para mostrar à fiscalização, à perícia e à Previdência.',
      ]),
    },
    {
      titulo: 'Referências legais',
      html: tabelaReferencias([
        ['NR-01, item 1.5', 'Gerenciamento de riscos ocupacionais (PGR)'],
        ['NR-09', 'Avaliação e controle das exposições a agentes físicos, químicos e biológicos; nível de ação'],
        ['NR-07, Anexo II', 'Controle médico ocupacional da exposição a níveis de pressão sonora elevados (audiometrias)'],
        ['NR-15, Anexos 1 e 2', 'Limites de tolerância para ruído contínuo, intermitente e de impacto'],
        ['NR-06', 'Equipamento de proteção individual'],
        ['NHO-01 da Fundacentro', 'Procedimento técnico de avaliação da exposição ocupacional ao ruído'],
      ]),
    },
    {
      titulo: 'Definições',
      html: tabelaDuasColunas(['Termo', 'O que quer dizer neste documento'], [
        ['dB(A)', 'Unidade do nível de ruído, com o filtro que imita o ouvido humano.'],
        ['Dose', 'Quanto da exposição diária permitida a pessoa já recebeu. 100% é o limite; 50% é o nível de ação.'],
        ['Nível de ação', 'Ponto a partir do qual começam as ações preventivas: 80 dB(A) pela NR-15 ou 82 dB(A) pela NHO-01, para 8 horas.'],
        ['Limite de tolerância', '85 dB(A) para 8 horas de trabalho (NR-15, Anexo 1).'],
        ['PAIR', 'Perda auditiva induzida por níveis de pressão sonora elevados: lenta, permanente e evitável.'],
        ['NRRsf', 'Atenuação do protetor auditivo informada no CA, que vale para a maioria dos usuários quando bem colocado.'],
      ]),
    },
    {
      titulo: 'Responsabilidades',
      html: tabelaDuasColunas(['Quem', 'O que faz'], [
        ['Empresa', 'Garante os recursos do programa, compra protetores com CA válido, libera as pessoas para treinamento e exames e cobra o uso.'],
        ['Responsável técnico', 'Mede o ruído, indica as medidas de controle, escolhe o protetor adequado e revisa este programa.'],
        ['Médico do PCMSO', 'Define e analisa as audiometrias, avisa a empresa quando há perda ligada ao trabalho e orienta a emissão de CAT quando couber.'],
        ['Liderança', 'Confere no dia a dia se o protetor está sendo usado do jeito certo e comunica qualquer mudança de máquina ou processo.'],
        ['Trabalhadores', 'Usam e guardam o protetor, fazem os exames, participam dos treinamentos e avisam quando o protetor incomoda ou estraga.'],
      ]),
    },
    { titulo: 'Grupos expostos ao ruído', html: `${tabelaExpostos(expostos, 'Protetor auditivo')}${p('Entram no programa os grupos com exposição no nível de ação ou acima. Grupos sem medição quantitativa entram até que o ruído seja medido.')}` },
    {
      titulo: 'Como o programa funciona',
      html: `
        <h3>Avaliação e monitoramento</h3>
        ${p('O ruído de cada grupo é medido por dosimetria, seguindo a NHO-01. A medição é refeita a cada 12 meses e sempre que mudar máquina, processo, layout ou jornada.')}
        <h3>Controle na fonte e no ambiente</h3>
        ${p('Antes do protetor auditivo vem o controle na fonte, na ordem da NR-01: trocar ou isolar a máquina barulhenta, fazer manutenção (rolamentos, correias, escapamentos), enclausurar, usar materiais que absorvem o som e reduzir o tempo de exposição com rodízio de tarefas.')}
        <h3>Protetor auditivo</h3>
        ${lista([
          'escolhido pela atenuação (NRRsf) informada no CA, levando em conta o nível medido e o conforto de quem vai usar;',
          'entregue com registro na ficha de EPI e treinamento de colocação;',
          'tipo plug: higienizado e trocado quando endurecer, rachar ou sujar; tipo concha: almofadas trocadas quando ressecarem;',
          'uso obrigatório durante toda a permanência nas áreas sinalizadas.',
        ])}
        <h3>Audiometrias (NR-07, Anexo II)</h3>
        ${lista([
          'na admissão, 6 meses depois da admissão, a cada 12 meses e na demissão;',
          'com repouso auditivo de pelo menos 14 horas antes do exame;',
          'feitas por fonoaudiólogo ou médico, com o resultado analisado pelo médico do PCMSO;',
          'quando aparecer perda sugestiva de PAIR ou piora, o médico avisa a empresa, os controles são revistos e a CAT é avaliada.',
        ])}
        <h3>Treinamento</h3>
        ${p('Todos os expostos recebem orientação sobre os efeitos do ruído, como colocar e cuidar do protetor e por que fazer as audiometrias. A orientação é repetida pelo menos uma vez por ano, nos DDS e na integração de novos funcionários.')}`,
    },
    { titulo: 'Trabalhadores e audiometrias', html: tabelaTrabalhadores(trabalhadores, 'Audiometria no último ASO') },
    {
      titulo: 'Cronograma',
      html: cronogramaHtml(inicio, [
        { acao: 'Dosimetria de ruído dos grupos expostos', responsavel: 'Responsável técnico', meses: [0] },
        { acao: 'Audiometrias periódicas conforme o PCMSO', responsavel: 'Médico do PCMSO', meses: TODO_MES },
        { acao: 'Conferir uso e estado dos protetores auditivos', responsavel: 'Liderança', meses: TODO_MES },
        { acao: 'Treinamento sobre ruído e protetor auditivo', responsavel: 'Responsável técnico', meses: [1, 7] },
        { acao: 'Análise dos resultados das audiometrias', responsavel: 'Médico do PCMSO', meses: [11] },
        { acao: 'Revisão do programa', responsavel: 'Responsável técnico', meses: [11] },
      ]),
    },
    {
      titulo: 'Revisão e vigência',
      html: p(`Este programa vale por 12 meses e deve ser revisto até ${dataBr(extras.controle.proximaRevisao)}, ou antes, se mudar o ruído, o processo, os protetores ou se as audiometrias mostrarem piora.`),
    },
  ]);
  return documentoHtml(moldura, `${secoes}${assinaturas(extras, responsavel, medico)}`, `${CSS_SECOES}${CSS_CRONOGRAMA} td.c { text-align: center; }`);
}

export function pprHtml(moldura: Moldura, expostos: ExpostoPrograma[], trabalhadores: TrabalhadorPrograma[], responsavel: Responsavel, medico: { nome: string | null; crm: string | null }, extras: ExtrasDoc): string {
  const nomeEmpresa = escape(extras.empresa.razaoSocial);
  const total = expostos.reduce((t, e) => t + e.trabalhadores, 0);
  const secoes = secoesNumeradas([
    { titulo: 'Controle do documento', html: controleDocumento(extras.controle) },
    { titulo: 'Identificação', html: identificacaoBasica(extras, extras.empresa.numFuncionarios, responsavel, 'Administrador do programa', [['Trabalhadores no programa', String(total)], ['Médico do PCMSO', medico.nome ? escape(medico.nome) : '<span class="falta">não informado</span>']]) },
    {
      titulo: 'Introdução',
      html: p(
        `Respirador só protege quando é o modelo certo para o agente, está bem ajustado ao rosto e é trocado na hora certa. Um respirador mal escolhido dá uma falsa sensação de segurança, que é pior do que nenhuma.`,
        `Este Programa de Proteção Respiratória define como a ${nomeEmpresa} escolhe, entrega, testa, guarda e troca os respiradores, e como acompanha a saúde de quem precisa usá-los.`,
      ),
    },
    {
      titulo: 'Objetivo',
      html: lista([
        'garantir que cada pessoa use o respirador adequado ao agente e à concentração do seu posto;',
        'conferir a vedação no rosto antes do uso e no ensaio periódico;',
        'garantir que só use respirador quem foi liberado pelo médico;',
        'manter os registros de entrega, treinamento, ensaio e troca.',
      ]),
    },
    {
      titulo: 'Referências legais',
      html: tabelaReferencias([
        ['NR-01, item 1.5', 'Gerenciamento de riscos ocupacionais (PGR)'],
        ['NR-06', 'Equipamento de proteção individual'],
        ['NR-09', 'Avaliação e controle das exposições a agentes químicos e biológicos'],
        ['NR-15, Anexos 11, 12 e 13', 'Limites de tolerância para agentes químicos e poeiras minerais'],
        ['Instrução Normativa MTb nº 1/1994', 'Regulamento técnico sobre o uso de equipamentos para proteção respiratória'],
        ['Fundacentro, Programa de Proteção Respiratória', 'Recomendações para seleção e uso de respiradores'],
      ]),
    },
    {
      titulo: 'Definições',
      html: tabelaDuasColunas(['Termo', 'O que quer dizer neste documento'], [
        ['PFF', 'Peça facial filtrante: respirador descartável. A PFF2 serve para poeiras, névoas e fumos comuns; a PFF3, para partículas mais tóxicas.'],
        ['Filtro químico', 'Cartucho que retém gases e vapores. Cada tipo serve para uma família de produtos (vapores orgânicos, gases ácidos, amônia etc.).'],
        ['Fator de proteção atribuído', 'Quanto o respirador reduz a concentração quando bem usado: 10 para PFF e semifacial; 100 para facial inteira.'],
        ['Ensaio de vedação', 'Teste que confere se o respirador veda no rosto daquela pessoa. É feito na entrega e repetido periodicamente.'],
        ['Verificação de vedação', 'Conferência rápida que o próprio usuário faz toda vez que coloca o respirador.'],
      ]),
    },
    {
      titulo: 'Responsabilidades',
      html: tabelaDuasColunas(['Quem', 'O que faz'], [
        ['Empresa', 'Nomeia o administrador do programa, compra respiradores e filtros com CA válido e garante tempo para treinamento, ensaio e exames.'],
        ['Administrador do programa', 'Escolhe os respiradores, faz ou contrata os ensaios de vedação, define a troca de filtros e revisa o programa.'],
        ['Médico do PCMSO', 'Avalia se a pessoa pode usar respirador (problemas respiratórios, cardíacos ou claustrofobia) e registra no ASO.'],
        ['Liderança', 'Confere o uso correto no dia a dia, barba feita e o estado dos respiradores e filtros.'],
        ['Trabalhadores', 'Usam, guardam e conferem a vedação a cada uso, mantêm o rosto barbeado na área de vedação e avisam quando o respirador estraga ou dificulta a respiração.'],
      ]),
    },
    { titulo: 'Grupos que usam respirador', html: `${tabelaExpostos(expostos, 'Respirador indicado')}${p('Entram no programa os grupos cujo controle depende de respirador e os expostos a agente químico no nível de ação ou acima.')}` },
    {
      titulo: 'Como o programa funciona',
      html: `
        <h3>Antes do respirador</h3>
        ${p('O respirador é a última barreira. Primeiro vêm as medidas na ordem da NR-01: eliminar ou trocar o produto, ventilação local exaustora, enclausuramento, umidificação de poeiras e organização do trabalho.')}
        <h3>Seleção</h3>
        ${lista([
          'poeiras, névoas e fumos: PFF2 ou peça semifacial com filtro P2; partículas muito tóxicas ou sílica em concentração alta: P3 ou facial inteira;',
          'gases e vapores: peça semifacial ou facial inteira com o filtro químico próprio do produto, conforme a ficha de segurança (FDS);',
          'mistura de partículas e vapores: filtro combinado;',
          'o fator de proteção do respirador precisa ser maior que a concentração medida dividida pelo limite de tolerância.',
        ])}
        <h3>Liberação médica e ensaio de vedação</h3>
        ${p('Ninguém começa a usar respirador sem a liberação do médico do PCMSO. Na entrega, é feito o ensaio de vedação com o modelo e o tamanho escolhidos, repetido a cada 12 meses ou quando mudar o modelo ou o rosto da pessoa (peso, cirurgia, prótese dentária).')}
        <h3>Uso, limpeza, guarda e troca</h3>
        ${lista([
          'verificação de vedação toda vez que colocar o respirador;',
          'barba, bigode ou costeletas não podem passar pela área de vedação;',
          'PFF descartável: trocada quando ficar difícil de respirar, suja, úmida ou danificada;',
          'filtro químico: trocado conforme o cronograma definido pelo administrador ou assim que sentir cheiro ou gosto do produto;',
          'peças reutilizáveis: limpas ao fim do turno e guardadas em saco ou caixa fechada, longe de poeira e produtos.',
        ])}
        <h3>Treinamento</h3>
        ${p('Na entrega e pelo menos uma vez por ano: por que usar, limites do respirador, como colocar e conferir a vedação, limpeza, guarda e quando trocar filtro.')}`,
    },
    { titulo: 'Trabalhadores e liberação médica', html: tabelaTrabalhadores(trabalhadores, 'ASO no prazo') },
    {
      titulo: 'Cronograma',
      html: cronogramaHtml(extras.controle.emitidoEm, [
        { acao: 'Avaliação quantitativa dos agentes químicos', responsavel: 'Responsável técnico', meses: [0] },
        { acao: 'Ensaio de vedação dos usuários', responsavel: 'Administrador do programa', meses: [1] },
        { acao: 'Treinamento de uso e guarda dos respiradores', responsavel: 'Administrador do programa', meses: [1, 7] },
        { acao: 'Conferir estado dos respiradores e troca de filtros', responsavel: 'Liderança', meses: TODO_MES },
        { acao: 'Revisão do programa', responsavel: 'Administrador do programa', meses: [11] },
      ]),
    },
    {
      titulo: 'Revisão e vigência',
      html: p(`Este programa vale por 12 meses e deve ser revisto até ${dataBr(extras.controle.proximaRevisao)}, ou antes, se mudar o produto, a concentração, o modelo de respirador ou se aparecer queixa respiratória.`),
    },
  ]);
  return documentoHtml(moldura, `${secoes}${assinaturas(extras, responsavel, medico)}`, `${CSS_SECOES}${CSS_CRONOGRAMA} td.c { text-align: center; }`);
}
