import type { PrismaClient } from '@prisma/client';
import { emailLigado, emailMoldura, enviarEmail } from '../common/email';

// Lembrete ao responsável de uma ação do plano: quando a ação tem e-mail do responsável, ele recebe um aviso
// 3 dias antes do prazo e, se atrasar, de novo a cada 7 dias até ser marcada como feita.
const DIA = 86_400_000;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export type AcaoParaAviso = { id: string; descricao: string; local: string | null; prazo: Date; responsavel: string | null; responsavelEmail: string; empresa: string; consultoria: string };

// Monta o e-mail de uma pessoa. Exportada para os testes.
export function emailDoResponsavel(acoes: AcaoParaAviso[], hoje = new Date()) {
  const nome = acoes.find((a) => a.responsavel)?.responsavel?.split(' ')[0] ?? '';
  const linhas = acoes.map((a) => {
    const atrasada = a.prazo.getTime() < hoje.getTime() - DIA / 2;
    return `<li style="margin-bottom:8px"><strong>${esc(a.descricao)}</strong>${a.local ? ` (${esc(a.local)})` : ''}<br>
      <span style="color:${atrasada ? '#B91C1C' : '#374151'}">${atrasada ? 'Prazo vencido em' : 'Prazo:'} ${data(a.prazo)}</span> · ${esc(a.empresa)}</li>`;
  }).join('');
  const consultoria = acoes[0]?.consultoria ?? '';
  const corpo = `<p>Olá${nome ? `, ${esc(nome)}` : ''}.</p>
    <p>Você é responsável por ${acoes.length === 1 ? 'esta ação' : 'estas ações'} do plano de ação de segurança do trabalho:</p>
    <ul style="padding-left:18px">${linhas}</ul>
    <p>Quando terminar, avise ${esc(consultoria) || 'a consultoria de segurança'} para dar baixa.</p>`;
  const assunto = acoes.length === 1 ? `Lembrete: ação de segurança com prazo em ${data(acoes[0].prazo)}` : `Lembrete: ${acoes.length} ações de segurança com prazo chegando`;
  return { assunto, html: emailMoldura('Lembrete do plano de ação', corpo, `Enviado por ${esc(consultoria)} pelo Safety Nexo.`) };
}

export async function avisarResponsaveis(prisma: PrismaClient, agora = new Date()) {
  if (!emailLigado()) return { enviados: 0, motivo: 'e-mail desligado' };
  const acoes = await prisma.acaoCorretiva.findMany({
    where: {
      status: { not: 'FEITA' }, responsavelEmail: { not: null }, prazo: { not: null, lte: new Date(agora.getTime() + 3 * DIA) },
      OR: [{ responsavelAvisadoEm: null }, { responsavelAvisadoEm: { lt: new Date(agora.getTime() - 6.5 * DIA) } }],
      empresa: { consultoria: { bloqueada: false } },
    },
    select: { id: true, descricao: true, local: true, prazo: true, responsavel: true, responsavelEmail: true, empresa: { select: { razaoSocial: true, consultoria: { select: { nome: true } } } } },
    take: 500,
  });
  const porPessoa = new Map<string, AcaoParaAviso[]>();
  for (const a of acoes) {
    const chave = `${a.responsavelEmail!.toLowerCase()}|${a.empresa.consultoria.nome}`;
    const lista = porPessoa.get(chave) ?? [];
    lista.push({ id: a.id, descricao: a.descricao, local: a.local, prazo: a.prazo!, responsavel: a.responsavel, responsavelEmail: a.responsavelEmail!, empresa: a.empresa.razaoSocial, consultoria: a.empresa.consultoria.nome });
    porPessoa.set(chave, lista);
  }
  let enviados = 0;
  for (const lista of porPessoa.values()) {
    const { assunto, html } = emailDoResponsavel(lista, agora);
    try {
      await enviarEmail([lista[0].responsavelEmail], assunto, html);
      await prisma.acaoCorretiva.updateMany({ where: { id: { in: lista.map((a) => a.id) } }, data: { responsavelAvisadoEm: agora } });
      enviados++;
    } catch { /* tenta de novo amanhã */ }
  }
  return { enviados };
}
