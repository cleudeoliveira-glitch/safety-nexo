import { documentoHtml, escape, Moldura } from '../documentos/layout';

export type EntregaPdf = { epi: string; ca: string; validadeCa: Date | null; quantidade: number; motivo: string; dataEntrega: Date };

const MOTIVOS: Record<string, string> = {
  ENTREGA_INICIAL: 'Entrega inicial',
  DESGASTE: 'Troca por desgaste',
  PERDA: 'Troca por perda',
  DANO: 'Troca por dano',
};

const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');

export function renderFichaEpiHtml(
  moldura: Moldura,
  colaborador: { nome: string; cpf: string | null; cargo: string },
  entregas: EntregaPdf[],
): string {
  const corpo = `
    <h2>Trabalhador</h2>
    <div class="info">
      <div><strong>Nome:</strong> ${escape(colaborador.nome)}</div>
      <div><strong>CPF:</strong> ${escape(colaborador.cpf)}</div>
      <div><strong>Função:</strong> ${escape(colaborador.cargo)}</div>
    </div>

    <h2>Entregas de EPI</h2>
    <table>
      <thead><tr><th>Data</th><th>EPI</th><th>CA</th><th>Validade do CA</th><th>Qtd.</th><th>Motivo</th><th>Assinatura</th></tr></thead>
      <tbody>
        ${entregas
          .map(
            (e) => `<tr>
              <td>${data(e.dataEntrega)}</td>
              <td>${escape(e.epi)}</td>
              <td>${escape(e.ca)}</td>
              <td>${data(e.validadeCa)}</td>
              <td>${e.quantidade}</td>
              <td>${escape(MOTIVOS[e.motivo] ?? e.motivo)}</td>
              <td class="assinar"></td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>

    <p class="declaracao">Declaro que recebi os EPIs acima, gratuitamente, e o treinamento sobre seu uso, guarda e conservação.
    Comprometo-me a usá-los apenas para a finalidade a que se destinam e a comunicar qualquer alteração que os torne impróprios para uso (NR-06).</p>`;

  return documentoHtml(
    moldura,
    corpo,
    `.assinar { width: 120px; } .declaracao { margin-top: 18px; font-size: 11px; line-height: 1.5; }`,
  );
}
