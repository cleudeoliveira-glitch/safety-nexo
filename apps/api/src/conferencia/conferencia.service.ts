import { Injectable, NotFoundException } from '@nestjs/common';
import { nivelRisco } from '../documentos/nivel-risco';
import { examesPelosRiscos } from '../empresas/exames-por-risco';
import { PrismaService } from '../prisma/prisma.service';
import { Sugestao, SugestoesTreinamentoService } from '../treinamentos/sugestoes';
import { gatilhosRevisaoPgr } from './revisao';
import { ehRuido, nivelDeAcao, pedeRespirador } from '../documentos/nivel-acao';

// Conferência entre documentos: o sistema cruza PGR, PCMSO, LTCAT, treinamentos, EPI, ASO e eSocial
// e aponta o que não bate, com uma nota de 0 a 100. É um olhar de auditor: quem decide é a responsável técnica.
export type Gravidade = 'ALTA' | 'MEDIA' | 'BAIXA';
export type ItemConferencia = {
  id: string; grupo: string; gravidade: Gravidade; titulo: string; detalhe: string; onde: string[]; corrigir: string; link: string;
};

const PESO: Record<Gravidade, number> = { ALTA: 12, MEDIA: 6, BAIXA: 2 };
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Primeira palavra útil do nome do exame: "Audiometria tonal" e "Audiometria ocupacional" contam como o mesmo.
const chaveExame = (nome: string) => semAcento(nome).replace(/\(.*?\)/g, '').split(/[\s,]+/).find((p) => p.length > 3) ?? semAcento(nome);
const numero = (t?: string | null) => { const m = (t ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
const lista = (l: string[], max = 4) => `${l.slice(0, max).join(', ')}${l.length > max ? ` e mais ${l.length - max}` : ''}`;

export function faixaNota(nota: number) {
  if (nota >= 90) return 'Muito bom';
  if (nota >= 70) return 'Bom, com ajustes';
  if (nota >= 50) return 'Precisa de atenção';
  return 'Crítico';
}

@Injectable()
export class ConferenciaService {
  constructor(private readonly prisma: PrismaService, private readonly treinamentos: SugestoesTreinamentoService) {}

  async conferir(consultoriaId: string, empresaId: string, hoje = new Date()) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, consultoriaId },
      include: {
        ghes: {
          orderBy: { nome: 'asc' },
          include: {
            riscos: true, exames: true,
            colaboradores: {
              where: { dataDesligamento: null },
              select: { id: true, nome: true, asos: { orderBy: { dataExame: 'desc' }, take: 1, select: { riscos: true, dataExame: true } }, entregasEpi: { where: { devolvidoEm: null }, select: { id: true }, take: 1 } },
            },
          },
        },
        colaboradores: { where: { dataDesligamento: null, gheId: null }, select: { nome: true } },
        documentos: { orderBy: { geradoEm: 'desc' }, select: { tipo: true, geradoEm: true } },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    const [acoesAbertas, s2240] = await Promise.all([
      this.prisma.acaoCorretiva.findMany({ where: { empresaId, status: { not: 'FEITA' } }, select: { riscoId: true } }),
      this.prisma.eventoEsocial.findMany({ where: { empresaId, tipo: 'S-2240', status: 'PROCESSADO' }, select: { referenciaId: true, createdAt: true } }),
    ]);
    const ultimo = (tipo: string) => empresa.documentos.find((d) => d.tipo === tipo)?.geradoEm ?? null;
    const itens: ItemConferencia[] = [];
    const add = (i: ItemConferencia) => itens.push(i);

    // ---------- PGR × PCMSO: exames que os riscos pedem ----------
    const faltaExame: string[] = [];
    for (const g of empresa.ghes) {
      if (!g.riscos.length) continue;
      const tem = new Set(g.exames.map((e) => chaveExame(e.nome)));
      const faltam = examesPelosRiscos(g.riscos).filter((e) => e.tipo === 'COMPLEMENTAR' && !tem.has(chaveExame(e.nome)));
      if (faltam.length) faltaExame.push(`${g.nome}: ${faltam.map((e) => e.nome).join(', ')}`);
    }
    if (faltaExame.length) add({ id: 'exames', grupo: 'PGR × PCMSO', gravidade: 'ALTA', titulo: `Exames que os riscos pedem e não estão no PCMSO (${faltaExame.length} GHE)`, detalhe: lista(faltaExame, 3), onde: faltaExame.map((x) => x.split(':')[0]), corrigir: 'No GHE, use "Sugerir exames pelos riscos" e confira com o médico do PCMSO.', link: '#ghes' });

    const pgr = ultimo('PGR'); const pcmso = ultimo('PCMSO'); const ltcat = ultimo('LTCAT');
    if (pgr && pcmso && pcmso < pgr) add({ id: 'pcmso-antigo', grupo: 'PGR × PCMSO', gravidade: 'MEDIA', titulo: 'PCMSO emitido antes do PGR atual', detalhe: `PGR em ${pgr.toLocaleDateString('pt-BR')}, PCMSO em ${pcmso.toLocaleDateString('pt-BR')}. O PCMSO precisa seguir os riscos do PGR em vigor.`, onde: [], corrigir: 'Confira os exames e emita o PCMSO de novo.', link: '/arquivo' });

    // ---------- PGR × plano de ação: riscos sem controle ----------
    const comAcao = new Set(acoesAbertas.map((a) => a.riscoId).filter(Boolean));
    const semControle: string[] = []; const altosSemAcao: string[] = [];
    for (const g of empresa.ghes) for (const r of g.riscos) {
      const nivel = nivelRisco(r.severidade, r.probabilidade);
      if (nivel === 'BAIXO') continue;
      const temMedida = [r.medidasControle, r.medidasEpc, r.medidasEpi].some((m) => m?.trim());
      if (!temMedida && !comAcao.has(r.id)) semControle.push(`${g.nome}: ${r.agente}`);
      else if ((nivel === 'ALTO' || nivel === 'CRITICO') && !comAcao.has(r.id)) altosSemAcao.push(`${g.nome}: ${r.agente}`);
    }
    if (semControle.length) add({ id: 'sem-controle', grupo: 'PGR × plano de ação', gravidade: 'ALTA', titulo: `${semControle.length} risco(s) moderado(s) ou acima sem nenhuma medida`, detalhe: lista(semControle), onde: semControle, corrigir: 'No plano de ação, use "Criar ações dos riscos do PGR".', link: '/prevencao#acoes' });
    if (altosSemAcao.length) add({ id: 'altos-sem-acao', grupo: 'PGR × plano de ação', gravidade: 'MEDIA', titulo: `${altosSemAcao.length} risco(s) alto(s) ou crítico(s) sem ação aberta no plano`, detalhe: lista(altosSemAcao), onde: altosSemAcao, corrigir: 'A NR-01 pede ação com responsável e prazo para esses riscos. Use "Criar ações dos riscos do PGR".', link: '/prevencao#acoes' });

    // ---------- PGR × EPI ----------
    const semCa: string[] = []; const semEntrega: string[] = [];
    for (const g of empresa.ghes) {
      const pedeEpi = g.riscos.filter((r) => r.medidasEpi?.trim());
      for (const r of pedeEpi) if (!r.epiCa?.trim()) semCa.push(`${g.nome}: ${r.agente}`);
      if (pedeEpi.length) for (const c of g.colaboradores) if (!c.entregasEpi.length) semEntrega.push(c.nome);
    }
    if (semEntrega.length) add({ id: 'sem-epi', grupo: 'PGR × ficha de EPI', gravidade: 'MEDIA', titulo: `${semEntrega.length} pessoa(s) em GHE que pede EPI, sem EPI entregue`, detalhe: lista(semEntrega), onde: semEntrega, corrigir: 'Registre a entrega na ficha de EPI do colaborador ou no almoxarifado.', link: '/colaboradores' });
    if (semCa.length) add({ id: 'epi-sem-ca', grupo: 'PGR × PPP e eSocial', gravidade: 'BAIXA', titulo: `${semCa.length} risco(s) com EPI e sem o número do CA`, detalhe: lista(semCa), onde: semCa, corrigir: 'Informe o CA no risco: o PPP e o S-2240 pedem.', link: '#ghes' });

    // ---------- PGR × LTCAT ----------
    const especiais = empresa.ghes.flatMap((g) => g.riscos.filter((r) => (r.grauInsalubridade && r.grauInsalubridade !== 'NAO') || r.aposentadoriaEspecial).map((r) => ({ g: g.nome, r })));
    const perigosos = empresa.ghes.filter((g) => g.periculosidadeAnexo && g.periculosidadeAnexo !== 'NENHUM');
    if ((especiais.length || perigosos.length) && !ltcat) add({ id: 'sem-ltcat', grupo: 'PGR × LTCAT', gravidade: 'ALTA', titulo: 'Tem insalubridade, periculosidade ou aposentadoria especial, mas nenhum LTCAT emitido', detalhe: lista([...especiais.map((x) => `${x.g}: ${x.r.agente}`), ...perigosos.map((g) => `${g.nome}: periculosidade`)]), onde: [], corrigir: 'Emita o LTCAT (e os laudos de insalubridade e periculosidade, se a empresa pedir).', link: '/emitir' });
    else if (ltcat && especiais.some((x) => x.r.atualizadoEm > ltcat)) add({ id: 'ltcat-antigo', grupo: 'PGR × LTCAT', gravidade: 'MEDIA', titulo: 'Riscos especiais mudaram depois do último LTCAT', detalhe: lista(especiais.filter((x) => x.r.atualizadoEm > ltcat).map((x) => `${x.g}: ${x.r.agente}`)), onde: [], corrigir: 'Emita o LTCAT de novo para o PPP sair certo.', link: '/emitir' });

    // Medição acima do limite: o LTCAT e o PPP precisam dizer se o EPI neutraliza.
    const acimaSemEpi: string[] = []; const acimaSemInsal: string[] = [];
    for (const g of empresa.ghes) for (const r of g.riscos) {
      const v = numero(r.intensidade); const lt = numero(r.limiteTolerancia);
      if (r.tipoAvaliacao !== 'QUANTITATIVA' || v === null || lt === null || v <= lt) continue;
      if (r.epiEficaz === null || r.epiEficaz === undefined) acimaSemEpi.push(`${g.nome}: ${r.agente} (${r.intensidade} para limite ${r.limiteTolerancia})`);
      else if (r.epiEficaz === false && (!r.grauInsalubridade || r.grauInsalubridade === 'NAO')) acimaSemInsal.push(`${g.nome}: ${r.agente}`);
    }
    if (acimaSemInsal.length) add({ id: 'acima-sem-insal', grupo: 'PGR × LTCAT', gravidade: 'ALTA', titulo: 'Acima do limite, EPI não neutraliza e sem insalubridade marcada', detalhe: lista(acimaSemInsal), onde: acimaSemInsal, corrigir: 'Confira o anexo da NR-15 e o grau de insalubridade no risco.', link: '#ghes' });
    if (acimaSemEpi.length) add({ id: 'acima-sem-epi', grupo: 'PGR × LTCAT e PPP', gravidade: 'MEDIA', titulo: 'Medição acima do limite sem dizer se o EPI é eficaz', detalhe: lista(acimaSemEpi, 3), onde: acimaSemEpi, corrigir: 'Marque no risco se o EPI e o EPC são eficazes: o LTCAT, o PPP e o S-2240 dependem disso.', link: '#ghes' });

    // ---------- Nível de ação (NR-09), PCA e PPR ----------
    const noNivelAcao: string[] = []; let ruidoNa = false; let respirador = false;
    for (const g of empresa.ghes) for (const r of g.riscos) {
      const na = nivelDeAcao(r);
      if (r.tipo === 'FISICO' && ehRuido(r.agente) && na && na.situacao !== 'ABAIXO') ruidoNa = true;
      if (['QUIMICO', 'BIOLOGICO'].includes(r.tipo) && (pedeRespirador(r.medidasEpi) || (na && na.situacao !== 'ABAIXO'))) respirador = true;
      if (na?.situacao === 'NIVEL_ACAO' && !acoesAbertas.some((a) => a.riscoId === r.id)) noNivelAcao.push(`${g.nome}: ${r.agente} (${r.intensidade}, nível de ação ${String(na.nivelAcao).replace('.', ',')} ${na.unidade})`);
    }
    if (noNivelAcao.length) add({ id: 'nivel-acao', grupo: 'PGR × NR-09', gravidade: 'MEDIA', titulo: 'Abaixo do limite, mas acima do nível de ação, sem ação no plano', detalhe: lista(noNivelAcao, 3), onde: noNivelAcao, corrigir: 'A partir do nível de ação a NR-09 pede ações preventivas: medir de novo periodicamente, informar os trabalhadores e fazer o controle médico. Crie a ação no plano.', link: '/prevencao#acoes' });
    if (ruidoNa && !ultimo('PCA')) add({ id: 'sem-pca', grupo: 'PGR × NR-09', gravidade: 'MEDIA', titulo: 'Tem ruído no nível de ação e nenhum PCA emitido', detalhe: 'O Programa de Conservação Auditiva organiza medição, protetor auditivo, treinamento e audiometrias dos expostos.', onde: [], corrigir: 'Emita o PCA em Documentos.', link: '/emitir' });
    if (respirador && !ultimo('PPR')) add({ id: 'sem-ppr', grupo: 'PGR × NR-09', gravidade: 'MEDIA', titulo: 'O controle depende de respirador e não há PPR emitido', detalhe: 'A Instrução Normativa MTb nº 1/1994 pede o Programa de Proteção Respiratória sempre que houver uso de respirador.', onde: [], corrigir: 'Emita o PPR em Documentos.', link: '/emitir' });

    // ---------- Pessoas fora do PGR ----------
    if (empresa.colaboradores.length) add({ id: 'sem-ghe', grupo: 'Colaboradores × PGR', gravidade: 'MEDIA', titulo: `${empresa.colaboradores.length} pessoa(s) sem GHE`, detalhe: lista(empresa.colaboradores.map((c) => c.nome)), onde: [], corrigir: 'Sem GHE a pessoa fica fora do PGR, do PCMSO, do PPP e do S-2240. Ligue cada uma ao seu grupo.', link: '/colaboradores' });

    // ---------- PGR × ASO: riscos novos desde o último exame ----------
    const asoDesatualizado: string[] = [];
    for (const g of empresa.ghes) {
      const agentes = g.riscos.filter((r) => !/^fatores psicossociais/i.test(r.agente)).map((r) => semAcento(r.agente));
      if (!agentes.length) continue;
      for (const c of g.colaboradores) {
        const aso = c.asos[0];
        if (!aso || !aso.riscos.length) continue;
        const noAso = aso.riscos.map(semAcento);
        const novos = agentes.filter((a) => !noAso.some((x) => x.includes(a) || a.includes(x)));
        if (novos.length) asoDesatualizado.push(c.nome);
      }
    }
    if (asoDesatualizado.length) add({ id: 'aso-riscos', grupo: 'PGR × ASO', gravidade: 'MEDIA', titulo: `${asoDesatualizado.length} pessoa(s) com riscos no GHE que não estão no último ASO`, detalhe: lista(asoDesatualizado), onde: asoDesatualizado, corrigir: 'Avalie com o médico o exame de mudança de risco (NR-07) e confira os riscos que vão no próximo ASO.', link: '/colaboradores' });

    // ---------- PGR × eSocial S-2240 ----------
    if (s2240.length) {
      const enviadoEm = new Map<string, Date>();
      for (const e of s2240) { const a = enviadoEm.get(e.referenciaId); if (!a || e.createdAt > a) enviadoEm.set(e.referenciaId, e.createdAt); }
      const desatualizado: string[] = []; const nunca: string[] = [];
      for (const g of empresa.ghes) {
        const mudou = g.riscos.reduce((m, r) => (r.atualizadoEm > m ? r.atualizadoEm : m), g.atualizadoEm);
        for (const c of g.colaboradores) {
          const env = enviadoEm.get(c.id);
          if (!env) { if (g.riscos.length) nunca.push(c.nome); } else if (mudou > env) desatualizado.push(c.nome);
        }
      }
      if (desatualizado.length) add({ id: 's2240-antigo', grupo: 'PGR × eSocial', gravidade: 'MEDIA', titulo: `S-2240 desatualizado para ${desatualizado.length} pessoa(s)`, detalhe: `Os riscos do GHE mudaram depois do último envio: ${lista(desatualizado)}`, onde: desatualizado, corrigir: 'Gere e envie o S-2240 de novo para essas pessoas.', link: '/esocial' });
      if (nunca.length) add({ id: 's2240-falta', grupo: 'PGR × eSocial', gravidade: 'MEDIA', titulo: `${nunca.length} pessoa(s) sem S-2240 aceito`, detalhe: lista(nunca), onde: nunca, corrigir: 'Gere e envie o S-2240 dessas pessoas.', link: '/esocial' });
    }

    // ---------- PGR × treinamentos ----------
    const sugestoes: Sugestao[] = await this.treinamentos.sugerir(consultoriaId, empresaId, hoje).catch(() => []);
    for (const s of sugestoes.filter((x) => x.pendentes.length)) {
      const critica = ['NR-35', 'NR-10', 'NR-33', 'NR-12', 'NR-20'].includes(s.norma);
      add({ id: `trein-${s.norma}-${s.modelo}`, grupo: 'PGR × treinamentos', gravidade: critica ? 'ALTA' : 'MEDIA', titulo: `${s.norma}: ${s.pendentes.length} de ${s.total} sem "${s.modelo}" em dia`, detalhe: `Por quê: ${s.motivo}. ${lista(s.pendentes.map((p) => p.nome))}`, onde: s.onde, corrigir: 'Em Treinamentos, use "Montar turma" no quadro "Treinamentos que os riscos pedem".', link: '/treinamentos' });
    }

    // ---------- Revisão do PGR ----------
    const revisao = await gatilhosRevisaoPgr(this.prisma, empresaId, hoje);
    if (!pgr && empresa.ghes.some((g) => g.riscos.length)) add({ id: 'sem-pgr', grupo: 'Revisão do PGR', gravidade: 'ALTA', titulo: 'Nenhum PGR emitido', detalhe: 'Os riscos já estão cadastrados, mas o PGR ainda não foi emitido.', onde: [], corrigir: 'Emita o PGR.', link: '/emitir' });
    if (revisao.motivos.length) add({ id: 'revisao', grupo: 'Revisão do PGR', gravidade: revisao.motivos.some((m) => m.base === 'prazo de 2 anos' && m.texto.startsWith('Passou')) || revisao.motivos.some((m) => m.base === 'acidente ou doença do trabalho') ? 'ALTA' : 'MEDIA', titulo: 'Está na hora de revisar o PGR', detalhe: revisao.motivos.map((m) => m.texto).join('; '), onde: [], corrigir: 'Revise o inventário e o plano de ação e emita o PGR de novo (NR-01, 1.5.4.4.6).', link: '/emitir' });

    const ordem: Record<Gravidade, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
    itens.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade]);
    const nota = Math.max(0, 100 - itens.reduce((s, i) => s + PESO[i.gravidade], 0));
    return { nota, faixa: faixaNota(nota), conferidoEm: hoje, itens, revisao, semDados: !empresa.ghes.length };
  }
}
