import * as tokens from '@safety-nexo/design-tokens';
import { documentoHtml, escape, Moldura } from './layout';
import { DECISAO_NIVEL, NOME_GRAU, NOME_NIVEL, Nivel, nivelRisco } from './nivel-risco';

// PGR conforme a NR-01 (1.5.7): inventário de riscos + plano de ação, datado e assinado.

export type RiscoPdf = {
  tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; severidade: string; probabilidade: string;
  possiveisLesoes: string | null; tipoAvaliacao?: string | null; intensidade?: string | null; limiteTolerancia?: string | null;
};
export type GhePdf = { nome: string; descricao: string | null; riscos: RiscoPdf[]; colaboradores: number };
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

export function renderPgrHtml(moldura: Moldura, ghes: GhePdf[], extras: ExtrasPgr): string {
  const todos = ghes.flatMap((g) => g.riscos.map((r) => ({ ghe: g.nome, r, nivel: nivelRisco(r.severidade, r.probabilidade) })));
  const prioritarios = todos.filter((x) => x.nivel === 'ALTO' || x.nivel === 'CRITICO');

  const inventario = ghes
    .map(
      (ghe) => `
      <section class="ghe">
        <h3>${escape(ghe.nome)} <span class="meta">${ghe.colaboradores} colaborador(es)</span></h3>
        <p class="descricao"><strong>Atividades:</strong> ${ghe.descricao ? escape(ghe.descricao) : '<span class="falta">não descritas</span>'}</p>
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
    : '<p class="falta">Nenhuma ação cadastrada no plano de ação da empresa.</p>';

  const prioritariosHtml = prioritarios.length
    ? `<p>Riscos de nível alto ou crítico, que precisam de ação no cronograma abaixo:</p>
       <ul>${prioritarios.map((x) => `<li>${selo(x.nivel)} <strong>${escape(x.ghe)}</strong>: ${escape(x.r.agente)} (${escape(x.r.fonteGeradora)})</li>`).join('')}</ul>`
    : '<p>Nenhum risco classificado como alto ou crítico.</p>';

  const corpo = `
    <section>
      <h2>1. Processos e ambientes de trabalho</h2>
      <p>${extras.processos ? escape(extras.processos).replace(/\n/g, '<br>') : '<span class="falta">Descrição dos processos e ambientes ainda não informada.</span>'}</p>
    </section>

    <section>
      <h2>2. Critérios de avaliação e tomada de decisão</h2>
      <p>Os perigos foram identificados por inspeção dos ambientes e das atividades, com consulta aos trabalhadores. Cada risco recebeu uma
      <strong>severidade</strong> (gravidade da lesão ou do agravo possível) e uma <strong>probabilidade</strong> (chance de acontecer, considerando as medidas
      já existentes). O cruzamento das duas dá o <strong>nível de risco</strong> (NR-01, 1.5.4.4.2), que define a prioridade no plano de ação.</p>
      ${matriz()}
      <p>As medidas de prevenção seguem esta ordem de prioridade (NR-01): eliminar o perigo; trocar por algo menos perigoso; proteção coletiva;
      medidas administrativas e de organização do trabalho; e, por último, equipamento de proteção individual.</p>
    </section>

    <section>
      <h2>3. Inventário de riscos</h2>
      ${inventario || '<p class="falta">Nenhum GHE cadastrado.</p>'}
    </section>

    <section>
      <h2>4. Plano de ação</h2>
      ${prioritariosHtml}
      ${acoes}
      <p><strong>Acompanhamento:</strong> o plano é acompanhado pela consultoria no sistema, conferido nas inspeções periódicas e revisto junto com o PGR.
      Ao concluir cada ação, registra-se a data e a evidência, e verifica-se se o risco foi reduzido.</p>
    </section>

    <section>
      <h2>5. Preparação para emergências</h2>
      <p>Os procedimentos de resposta a emergências estão no Plano de Emergência da empresa${extras.pontoEncontro ? `. Ponto de encontro: <strong>${escape(extras.pontoEncontro)}</strong>` : ''} (NR-01, 1.5.6).</p>
    </section>

    <section>
      <h2>6. Revisão</h2>
      <p>A avaliação de riscos deve ser revista a cada 2 anos, ou antes, quando houver mudança nos processos, nos ambientes ou nas medidas,
      após acidente ou doença relacionada ao trabalho, ou quando o acompanhamento mostrar que as medidas não funcionam (NR-01, 1.5.4.4.6).</p>
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
