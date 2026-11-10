import * as tokens from '@safety-nexo/design-tokens';
import { documentoHtml, escape, Moldura } from './layout';
import { FuncaoGhe } from '../empresas/ghe-ambiente';
import { DECISAO_NIVEL, NOME_GRAU, NOME_NIVEL, Nivel, nivelRisco } from './nivel-risco';

// PGR conforme a NR-01 (1.5.7): inventário de riscos + plano de ação, datado e assinado.

export type RiscoPdf = {
  tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; severidade: string; probabilidade: string;
  possiveisLesoes: string | null; tipoAvaliacao?: string | null; intensidade?: string | null; limiteTolerancia?: string | null;
};
export type GhePdf = {
  nome: string; descricao: string | null; riscos: RiscoPdf[]; colaboradores: number;
  setor?: string | null; funcoes?: FuncaoGhe[]; ambiente?: string;
};
export type AcaoPdf = { descricao: string; local: string | null; responsavel: string | null; prazo: Date | null; prioridade: string; status: string; origemTexto: string | null };
export type ExtrasPgr = {
  processos: string | null;
  acoes: AcaoPdf[];
  pontoEncontro: string | null;
  responsavel: { nome: string | null; registro: string | null };
  representanteLegal: string | null;
  emitidoEm: Date;
};

const TIPO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico', ERGONOMICO: 'Ergonômico', ACIDENTE: 'Acidente' };
const COR_NIVEL: Record<Nivel, string> = { BAIXO: tokens.colors.success, MODERADO: tokens.colors.warning, ALTO: tokens.colors.danger, CRITICO: '#7F1D1D' };
const STATUS: Record<string, string> = { ABERTA: 'A fazer', ANDAMENTO: 'Em andamento', FEITA: 'Feita' };
const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const selo = (nivel: Nivel) => `<span class="badge" style="background:${COR_NIVEL[nivel]}">${NOME_NIVEL[nivel]}</span>`;

// Psicossocial entra pelo módulo próprio com o agente "Fatores psicossociais: ...": no PDF aparece com o nome certo.
const tipoDoRisco = (r: RiscoPdf) => (/^fatores psicossociais/i.test(r.agente) ? 'Psicossocial' : TIPO[r.tipo] ?? escape(r.tipo));

function avaliacao(r: RiscoPdf) {
  if (r.tipoAvaliacao === 'QUANTITATIVA') return `Quantitativa${r.intensidade ? `: ${escape(r.intensidade)}` : ''}${r.limiteTolerancia ? ` (limite ${escape(r.limiteTolerancia)})` : ''}`;
  if (r.tipoAvaliacao === 'QUALITATIVA') return 'Qualitativa';
  return 'Qualitativa (preliminar)';
}

function matriz() {
  const linhas = ['ALTA', 'MEDIA', 'BAIXA']
    .map((p) => `<tr><th>${NOME_GRAU[p]}</th>${['BAIXA', 'MEDIA', 'ALTA'].map((s) => `<td class="c">${selo(nivelRisco(s, p))}</td>`).join('')}</tr>`)
    .join('');
  return `
    <table class="matriz">
      <thead><tr><th>Probabilidade ↓ / Severidade →</th><th class="c">Baixa</th><th class="c">Média</th><th class="c">Alta</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <table>
      <thead><tr><th>Nível</th><th>Decisão</th></tr></thead>
      <tbody>${(Object.keys(DECISAO_NIVEL) as Nivel[]).map((n) => `<tr><td>${selo(n)}</td><td>${DECISAO_NIVEL[n]}</td></tr>`).join('')}</tbody>
    </table>`;
}

// Funções do GHE e o que cada uma faz (NR-01, 1.5.7.3.2, b).
function funcoesHtml(ghe: GhePdf): string {
  const funcoes = ghe.funcoes ?? [];
  if (!funcoes.length) {
    return `<p class="descricao"><strong>Atividades:</strong> ${ghe.descricao ? escape(ghe.descricao) : '<span class="falta">não descritas</span>'}</p>`;
  }
  return `<p class="descricao"><strong>Funções:</strong> ${funcoes.map((f) => `${escape(f.nome)}${f.cbo ? ` (CBO ${escape(f.cbo)})` : ''}`).join(', ')}</p>
    ${funcoes.map((f) => `<p class="descricao"><strong>${escape(f.nome)}:</strong> ${f.atividades ? escape(f.atividades) : '<span class="falta">atividades a descrever</span>'}</p>`).join('')}
    ${ghe.descricao ? `<p class="descricao">${escape(ghe.descricao)}</p>` : ''}`;
}

// Cada GHE com o seu ambiente: o administrativo não é descrito igual à solda.
function ambientesHtml(ghes: GhePdf[]): string {
  if (!ghes.length) return '';
  return ghes
    .map((g) => `<p><strong>${escape(g.nome)}</strong>${g.setor && !g.nome.includes(g.setor) ? ` (setor ${escape(g.setor)})` : ''}: ${g.ambiente ? escape(g.ambiente) : '<span class="falta">falta descrever o ambiente deste GHE (edificação, piso, iluminação, ventilação, máquinas).</span>'}</p>`)
    .join('');
}

export function renderPgrHtml(moldura: Moldura, ghes: GhePdf[], extras: ExtrasPgr): string {
  const todos = ghes.flatMap((g) => g.riscos.map((r) => ({ ghe: g.nome, r, nivel: nivelRisco(r.severidade, r.probabilidade) })));
  const prioritarios = todos.filter((x) => x.nivel === 'ALTO' || x.nivel === 'CRITICO');

  const inventario = ghes
    .map(
      (ghe) => `
      <section class="ghe">
        <h3>${escape(ghe.nome)} <span class="meta">${ghe.colaboradores} colaborador(es)</span></h3>
        ${funcoesHtml(ghe)}
        ${
          ghe.riscos.length
            ? `<table>
          <thead>
            <tr><th>Tipo</th><th>Perigo ou fator de risco</th><th>Fonte ou circunstância</th><th>Possíveis lesões ou agravos</th><th>Avaliação</th><th class="c">Sev.</th><th class="c">Prob.</th><th class="c">Nível</th><th>Medidas de prevenção</th></tr>
          </thead>
          <tbody>
            ${ghe.riscos
              .map(
                (r) => `<tr>
                  <td>${tipoDoRisco(r)}</td>
                  <td>${escape(r.agente)}</td>
                  <td>${escape(r.fonteGeradora)}</td>
                  <td>${r.possiveisLesoes ? escape(r.possiveisLesoes) : '<span class="falta">a informar</span>'}</td>
                  <td>${avaliacao(r)}</td>
                  <td class="c">${NOME_GRAU[r.severidade] ?? escape(r.severidade)}</td>
                  <td class="c">${NOME_GRAU[r.probabilidade] ?? escape(r.probabilidade)}</td>
                  <td class="c">${selo(nivelRisco(r.severidade, r.probabilidade))}</td>
                  <td>${r.medidasControle ? escape(r.medidasControle) : '<span class="falta">a definir</span>'}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>`
            : '<p class="falta">Nenhum risco cadastrado neste GHE.</p>'
        }
      </section>`,
    )
    .join('');

  const acoes = extras.acoes.length
    ? `<table>
        <thead><tr><th>O que fazer</th><th>Onde</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Situação</th><th>Origem</th></tr></thead>
        <tbody>${extras.acoes
          .map(
            (a) => `<tr><td>${escape(a.descricao)}</td><td>${escape(a.local)}</td><td>${a.responsavel ? escape(a.responsavel) : '<span class="falta">a definir</span>'}</td>
              <td>${a.prazo ? data(a.prazo) : '<span class="falta">a definir</span>'}</td><td>${NOME_GRAU[a.prioridade] ?? escape(a.prioridade)}</td>
              <td>${STATUS[a.status] ?? escape(a.status)}</td><td>${escape(a.origemTexto ?? 'Manual')}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
    : '<p class="falta">Ainda não há ações cadastradas.</p>';

  const prioritariosHtml = prioritarios.length
    ? `<p>Estes são os riscos que pedem atenção primeiro:</p>
       <ul>${prioritarios.map((x) => `<li>${selo(x.nivel)} <strong>${escape(x.ghe)}</strong>: ${escape(x.r.agente)} (${escape(x.r.fonteGeradora)})</li>`).join('')}</ul>`
    : '<p>Nenhum risco ficou em nível alto ou crítico.</p>';

  const corpo = `
    <section>
      <h2>1. Processos e ambientes de trabalho</h2>
      ${extras.processos ? `<p>${escape(extras.processos).replace(/\n/g, '<br>')}</p>` : ''}
      ${ghes.length ? `<p>Cada grupo de exposição tem o seu ambiente:</p>${ambientesHtml(ghes)}` : '<p class="falta">Falta cadastrar os GHEs e descrever o ambiente de cada um.</p>'}
    </section>

    <section>
      <h2>2. Como os riscos foram avaliados</h2>
      <p>Percorremos os setores, acompanhamos as atividades e conversamos com quem faz o trabalho. Para cada perigo encontrado, avaliamos
      o tamanho do dano que ele pode causar (severidade) e a chance de isso acontecer com as proteções que já existem hoje (probabilidade).
      O cruzamento das duas coisas dá o nível de risco, que define o que resolver primeiro.</p>
      ${matriz()}
      <p>Na escolha das medidas, a preferência é sempre tirar o perigo do caminho ou trocá-lo por algo mais seguro. Quando isso não dá,
      vêm as proteções coletivas, depois a organização do trabalho, e o EPI fica como último recurso.</p>
    </section>

    <section>
      <h2>3. Inventário de riscos</h2>
      ${inventario || '<p class="falta">Nenhum GHE cadastrado.</p>'}
    </section>

    <section>
      <h2>4. Plano de ação</h2>
      ${prioritariosHtml}
      ${acoes}
      <p>Cada ação concluída ganha data e foto de comprovação. O andamento é conferido nas visitas de inspeção e o plano é revisto junto com o PGR.</p>
    </section>

    <section>
      <h2>5. Preparação para emergências</h2>
      <p>O que fazer em caso de incêndio, acidente ou outra emergência está no Plano de Emergência da empresa${extras.pontoEncontro ? `. O ponto de encontro é: <strong>${escape(extras.pontoEncontro)}</strong>` : ''}.</p>
    </section>

    <section>
      <h2>6. Revisão</h2>
      <p>Este PGR vale por até 2 anos. Ele deve ser revisto antes disso se mudar algum processo, máquina ou setor, se acontecer um acidente
      ou adoecimento ligado ao trabalho, ou se alguma medida não estiver funcionando.</p>
    </section>

    <p>Emitido em ${data(extras.emitidoEm)}.</p>
    <div class="assinaturas">
      <div class="assinatura">${escape(extras.responsavel.nome ?? '')}<span>Responsável pela elaboração${extras.responsavel.registro ? ` · ${escape(extras.responsavel.registro)}` : ''}</span></div>
      <div class="assinatura">${escape(extras.representanteLegal ?? '')}<span>Representante da organização</span></div>
    </div>`;

  return documentoHtml(
    moldura,
    corpo,
    `h3 { color: ${tokens.colors.primary}; font-size: 13px; margin: 14px 0 4px; }
     .ghe table { font-size: 10px; } .c { text-align: center; } .falta { color: ${tokens.colors.danger}; }
     .matriz { width: auto; margin-bottom: 8px; } .matriz td, .matriz th { min-width: 80px; }`,
  );
}
