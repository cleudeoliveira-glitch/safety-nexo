import * as tokens from '@safety-nexo/design-tokens';
import { documentoHtml, escape, Moldura } from './layout';

export type RiscoPdf = { tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; severidade: string };
export type GhePdf = { nome: string; descricao: string | null; riscos: RiscoPdf[]; colaboradores: number };

const severidadeCor: Record<string, string> = {
  BAIXA: tokens.colors.success,
  MEDIA: tokens.colors.warning,
  ALTA: tokens.colors.danger,
};

export function renderPgrHtml(moldura: Moldura, ghes: GhePdf[]): string {
  const corpo = ghes
    .map(
      (ghe) => `
      <section class="ghe">
        <h2>${escape(ghe.nome)} <span class="meta">${ghe.colaboradores} colaborador(es)</span></h2>
        ${ghe.descricao ? `<p class="descricao">${escape(ghe.descricao)}</p>` : ''}
        <table>
          <thead>
            <tr><th>Tipo</th><th>Agente / perigo</th><th>Fonte geradora</th><th>Medidas de controle</th><th>Severidade</th></tr>
          </thead>
          <tbody>
            ${ghe.riscos
              .map(
                (r) => `<tr>
                  <td>${escape(r.tipo)}</td>
                  <td>${escape(r.agente)}</td>
                  <td>${escape(r.fonteGeradora)}</td>
                  <td>${escape(r.medidasControle)}</td>
                  <td><span class="badge" style="background:${severidadeCor[r.severidade] ?? tokens.colors.border}">${escape(r.severidade)}</span></td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>`,
    )
    .join('');

  return documentoHtml(moldura, corpo || '<p>Nenhum GHE cadastrado.</p>');
}
