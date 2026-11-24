import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { examesPelosRiscos } from '../empresas/exames-por-risco';
import { lerFuncoes, nomeGhe } from '../empresas/ghe-ambiente';
import { PrismaService } from '../prisma/prisma.service';
import { nivelRisco } from './nivel-risco';
import { ehAgenteLtcat } from './ltcat.template';
import { compararRetratos, lerRetrato, tirarRetrato } from './retrato';

// Conferência rápida antes de gerar o PGR, o PCMSO ou o LTCAT.
// Aparece no alto da pré-visualização: a pessoa vê o que falta antes de autorizar o PDF.
// Não trava nada: quem decide se gera assim mesmo é a responsável técnica.
export type AvisoAntes = { tipo: 'FALTA' | 'ATENCAO' | 'INFO'; texto: string; corrigir: string };
export const DOCUMENTOS_CONFERIDOS = ['pgr', 'pcmso', 'ltcat'] as const;
export type DocConferido = (typeof DOCUMENTOS_CONFERIDOS)[number];

const lista = (l: string[], max = 3) => `${l.slice(0, max).join(', ')}${l.length > max ? ` e mais ${l.length - max}` : ''}`;
// Mesma regra da conferência: "Audiometria tonal" e "Audiometria ocupacional" contam como o mesmo exame.
const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const chaveExame = (nome: string) => semAcento(nome).replace(/\(.*?\)/g, '').split(/[\s,]+/).find((p) => p.length > 3) ?? semAcento(nome);
const qt = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const CADASTRO = 'Cadastro da empresa, aba Grupos (GHE) e riscos';

@Injectable()
export class AntesDeGerarService {
  constructor(private readonly prisma: PrismaService) {}

  async conferir(consultoriaId: string, empresaId: string, doc: DocConferido): Promise<AvisoAntes[]> {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, consultoriaId },
      include: {
        ghes: { orderBy: { nome: 'asc' }, include: { riscos: true, exames: true, _count: { select: { colaboradores: { where: { dataDesligamento: null } } } } } },
        _count: { select: { colaboradores: { where: { dataDesligamento: null, gheId: null } } } },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    const avisos: AvisoAntes[] = [];
    const add = (tipo: AvisoAntes['tipo'], texto: string, corrigir: string) => avisos.push({ tipo, texto, corrigir });
    const ghes = empresa.ghes;

    if (!ghes.length) {
      add('FALTA', 'Nenhum GHE cadastrado. O documento sai sem inventário de riscos.', `${CADASTRO}: crie os grupos por setor e função.`);
      return avisos;
    }
    if (!empresa.responsavelTecnicoNome?.trim()) add('FALTA', 'Falta o responsável técnico. O documento sai sem nome e registro de quem elaborou.', 'Cadastro da empresa, aba Dados e responsáveis.');

    if (doc === 'pgr') {
      const semRisco = ghes.filter((g) => !g.riscos.length).map(nomeGhe);
      if (semRisco.length) add('FALTA', `${qt(semRisco.length, 'GHE', 'GHEs')} sem nenhuma exposição cadastrada: ${lista(semRisco)}.`, `${CADASTRO}: inclua os riscos ou, se o grupo não tiver exposição, escreva isso na descrição.`);
      const semFuncao = ghes.filter((g) => !lerFuncoes(g.funcoes).length).map(nomeGhe);
      if (semFuncao.length) add('FALTA', `${qt(semFuncao.length, 'GHE', 'GHEs')} sem funções: ${lista(semFuncao)}. A NR-01 pede o GHE por setor e função.`, `${CADASTRO}: informe as funções do grupo.`);
      const semAtividade = ghes.flatMap((g) => lerFuncoes(g.funcoes).filter((f) => !f.atividades?.trim()).map((f) => `${f.nome} (${nomeGhe(g)})`));
      if (semAtividade.length) add('ATENCAO', `${qt(semAtividade.length, 'função', 'funções')} sem a descrição das atividades: ${lista(semAtividade)}.`, `${CADASTRO}: descreva o que cada função faz.`);
      const semSetor = ghes.filter((g) => !g.setor?.trim()).map(nomeGhe);
      if (semSetor.length) add('ATENCAO', `${qt(semSetor.length, 'GHE', 'GHEs')} sem setor: ${lista(semSetor)}.`, `${CADASTRO}: informe o setor de cada grupo.`);
      const semMedida = ghes.flatMap((g) => g.riscos.filter((r) => nivelRisco(r.severidade, r.probabilidade) !== 'BAIXO' && ![r.medidasControle, r.medidasEpc, r.medidasEpi].some((m) => m?.trim())).map((r) => `${r.agente} (${nomeGhe(g)})`));
      if (semMedida.length) add('ATENCAO', `${qt(semMedida.length, 'risco moderado ou acima', 'riscos moderados ou acima')} sem nenhuma medida de controle: ${lista(semMedida)}.`, `${CADASTRO}: em cada risco, use "Classificar e editar medidas".`);
      const vazios = ghes.filter((g) => !g._count.colaboradores).map(nomeGhe);
      if (vazios.length) add('INFO', `${qt(vazios.length, 'GHE', 'GHEs')} sem colaborador ligado: ${lista(vazios)}. O PGR sai, mas o número de expostos fica zero.`, 'Colaboradores: ligue cada pessoa ao seu grupo.');
      if (!empresa.descricaoProcessos?.trim()) add('INFO', 'Sem a descrição dos processos da empresa. O PGR usa um texto geral.', 'Cadastro da empresa, aba Dados e responsáveis.');
      // O que mudou desde o último PGR emitido, pelo retrato guardado na emissão.
      const ultimo = await this.prisma.documento.findFirst({ where: { empresaId, tipo: 'PGR', NOT: { retrato: { equals: Prisma.DbNull } } }, orderBy: { versao: 'desc' }, select: { versao: true, geradoEm: true, retrato: true } });
      const retrato = lerRetrato(ultimo?.retrato);
      if (ultimo && retrato) {
        const m = compararRetratos(retrato, tirarRetrato(ghes, new Date()));
        const quando = ultimo.geradoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        add('INFO', m.linhas.length ? `Desde a versão ${ultimo.versao} (${quando}): ${m.linhas.join('; ')}.` : `Nada mudou nos GHEs desde a versão ${ultimo.versao} (${quando}).`,
          m.linhas.length ? 'Isso entra sozinho no histórico de revisões desta versão.' : 'Se for só reemitir, pode gerar.');
      }
    }

    if (doc === 'pcmso') {
      if (!empresa.medicoPcmsoNome?.trim()) add('FALTA', 'Falta o médico responsável pelo PCMSO.', 'Cadastro da empresa, aba Dados e responsáveis.');
      const semExame = ghes.filter((g) => !g.exames.length).map(nomeGhe);
      if (semExame.length) add('FALTA', `${qt(semExame.length, 'GHE', 'GHEs')} sem exames: ${lista(semExame)}.`, `${CADASTRO}: use "Sugerir exames pelos riscos".`);
      const faltam: string[] = [];
      for (const g of ghes) {
        if (!g.riscos.length) continue;
        const tem = new Set(g.exames.map((e) => chaveExame(e.nome)));
        const sugeridos = examesPelosRiscos(g.riscos).filter((e) => e.tipo === 'COMPLEMENTAR' && !tem.has(chaveExame(e.nome)));
        if (sugeridos.length) faltam.push(`${nomeGhe(g)}: ${sugeridos.map((e) => e.nome).join(', ')}`);
      }
      if (faltam.length) add('ATENCAO', `Exames que os riscos pedem e ainda não estão no GHE: ${lista(faltam, 2)}.`, 'Confira com o médico do PCMSO.');
    }

    if (doc === 'ltcat') {
      const agentes = ghes.flatMap((g) => g.riscos.filter((r) => ehAgenteLtcat(r.tipo)).map((r) => ({ g, r })));
      if (!agentes.length) add('INFO', 'Nenhum agente físico, químico ou biológico cadastrado. O LTCAT sai dizendo que não há exposição.', 'Se houver exposição, cadastre o agente no GHE.');
      const semAvaliacao = agentes.filter((x) => !x.r.tipoAvaliacao).map((x) => `${x.r.agente} (${nomeGhe(x.g)})`);
      if (semAvaliacao.length) add('FALTA', `${qt(semAvaliacao.length, 'agente', 'agentes')} sem avaliação: ${lista(semAvaliacao)}.`, `${CADASTRO}: em cada risco, abra "falta avaliar para LTCAT/PPP".`);
      const semMedicao = agentes.filter((x) => x.r.tipoAvaliacao === 'QUANTITATIVA' && (!x.r.intensidade?.trim() || !x.r.tecnicaMedicao?.trim())).map((x) => `${x.r.agente} (${nomeGhe(x.g)})`);
      if (semMedicao.length) add('ATENCAO', `${qt(semMedicao.length, 'avaliação quantitativa', 'avaliações quantitativas')} sem o resultado ou sem a técnica usada: ${lista(semMedicao)}.`, 'Informe o valor medido e a metodologia (ex.: NHO 01).');
      const semEficacia = agentes.filter((x) => x.r.medidasEpi?.trim() && x.r.epiEficaz == null).map((x) => `${x.r.agente} (${nomeGhe(x.g)})`);
      if (semEficacia.length) add('ATENCAO', `${qt(semEficacia.length, 'risco', 'riscos')} com EPI sem dizer se ele é eficaz: ${lista(semEficacia)}.`, 'O PPP e o S-2240 dependem dessa resposta.');
    }

    if (empresa._count.colaboradores) add('ATENCAO', `${qt(empresa._count.colaboradores, 'colaborador sem GHE fica', 'colaboradores sem GHE ficam')} fora do documento.`, 'Colaboradores: ligue cada pessoa ao seu grupo.');
    const ordem = { FALTA: 0, ATENCAO: 1, INFO: 2 };
    return avisos.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
  }
}
