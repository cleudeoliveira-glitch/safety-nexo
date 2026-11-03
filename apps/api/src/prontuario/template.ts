import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { audiogramaSvg, Espiro, FREQUENCIAS, Limiares } from './audiometria';

const d = (x: Date | null) => (x ? x.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');
const n = (v: number | null, s = '') => (v == null ? '-' : `${v.toLocaleString('pt-BR')}${s}`);
type Reg = { tipo: string; data: Date; titulo: string; resultado: string | null; dados: unknown; profissional: string | null; lote: string | null; proximaData: Date | null; observacao: string | null };
type Aso = { tipo: string; dataExame: Date; resultado: string; medicoExaminadorNome: string; medicoExaminadorCrm: string; exames: string[]; proximoExame: Date | null };
const TIPO_ASO: Record<string, string> = { ADMISSIONAL: 'Admissional', PERIODICO: 'Periódico', RETORNO_TRABALHO: 'Retorno ao trabalho', MUDANCA_RISCO: 'Mudança de risco', DEMISSIONAL: 'Demissional' };

export function prontuarioHtml(m: Moldura, asos: Aso[], regs: Reg[]) {
  const vac = regs.filter((r) => r.tipo === 'VACINA');
  const aud = regs.filter((r) => r.tipo === 'AUDIOMETRIA');
  const esp = regs.filter((r) => r.tipo === 'ESPIROMETRIA');
  const out = regs.filter((r) => r.tipo === 'OUTRO');
  return documentoHtml(m, `
    <p class="meta">Documento com dados de saúde: guarde com sigilo e entregue só ao próprio funcionário ou ao médico responsável.</p>
    <h2>ASOs</h2>
    ${asos.length ? `<table><tr><th>Data</th><th>Tipo</th><th>Resultado</th><th>Exames</th><th>Médico</th><th>Próximo</th></tr>
    ${asos.map((a) => `<tr><td>${d(a.dataExame)}</td><td>${escape(TIPO_ASO[a.tipo] ?? a.tipo)}</td><td>${a.resultado === 'APTO' ? 'Apto' : 'Inapto'}</td><td>${escape(a.exames.join(', '))}</td><td>${escape(a.medicoExaminadorNome)} (${/^crm/i.test(a.medicoExaminadorCrm) ? "" : "CRM "}${escape(a.medicoExaminadorCrm)})</td><td>${d(a.proximoExame)}</td></tr>`).join('')}</table>` : '<p>Nenhum ASO registrado.</p>'}
    <h2>Vacinas</h2>
    ${vac.length ? `<table><tr><th>Data</th><th>Vacina e dose</th><th>Lote</th><th>Aplicada por</th><th>Próxima dose</th></tr>
    ${vac.map((r) => `<tr><td>${d(r.data)}</td><td>${escape(r.titulo)}</td><td>${escape(r.lote ?? '-')}</td><td>${escape(r.profissional ?? '-')}</td><td>${d(r.proximaData)}</td></tr>`).join('')}</table>` : '<p>Nenhuma vacina registrada.</p>'}
    <h2>Audiometrias</h2>
    ${aud.length ? aud.map((r) => {
      const l = r.dados as Limiares;
      return `<div style="page-break-inside:avoid"><p><strong>${d(r.data)} · ${escape(r.titulo)}</strong>${r.profissional ? ` · ${escape(r.profissional)}` : ''}</p>
      <table><tr><th>Hz</th>${FREQUENCIAS.map((f) => `<th>${f}</th>`).join('')}</tr>
      <tr><td>Direita</td>${FREQUENCIAS.map((f) => `<td>${n(l.od[String(f)])}</td>`).join('')}</tr>
      <tr><td>Esquerda</td>${FREQUENCIAS.map((f) => `<td>${n(l.oe[String(f)])}</td>`).join('')}</tr></table>
      ${audiogramaSvg(l)}
      ${r.resultado ? `<p>Conclusão: ${escape(r.resultado)}</p>` : ''}${r.proximaData ? `<p>Próxima audiometria: ${d(r.proximaData)}</p>` : ''}</div>`;
    }).join('') : '<p>Nenhuma audiometria registrada.</p>'}
    <h2>Espirometrias</h2>
    ${esp.length ? `<table><tr><th>Data</th><th>Exame</th><th>CVF</th><th>VEF1</th><th>VEF1/CVF</th><th>Conclusão</th><th>Próxima</th></tr>
    ${esp.map((r) => { const e = r.dados as Espiro; return `<tr><td>${d(r.data)}</td><td>${escape(r.titulo)}</td><td>${n(e.cvf, ' L')} (${n(e.cvfPct, '%')})</td><td>${n(e.vef1, ' L')} (${n(e.vef1Pct, '%')})</td><td>${n(e.relacao, '%')}</td><td>${escape(r.resultado ?? '-')}</td><td>${d(r.proximaData)}</td></tr>`; }).join('')}</table>` : '<p>Nenhuma espirometria registrada.</p>'}
    ${out.length ? `<h2>Outros exames</h2><table><tr><th>Data</th><th>Exame</th><th>Resultado</th><th>Próximo</th></tr>${out.map((r) => `<tr><td>${d(r.data)}</td><td>${escape(r.titulo)}</td><td>${escape(r.resultado ?? '-')}</td><td>${d(r.proximaData)}</td></tr>`).join('')}</table>` : ''}
    <p class="meta">Os resultados e conclusões são os informados pelos profissionais que fizeram os exames.</p>`);
}
