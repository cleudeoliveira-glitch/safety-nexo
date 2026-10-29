import { documentoHtml, escape, Moldura } from '../documentos/layout';

export type AsoPdf = {
  colaborador: { nome: string; cpf: string | null; cargo: string; ghe: string | null };
  tipo: string;
  dataExame: Date;
  resultado: string;
  exames: string[];
  riscos: string[];
  medicoExaminador: { nome: string; crm: string };
  medicoPcmso: { nome: string | null; crm: string | null };
  proximoExame: Date | null;
  observacoes: string | null;
};

const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export function renderAsoHtml(moldura: Moldura, aso: AsoPdf): string {
  const apto = aso.resultado === 'APTO';
  const corpo = `
    <h2>Trabalhador</h2>
    <div class="info">
      <div><strong>Nome:</strong> ${escape(aso.colaborador.nome)}</div>
      <div><strong>CPF:</strong> ${escape(aso.colaborador.cpf)}</div>
      <div><strong>Função:</strong> ${escape(aso.colaborador.cargo)}</div>
      <div><strong>GHE:</strong> ${escape(aso.colaborador.ghe)}</div>
    </div>

    <h2>Exame ${escape(aso.tipo.toLowerCase())} · ${data(aso.dataExame)}</h2>
    <p><strong>Riscos ocupacionais:</strong> ${aso.riscos.length ? aso.riscos.map(escape).join(', ') : 'Ausência de riscos ocupacionais específicos'}</p>
    <p><strong>Procedimentos realizados:</strong> ${aso.exames.length ? aso.exames.map(escape).join(', ') : '—'}</p>

    <div class="resultado ${apto ? 'apto' : 'inapto'}">${apto ? 'APTO' : 'INAPTO'} para a função</div>
    ${aso.proximoExame ? `<p><strong>Próximo exame periódico:</strong> ${data(aso.proximoExame)}</p>` : ''}
    ${aso.observacoes ? `<p><strong>Observações:</strong> ${escape(aso.observacoes)}</p>` : ''}

    <div class="assinaturas">
      <div>
        <div class="linha"></div>
        ${escape(aso.medicoExaminador.nome)} · CRM ${escape(aso.medicoExaminador.crm)}<br /><span class="meta">Médico examinador</span>
      </div>
      <div>
        <div class="linha"></div>
        ${escape(aso.colaborador.nome)}<br /><span class="meta">Trabalhador</span>
      </div>
    </div>
    <p class="meta">Médico responsável pelo PCMSO: ${escape(aso.medicoPcmso.nome)} · CRM ${escape(aso.medicoPcmso.crm)}</p>`;

  return documentoHtml(
    moldura,
    corpo,
    `.resultado { margin: 16px 0; padding: 12px; border-radius: 10px; font-size: 16px; font-weight: 700; text-align: center; color: #fff; }
     .apto { background: #10B981; } .inapto { background: #EF4444; }
     .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; text-align: center; }
     .linha { border-top: 1px solid #1F2937; margin-bottom: 6px; }`,
  );
}
