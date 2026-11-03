import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { barrasSvg, linhaSvg, rosquinhaSvg } from './graficos';
import type { SsmaService } from './ssma.service';

type Dados = Awaited<ReturnType<SsmaService['montar']>>;
const n = (v: number | null, d = 2) => (v == null ? '-' : v.toLocaleString('pt-BR', { maximumFractionDigits: d }));
const real = (v: number | null) => (v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const seta = (v: number | null) => (v == null ? 'sem mês anterior para comparar' : v === 0 ? 'igual ao mês anterior' : `${v > 0 ? '▲ subiu' : '▼ caiu'} ${n(Math.abs(v), 1)}% em relação ao mês anterior`);

export function painelSsmaHtml(m: Moldura & { qr?: string }, d: Dados) {
  const a = d.atual; const e = d.estrategico;
  return documentoHtml(m, `
    <h2>Saúde da empresa: ${d.saude == null ? '-' : `${d.saude}%`}</h2>
    <p class="meta">Média dos itens em dia abaixo (itens sem dado ficam de fora).</p>
    <table><tr><th>Item</th><th>Em dia</th><th>%</th></tr>
    ${d.emDia.map((x) => `<tr><td>${escape(x.item)}</td><td>${x.de ? `${x.ok} de ${x.de}` : 'sem registro'}</td><td>${x.pct == null ? '-' : `${x.pct}%`}</td></tr>`).join('')}</table>

    <h2>Taxas do mês (NBR 14280)</h2>
    <table><tr><th>Indicador</th><th>Valor</th><th>Comparação</th></tr>
    <tr><td>Taxa de frequência (TF)</td><td>${n(a.tf)}</td><td>${seta(a.variacaoTf)}</td></tr>
    <tr><td>Taxa de gravidade (TG)</td><td>${n(a.tg)}</td><td>${seta(a.variacaoTg)}</td></tr>
    <tr><td>Acidentes / dias perdidos</td><td>${a.acidentes} / ${a.diasPerdidos}</td><td>HHT ${n(a.hht, 0)}${a.hhtEstimado ? ' (estimado)' : ''}</td></tr></table>
    <p class="meta">TF = acidentes × 1.000.000 ÷ horas-homem trabalhadas. TG = dias perdidos × 1.000.000 ÷ horas-homem trabalhadas. Horas estimadas = funcionários × jornada diária × dias úteis do mês.</p>

    <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:8px">
      ${linhaSvg('TF nos últimos 12 meses', d.serie.map((s) => ({ mes: s.mes, v: s.tf })))}
      ${linhaSvg('TG nos últimos 12 meses', d.serie.map((s) => ({ mes: s.mes, v: s.tg })))}
      ${rosquinhaSvg('Acidentes com e sem afastamento (12 meses)', d.afastamento.com, d.afastamento.sem)}
      ${barrasSvg('Acidentes por setor (12 meses)', d.ranking.map((r) => ({ nome: r.nome, v: r.acidentes })))}
    </div>

    <h2>Estratégico</h2>
    <table>
      <tr><td>Dias de atestado no mês</td><td>${e.diasAtestadoMes}${e.custoAbsenteismoMes != null ? ` · custo ${real(e.custoAbsenteismoMes)}` : ''}</td></tr>
      <tr><td>Dias de atestado em 12 meses</td><td>${e.diasAtestado12}${e.custoAbsenteismo12 != null ? ` · custo ${real(e.custoAbsenteismo12)}` : ''}</td></tr>
      <tr><td>CIDs com mais dias</td><td>${e.cids.length ? e.cids.map((x) => `${escape(x.cid)} (${x.dias} d)`).join(', ') : '-'}</td></tr>
      <tr><td>Dias pagos pelo INSS (após o 15º dia, 12 meses)</td><td>${e.diasInss12}</td></tr>
      <tr><td>Efeito do FAP na folha</td><td>${e.fap?.diferencaMensal != null ? `${e.fap.diferencaMensal <= 0 ? 'economia' : 'custo extra'} de ${real(Math.abs(e.fap.diferencaMensal))} por mês (FAP ${n(e.fap.fap, 4)}, ${e.fap.ano})` : 'informe o FAP e a folha na página FAP e RAT'}</td></tr>
      <tr><td>Setor com mais acidentes</td><td>${e.setorMaisCat ? `${escape(e.setorMaisCat.nome)} (${e.setorMaisCat.acidentes})` : '-'}</td></tr>
    </table>
    ${m.qr ? `<div style="margin-top:12px;display:flex;gap:10px;align-items:center"><img src="${m.qr}" width="70" height="70"/><span class="meta">Aponte a câmera para abrir o painel atualizado no Safety Nexo.</span></div>` : ''}`);
}
