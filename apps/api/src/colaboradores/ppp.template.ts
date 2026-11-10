import { documentoHtml, escape, Moldura } from '../documentos/layout';

export type DadosPpp = {
  empresa: { razaoSocial: string; cnpj: string; cnae: string | null };
  trabalhador: { nome: string; cpf: string | null; dataAdmissao: Date | null; dataDesligamento?: Date | null; cargo: string; cbo: string | null; ghe: string | null };
  agentes: {
    tipo: string; agente: string; tipoAvaliacao: string | null; intensidade: string | null; tecnicaMedicao: string | null;
    epcEficaz: boolean | null; epiEficaz: boolean | null; epiCa: string | null;
  }[];
  asos: { dataExame: Date; tipo: string; resultado: string; exames: string[] }[];
  responsavelAmbiental: { nome: string | null; registro: string | null };
  medicoPcmso: { nome: string | null; crm: string | null };
  representanteLegal: string | null;
  emitidoEm: Date;
};

const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const simNao = (v: boolean | null) => (v === null ? '—' : v ? 'S' : 'N');
const TIPO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico', ERGONOMICO: 'Ergonômico', ACIDENTE: 'Acidente' };
const linha = (rotulo: string, valor: string | null) => `<tr><th style="width:32%">${rotulo}</th><td>${escape(valor ?? '—')}</td></tr>`;

export function renderPppHtml(moldura: Moldura, d: DadosPpp): string {
  const t = d.trabalhador;
  return documentoHtml(
    moldura,
    `
    <p class="nota">Desde 2023, o PPP oficial sai pelo eSocial, com os dados do evento S-2240. Este documento serve de apoio e para os
    períodos que não foram enviados ao eSocial.</p>
    <section>
      <h2>Seção I · Dados administrativos</h2>
      <table>
        ${linha('Empresa', d.empresa.razaoSocial)}${linha('CNPJ', d.empresa.cnpj)}${linha('CNAE', d.empresa.cnae)}
        ${linha('Trabalhador', t.nome)}${linha('CPF', t.cpf)}${linha('Data de admissão', data(t.dataAdmissao))}
        ${linha('Cargo', t.cargo)}${linha('CBO', t.cbo)}${linha('Setor / GHE', t.ghe)}
      </table>
    </section>
    <section>
      <h2>Seção II · Registros ambientais</h2>
      <p class="meta">Período: ${data(t.dataAdmissao)} até ${data(t.dataDesligamento ?? d.emitidoEm)}${t.dataDesligamento ? ' (data de saída)' : ''}</p>
      ${
        d.agentes.length
          ? `<table>
        <thead><tr><th>Tipo</th><th>Agente</th><th>Avaliação</th><th>Intensidade</th><th>Técnica</th><th>EPC eficaz</th><th>EPI eficaz</th><th>CA</th></tr></thead>
        <tbody>${d.agentes
          .map(
            (a) => `<tr><td>${TIPO[a.tipo] ?? a.tipo}</td><td>${escape(a.agente)}</td>
            <td>${a.tipoAvaliacao === 'QUANTITATIVA' ? 'Quantitativa' : a.tipoAvaliacao === 'QUALITATIVA' ? 'Qualitativa' : '—'}</td>
            <td>${escape(a.intensidade ?? '—')}</td><td>${escape(a.tecnicaMedicao ?? '—')}</td><td>${simNao(a.epcEficaz)}</td><td>${simNao(a.epiEficaz)}</td><td>${escape(a.epiCa ?? '—')}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
          : '<p>Não há agente nocivo registrado para o GHE deste trabalhador.</p>'
      }
      <p><strong>Responsável pelos registros ambientais:</strong> ${escape(d.responsavelAmbiental.nome ?? 'não informado')}${d.responsavelAmbiental.registro ? ` · ${escape(d.responsavelAmbiental.registro)}` : ''}</p>
    </section>
    <section>
      <h2>Seção III · Monitoração biológica</h2>
      ${
        d.asos.length
          ? `<table>
        <thead><tr><th>Data</th><th>Tipo</th><th>Exames</th><th>Resultado</th></tr></thead>
        <tbody>${d.asos.map((a) => `<tr><td>${data(a.dataExame)}</td><td>${escape(a.tipo)}</td><td>${escape(a.exames.join(', ') || '—')}</td><td>${a.resultado === 'APTO' ? 'Apto' : 'Inapto'}</td></tr>`).join('')}</tbody>
      </table>`
          : '<p>Nenhum ASO registrado.</p>'
      }
      <p><strong>Responsável pela monitoração biológica:</strong> ${escape(d.medicoPcmso.nome ?? 'não informado')}${d.medicoPcmso.crm ? ` · CRM ${escape(d.medicoPcmso.crm)}` : ''}</p>
    </section>
    <section>
      <h2>Seção IV · Responsáveis pelas informações</h2>
      <p>Declaramos que as informações deste documento são verdadeiras e foram copiadas fielmente dos registros da empresa,
      dos laudos ambientais e dos programas médicos sob responsabilidade dela.</p>
      <p>Emitido em ${data(d.emitidoEm)}.</p>
      <div class="assinaturas"><div class="assinatura">${escape(d.representanteLegal ?? '')}<span>Representante legal da empresa</span></div></div>
    </section>`,
    '.nota { background: #F8F9FB; border-radius: 8px; padding: 8px 10px; color: #6b7280; }',
  );
}
