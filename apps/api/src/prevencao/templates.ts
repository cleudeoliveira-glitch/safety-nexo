import { documentoHtml, escape, folhaHtml, Moldura } from '../documentos/layout';

const data = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const PRIORIDADE: Record<string, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
const ESFORCO: Record<string, string> = { RAPIDO: 'Rápido', MEDIO: 'Médio', DEMORADO: 'Demorado' };
export const CATEGORIA: Record<string, string> = { METODO: 'Método', MAQUINA: 'Máquina', MATERIAL: 'Material', PESSOAS: 'Pessoas', AMBIENTE: 'Ambiente', GESTAO: 'Gestão' };

type AcaoPdf = { descricao: string; origemTexto: string | null; local: string | null; responsavel: string | null; prazo: Date | null; prioridade: string; esforco: string; status: string; feitaEm: Date | null };

function tabelaAcoes(acoes: AcaoPdf[]) {
  const hoje = new Date();
  return `<table>
    <thead><tr><th>Nº</th><th>Ação</th><th>Origem</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Situação</th></tr></thead>
    <tbody>${acoes.map((a, i) => {
      const atrasada = a.status !== 'FEITA' && a.prazo && new Date(a.prazo) < hoje;
      const sit = a.status === 'FEITA' ? `<span class="ok">Feita ${data(a.feitaEm)}</span>` : atrasada ? '<span class="atraso">Atrasada</span>' : a.status === 'ANDAMENTO' ? 'Em andamento' : 'A fazer';
      return `<tr><td>${i + 1}</td><td>${escape(a.descricao)}${a.local ? `<br/><span class="meta">${escape(a.local)}</span>` : ''}</td><td>${escape(a.origemTexto || 'Manual')}</td><td>${escape(a.responsavel)}</td><td>${data(a.prazo)}</td><td>${PRIORIDADE[a.prioridade] ?? a.prioridade} · ${ESFORCO[a.esforco] ?? ''}</td><td>${sit}</td></tr>`;
    }).join('')}</tbody></table>`;
}
const CSS = `.ok { color: #10B981; font-weight: 600; } .atraso { color: #EF4444; font-weight: 600; } td:nth-child(2) { width: 38%; }`;

export function planoAcaoHtml(m: Omit<Moldura, 'aviso'>, acoes: AcaoPdf[]) {
  const feitas = acoes.filter((a) => a.status === 'FEITA').length;
  return documentoHtml({ ...m, aviso: 'Feito com o Safety Nexo. Acompanhe cada ação até ela ser concluída.' },
    `<p><strong>${acoes.length} ação(ões)</strong> · ${feitas} feita(s) · ${acoes.length - feitas} aberta(s)</p>${acoes.length ? tabelaAcoes(acoes) : '<p>Nenhuma ação cadastrada.</p>'}`, CSS);
}

export function investigacaoHtml(m: Moldura, inv: { titulo: string; dataOcorrencia: Date; local: string; descricao: string; equipe: string; porques: string[]; causas: { categoria: string; texto: string }[]; conclusao: string | null; vitima: string | null }, medidas: AcaoPdf[]) {
  const porCategoria = Object.entries(CATEGORIA).map(([id, nome]) => ({ nome, itens: inv.causas.filter((c) => c.categoria === id) })).filter((g) => g.itens.length);
  return documentoHtml(m, `
    <section>
      <h2>${escape(inv.titulo)}</h2>
      <p><strong>Data:</strong> ${data(inv.dataOcorrencia)} · <strong>Local:</strong> ${escape(inv.local)}${inv.vitima ? ` · <strong>Acidentado(a):</strong> ${escape(inv.vitima)}` : ''}</p>
      <p><strong>Equipe de investigação:</strong> ${escape(inv.equipe)}</p>
      <h2>O que aconteceu</h2><p>${escape(inv.descricao)}</p>
      ${inv.porques.length ? `<h2>5 porquês</h2><ol>${inv.porques.map((p) => `<li>${escape(p)}</li>`).join('')}</ol>` : ''}
      ${porCategoria.length ? `<h2>Causas encontradas</h2><table><thead><tr><th>Categoria</th><th>Causa</th></tr></thead><tbody>${porCategoria.map((g) => g.itens.map((c, i) => `<tr>${i === 0 ? `<td rowspan="${g.itens.length}"><strong>${g.nome}</strong></td>` : ''}<td>${escape(c.texto)}</td></tr>`).join('')).join('')}</tbody></table>` : ''}
      ${inv.conclusao ? `<h2>Conclusão</h2><p>${escape(inv.conclusao)}</p>` : ''}
      <h2>Medidas para não repetir</h2>${medidas.length ? tabelaAcoes(medidas) : '<p>Nenhuma medida cadastrada.</p>'}
    </section>
    <div class="assinaturas">
      <div class="assinatura">&nbsp;<span>Responsável pela investigação</span></div>
      <div class="assinatura">&nbsp;<span>Representante da empresa</span></div>
    </div>`, CSS);
}

export function cartazHtml(d: { empresa: string; logoEmpresa: string | null; consultoria: { nome: string; logo: string | null }; link: string; qr: string }) {
  return folhaHtml(`
    <div class="cartaz">
      ${d.logoEmpresa ? `<img class="logo" src="${d.logoEmpresa}" alt="" />` : ''}
      <h1>Viu algum perigo?<br/>Conte pra gente.</h1>
      <p class="sub">Quase acidente, algo quebrado, um risco no caminho ou uma ideia para melhorar.</p>
      <img class="qr" src="${d.qr}" alt="QR code" />
      <p class="passos">1. Aponte a câmera do celular para o código<br/>2. Escreva ou fale o que viu e, se puder, tire uma foto<br/>3. Envie. <strong>Não precisa se identificar.</strong></p>
      <p class="link">${escape(d.link)}</p>
      <p class="rodape">${escape(d.empresa)} · Segurança do trabalho: ${escape(d.consultoria.nome)}</p>
    </div>`,
    `.cartaz { text-align: center; padding-top: 10px; } .logo { height: 70px; } h1 { font-size: 38px; line-height: 1.2; margin: 18px 0 8px; }
     .sub { font-size: 16px; } .qr { width: 330px; margin: 18px auto; display: block; } .passos { font-size: 16px; line-height: 1.8; }
     .link { color: #6b7280; font-size: 11px; } .rodape { margin-top: 26px; font-size: 13px; }`);
}
