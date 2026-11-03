import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { SENSOS } from './cinco-s';

const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit' });
const dataCurta = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
type Atividade = { data: Date; horario: string; titulo: string; responsavel: string; local: string; duracaoMin: number; presentes: string[] };

export function programacaoHtml(m: Moldura, s: { ano: number; tema: string; inicio: Date; fim: Date }, atividades: Atividade[]) {
  const dias = [...new Set(atividades.map((a) => a.data.toISOString().slice(0, 10)))];
  return documentoHtml({ ...m, infos: [...m.infos, ['Período', `${dataCurta(s.inicio)} a ${dataCurta(s.fim)}`]] }, `
    <h2 style="text-align:center;font-size:20px">${escape(s.tema)}</h2>
    ${dias.map((d) => `
      <h2>${escape(data(new Date(`${d}T12:00:00Z`)))}</h2>
      <table><tr><th style="width:80px">Horário</th><th>Atividade</th><th>Com</th><th>Local</th></tr>
      ${atividades.filter((a) => a.data.toISOString().slice(0, 10) === d).map((a) => `<tr><td>${escape(a.horario)}</td><td>${escape(a.titulo)}</td><td>${escape(a.responsavel)}</td><td>${escape(a.local)}</td></tr>`).join('')}
      </table>`).join('')}
    <p class="meta">Participe! A SIPAT é organizada pela CIPA junto com a empresa.</p>`);
}

export function presencaHtml(m: Moldura, a: Atividade, pessoas: { nome: string; cargo: string }[]) {
  return documentoHtml({ ...m, infos: [...m.infos, ['Atividade', a.titulo], ['Data', `${dataCurta(a.data)} · ${a.horario}`]] }, `
    <p>${escape(a.titulo)} · com ${escape(a.responsavel)} · ${escape(a.local)} · ${a.duracaoMin} min</p>
    <table><tr><th style="width:30px">Nº</th><th>Nome</th><th>Função</th><th style="width:35%">Assinatura</th></tr>
    ${pessoas.map((p, i) => `<tr><td>${i + 1}</td><td>${escape(p.nome)}</td><td>${escape(p.cargo)}</td><td style="height:22px"></td></tr>`).join('')}
    </table>
    <div class="assinaturas"><div class="assinatura">${escape(a.responsavel)}<span>Quem conduziu</span></div></div>`);
}

export function relatorioSipatHtml(m: Moldura, s: { tema: string; inicio: Date; fim: Date }, atividades: Atividade[], totalFuncionarios: number) {
  const pessoas = new Set(atividades.flatMap((a) => a.presentes));
  return documentoHtml(m, `
    <h2>Resumo</h2>
    <p>SIPAT "${escape(s.tema)}", de ${dataCurta(s.inicio)} a ${dataCurta(s.fim)}: ${atividades.length} atividade(s), ${pessoas.size} de ${totalFuncionarios} funcionário(s) participaram de pelo menos uma.</p>
    <table><tr><th>Data</th><th>Atividade</th><th>Com</th><th style="width:90px">Presentes</th></tr>
    ${atividades.map((a) => `<tr><td>${dataCurta(a.data)} ${escape(a.horario)}</td><td>${escape(a.titulo)}</td><td>${escape(a.responsavel)}</td><td>${a.presentes.length}</td></tr>`).join('')}
    </table>
    <div class="assinaturas"><div class="assinatura">Presidente da CIPA<span>Nome e assinatura</span></div><div class="assinatura">Responsável pela empresa<span>Nome e assinatura</span></div></div>`);
}

export function auditoria5sHtml(m: Moldura, a: { setor: string; data: Date; auditor: string; notas: Record<string, number>; observacoes: string | null },
  resultado: { porSenso: { id: string; nome: string; percentual: number }[]; total: number }, anterior: number | null) {
  const rot = ['Não atende', 'Atende pouco', 'Atende em parte', 'Quase tudo', 'Totalmente'];
  return documentoHtml({ ...m, infos: [...m.infos, ['Setor', a.setor], ['Data', dataCurta(a.data)], ['Auditor(a)', a.auditor]] }, `
    <h2>Nota do setor: ${resultado.total}%${anterior !== null ? ` <span style="font-size:12px;color:#6B7280">(auditoria anterior: ${anterior}%)</span>` : ''}</h2>
    <table><tr>${resultado.porSenso.map((s) => `<th>${escape(s.nome)}</th>`).join('')}</tr><tr>${resultado.porSenso.map((s) => `<td style="text-align:center;font-weight:bold">${s.percentual}%</td>`).join('')}</tr></table>
    ${SENSOS.map((s) => `
      <h2>${escape(s.nome)}</h2>
      <table>${s.itens.map((item, i) => { const n = a.notas[`${s.id}-${i + 1}`] ?? 0; return `<tr><td>${escape(item)}</td><td style="width:140px">${n} · ${rot[n]}</td></tr>`; }).join('')}</table>`).join('')}
    ${a.observacoes ? `<h2>Observações</h2><p>${escape(a.observacoes)}</p>` : ''}
    <div class="assinaturas"><div class="assinatura">${escape(a.auditor)}<span>Auditor(a)</span></div><div class="assinatura">Responsável pelo setor<span>Nome e assinatura</span></div></div>`);
}
