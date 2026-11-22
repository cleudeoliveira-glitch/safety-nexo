import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { CSS_SECOES, blocoAssinaturas, lista, p, secoesNumeradas, tabelaDuasColunas, tabelaReferencias } from '../documentos/secoes';

export const NOME_CONTROLE: Record<string, string> = {
  AVCB: 'AVCB', CLCB: 'CLCB', EXTINTOR: 'Extintor', HIDRANTE: 'Hidrante', ILUMINACAO: 'Iluminação de emergência', ALARME: 'Alarme de incêndio', SPDA: 'SPDA (para-raios)', OUTRO: 'Outro',
};

// Procedimentos básicos de emergência contra incêndio, na ordem em que acontecem.
const PROCEDIMENTOS = [
  ['Alerta', 'Quem perceber o princípio de incêndio aciona o alarme ou avisa a brigada e a liderança imediatamente.'],
  ['Análise da situação', 'A brigada avalia o tamanho do problema e decide os próximos passos.'],
  ['Apoio externo', 'Acionar o Corpo de Bombeiros (193) e, havendo vítimas, o SAMU (192), informando endereço, ponto de referência e o que está acontecendo.'],
  ['Primeiros socorros', 'Atender as vítimas até a chegada do socorro especializado.'],
  ['Eliminar riscos', 'Desligar a energia e fechar o gás das áreas atingidas, quando for seguro.'],
  ['Abandono de área', 'Retirar todas as pessoas pelas rotas de fuga até o ponto de encontro, sem usar elevadores, conferindo se ninguém ficou para trás.'],
  ['Isolamento', 'Isolar a área para que ninguém volte ao local.'],
  ['Combate ao princípio de incêndio', 'Somente brigadistas treinados, com extintor adequado e rota de saída livre.'],
  ['Recepção do Corpo de Bombeiros', 'Uma pessoa aguarda na entrada e informa o que aconteceu, onde, se há vítimas e se há produtos perigosos.'],
  ['Investigação', 'Depois da emergência, registrar o ocorrido e corrigir as causas.'],
];

export type DadosPlano = {
  divisao: string; descricaoDivisao: string; risco: string; populacao: number[]; total: number | null; nivelTexto: string; observacao: string | null;
  brigadistas: { nome: string; cargo: string; nivel: string; validade: string }[];
  controles: { tipo: string; descricao: string; local: string | null; numero: string | null; validade: Date | null }[];
  pontoEncontro?: string; rotasFuga?: string; contatos?: string; coordenador?: string;
};

export function planoHtml(moldura: Moldura, d: DadosPlano, empresa?: { razaoSocial: string; endereco: string | null; responsavel: string | null; local: string | null }): string {
  const risco = { BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto' }[d.risco] ?? d.risco;
  const data = (x: Date | null) => (x ? x.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
  const nome = escape(empresa?.razaoSocial ?? 'empresa');
  const hoje = new Date();
  const secoes = secoesNumeradas([
    {
      titulo: 'Introdução',
      html: p(
        `Uma emergência não avisa quando vai acontecer. Quando acontece, não há tempo para pensar em quem liga para os bombeiros, por onde
        sair ou quem confere se todos saíram. Este plano existe para que essas respostas já estejam combinadas antes, e para que todos na
        ${nome} saibam o que fazer.`,
        'Ele reúne a brigada de incêndio, os equipamentos de combate, as rotas de fuga, o ponto de encontro, os telefones úteis e o passo a passo para agir em caso de incêndio ou outra emergência.',
      ),
    },
    {
      titulo: 'Objetivo',
      html: lista([
        'proteger a vida de trabalhadores, visitantes e prestadores de serviço;',
        'agir rápido no princípio de incêndio, antes que ele cresça;',
        'organizar o abandono da área de forma segura;',
        'reduzir os danos às instalações e ao meio ambiente;',
        'atender ao que pedem a NR-01 (item 1.5.6) e a NR-23.',
      ]),
    },
    {
      titulo: 'Campo de aplicação',
      html: p(`Este plano vale para todas as áreas da ${nome}${empresa?.endereco ? `, no endereço ${escape(empresa.endereco)}` : ''}, em todos os turnos, e para todas as pessoas que estiverem no local, inclusive visitantes e terceiros.`),
    },
    {
      titulo: 'Referências normativas',
      html: tabelaReferencias([
        ['NR-01, item 1.5.6', 'Preparação para emergências no gerenciamento de riscos'],
        ['NR-23', 'Proteção contra incêndios'],
        ['ABNT NBR 15219', 'Plano de emergência: requisitos e procedimentos'],
        ['ABNT NBR 14276', 'Brigada de incêndio e emergência'],
        ['IT 17 do Corpo de Bombeiros de São Paulo', 'Dimensionamento e treinamento da brigada (em outros estados, vale a instrução do Corpo de Bombeiros local)'],
      ]),
    },
    {
      titulo: 'Responsabilidades',
      html: tabelaDuasColunas(['Quem', 'O que faz'], [
        ['Empresa', 'Manter os equipamentos em dia, formar e treinar a brigada, fazer os simulados e divulgar este plano a todos.'],
        ['Coordenador(a) da emergência', 'Comandar a resposta, decidir pelo abandono, acionar o socorro externo e receber o Corpo de Bombeiros.'],
        ['Brigadistas', 'Atuar no princípio de incêndio, prestar primeiros socorros e conduzir o abandono, sempre sem se colocar em risco.'],
        ['Trabalhadores e visitantes', 'Conhecer as saídas e o ponto de encontro, seguir as orientações da brigada e não voltar ao local até ser liberado.'],
      ]),
    },
    {
      titulo: 'Identificação da edificação',
      html: `<table><tbody>
        <tr><th>Ocupação (IT 17)</th><td>${escape(d.divisao)} · ${escape(d.descricaoDivisao)}</td></tr>
        <tr><th>Risco de incêndio</th><td>${risco}</td></tr>
        <tr><th>População fixa por turno</th><td>${d.populacao.length ? d.populacao.map((x, i) => `pavimento ${i + 1}: ${x}`).join(' · ') : '—'}</td></tr>
        <tr><th>Coordenador(a) da emergência</th><td>${escape(d.coordenador || '—')}</td></tr>
      </tbody></table>`,
    },
    {
      titulo: 'Brigada de incêndio',
      html: `<p><strong>Brigadistas necessários por turno:</strong> ${d.total ?? 'cálculo especial'} · <strong>Nível de treinamento:</strong> ${escape(d.nivelTexto)}</p>
      ${d.observacao ? `<p class="meta">${escape(d.observacao)}</p>` : ''}
      ${
        d.brigadistas.length
          ? `<table><thead><tr><th>Brigadista</th><th>Cargo</th><th>Treinamento</th><th>Válido até</th></tr></thead><tbody>${d.brigadistas
              .map((b) => `<tr><td>${escape(b.nome)}</td><td>${escape(b.cargo)}</td><td>${escape(b.nivel)}</td><td>${escape(b.validade)}</td></tr>`)
              .join('')}</tbody></table>`
          : '<p class="alerta">Nenhum brigadista com treinamento válido.</p>'
      }`,
    },
    {
      titulo: 'Equipamentos e documentos de proteção contra incêndio',
      html: d.controles.length
        ? `<table><thead><tr><th>Item</th><th>Descrição</th><th>Local</th><th>Número</th><th>Validade</th></tr></thead><tbody>${d.controles
            .map((c) => `<tr><td>${NOME_CONTROLE[c.tipo] ?? c.tipo}</td><td>${escape(c.descricao)}</td><td>${escape(c.local)}</td><td>${escape(c.numero)}</td><td>${data(c.validade)}</td></tr>`)
            .join('')}</tbody></table>`
        : '<p>Nenhum item cadastrado.</p>',
    },
    {
      titulo: 'Rotas de fuga e ponto de encontro',
      html: `<p><strong>Ponto de encontro:</strong> ${escape(d.pontoEncontro || 'a definir')}</p>${d.rotasFuga ? `<p>${escape(d.rotasFuga).replace(/\n/g, '<br>')}</p>` : ''}`,
    },
    {
      titulo: 'O que fazer em caso de emergência',
      html: `<ol>${PROCEDIMENTOS.map(([t, x]) => `<li><strong>${t}:</strong> ${x}</li>`).join('')}</ol>`,
    },
    {
      titulo: 'Telefones de emergência',
      html: `<p>Corpo de Bombeiros 193 · SAMU 192 · Polícia Militar 190 · Defesa Civil 199${d.contatos ? ` · ${escape(d.contatos)}` : ''}</p>`,
    },
    {
      titulo: 'Treinamentos, simulados e divulgação',
      html: p(
        'Os brigadistas refazem o treinamento todo ano (IT 17, item 4.4.1.4.2). Pelo menos um simulado de abandono por ano deve ser feito com todo mundo que trabalha no local, e o resultado registrado.',
        'Todo trabalhador novo deve conhecer este plano na integração. Um resumo com as saídas, o ponto de encontro e os telefones deve ficar em local visível.',
      ),
    },
    {
      titulo: 'Revisão',
      html: p('Este plano deve ser revisto pelo menos uma vez por ano, depois de cada simulado ou emergência real, e sempre que mudar o layout, a ocupação, a quantidade de pessoas ou os equipamentos de combate.'),
    },
  ], { quebra: false });
  return documentoHtml(
    moldura,
    `${secoes}${blocoAssinaturas(empresa?.local ?? null, hoje, [
      { nome: empresa?.responsavel ?? null, papel: 'Responsável técnico' },
      { nome: d.coordenador || null, papel: 'Coordenador(a) da emergência' },
    ])}`,
    `${CSS_SECOES} table { width: 100%; } tbody th { text-align: left; width: 30%; } ol { padding-left: 18px; } li { margin-bottom: 4px; } .alerta { color: #EF4444; }`,
  );
}
