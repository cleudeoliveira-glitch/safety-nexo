import { capaDe, responsavelTecnico, identificacao } from '../documentos/capa';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { DadosOs, laudoHtml, osHtml, pgrtrHtml } from './templates';
import { ExpostoPrograma, pcaHtml, pprHtml, TrabalhadorPrograma } from './programas';
import { ehRuido, nivelDeAcao, pedeRespirador } from '../documentos/nivel-acao';
import { chaveFuncao, descricaoGhe, lerFuncoes, nomeGhe } from '../empresas/ghe-ambiente';
import { cidadeDoEndereco, extrasDe } from '../documentos/secoes';

const AVISO_LAUDO = 'Feito com o Safety Nexo.';
const AVISO = 'Feito com o Safety Nexo.';
const NOCIVOS = ['FISICO', 'QUIMICO', 'BIOLOGICO'];

export type TipoLaudo = 'LIP' | 'LPP';
const TITULOS: Record<TipoLaudo, string> = {
  LIP: 'Laudo de Insalubridade e Periculosidade (LIP)',
  LPP: 'Laudo de Periculosidade (LPP)',
};

@Injectable()
export class LaudosService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  private infos(empresa: { razaoSocial: string; cnpj: string; cnae: string | null; grauRisco: number | null }, versao: number, geradoEm: Date) {
    return [
      ['Empresa', empresa.razaoSocial],
      ['CNPJ', empresa.cnpj],
      ['CNAE', empresa.cnae],
      ['Grau de risco', empresa.grauRisco],
      ['Versão', `${versao} · emitido em ${geradoEm.toLocaleDateString('pt-BR')}`],
    ] as [string, string | number | null][];
  }

  async laudo(consultoriaId: string, empresaId: string, tipo: TipoLaudo) {
    const { empresa, versao, historico, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, tipo);
    const colaboradores = await this.prisma.colaborador.findMany({ where: { empresaId, dataDesligamento: null }, select: { gheId: true, cargo: true } });
    const html = laudoHtml(
      { titulo: TITULOS[tipo], logoEmpresa, consultoria, infos: this.infos(empresa, versao, geradoEm), aviso: AVISO_LAUDO, capa: capaDe(tipo, empresa, versao, geradoEm, [responsavelTecnico(empresa)]) },
      empresa.ghes.map((g) => ({
        nome: nomeGhe(g),
        descricao: descricaoGhe(g),
        colaboradores: g._count.colaboradores,
        cargos: [...new Set(colaboradores.filter((c) => c.gheId === g.id).map((c) => c.cargo))].sort(),
        agentes: g.riscos.filter((r) => NOCIVOS.includes(r.tipo)),
        periculosidadeAnexo: g.periculosidadeAnexo,
        periculosidadeJustificativa: g.periculosidadeJustificativa,
      })),
      { insalubridade: tipo === 'LIP', periculosidade: true },
      { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro },
      extrasDe(tipo, TITULOS[tipo], empresa, versao, historico, geradoEm, 12),
    );
    const pdf = await this.pdf.render(html);
    // Sem prazo fixo na lei: o painel lembra de revisar em 12 meses, como o LTCAT.
    await this.contexto.registrar(empresaId, tipo, versao, geradoEm, 12);
    return { pdf, versao };
  }

  async pgrtr(consultoriaId: string, empresaId: string) {
    const { empresa, versao, historico, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PGRTR');
    const acoes = await this.prisma.acaoCorretiva.findMany({ where: { empresaId, NOT: { status: 'FEITA', feitaEm: { lt: new Date(geradoEm.getTime() - 365 * 24 * 3600 * 1000) } } }, orderBy: [{ status: 'asc' }, { prazo: 'asc' }] });
    const titulo = 'Programa de Gerenciamento de Riscos no Trabalho Rural (PGRTR)';
    const html = pgrtrHtml(
      {
        titulo: 'Programa de Gerenciamento de Riscos no Trabalho Rural (PGRTR)',
        logoEmpresa,
        consultoria,
        infos: [...this.infos(empresa, versao, geradoEm).slice(0, 4), ['Trabalhadores', empresa.numFuncionarios], this.infos(empresa, versao, geradoEm)[4]],
        aviso: 'Feito com o Safety Nexo.',
        capa: capaDe('PGRTR', empresa, versao, geradoEm, [responsavelTecnico(empresa)]),
      },
      empresa.ghes.map((g) => ({ nome: nomeGhe(g), descricao: descricaoGhe(g), colaboradores: g._count.colaboradores, riscos: g.riscos })),
      {
        ...extrasDe('PGRTR', titulo, empresa, versao, historico, geradoEm, 24),
        responsavel: { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro },
        acoes,
      },
    );
    const pdf = await this.pdf.render(html);
    await this.contexto.registrar(empresaId, 'PGRTR', versao, geradoEm, 24);
    return { pdf, versao };
  }

  // PCA (ruído no nível de ação ou acima) e PPR (respirador no EPI ou químico no nível de ação), a partir dos riscos dos GHEs.
  async programa(consultoriaId: string, empresaId: string, tipo: 'PCA' | 'PPR') {
    const { empresa, versao, historico, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, tipo);
    const titulo = tipo === 'PCA' ? 'Programa de Conservação Auditiva (PCA)' : 'Programa de Proteção Respiratória (PPR)';
    const entra = (r: (typeof empresa.ghes)[number]['riscos'][number]) => {
      const na = nivelDeAcao(r);
      if (tipo === 'PCA') return r.tipo === 'FISICO' && ehRuido(r.agente) && (!na || na.situacao !== 'ABAIXO');
      return ['QUIMICO', 'BIOLOGICO'].includes(r.tipo) && (pedeRespirador(r.medidasEpi) || (na !== null && na.situacao !== 'ABAIXO'));
    };
    const expostos: ExpostoPrograma[] = [];
    const ghesNoPrograma = new Map<string, string>();
    for (const g of empresa.ghes) {
      for (const r of g.riscos.filter(entra)) {
        ghesNoPrograma.set(g.id, nomeGhe(g));
        expostos.push({
          ghe: nomeGhe(g), agente: r.agente, fonte: r.fonteGeradora, intensidade: r.intensidade, limite: r.limiteTolerancia,
          situacao: nivelDeAcao(r)?.situacao ?? null, epi: r.medidasEpi, ca: r.epiCa, trabalhadores: g._count.colaboradores,
        });
      }
    }
    const pessoas = await this.prisma.colaborador.findMany({
      where: { empresaId, dataDesligamento: null, gheId: { in: [...ghesNoPrograma.keys()] } },
      orderBy: { nome: 'asc' },
      select: { nome: true, cargo: true, gheId: true, asos: { orderBy: { dataExame: 'desc' }, take: 1, select: { dataExame: true, exames: true, proximoExame: true } } },
    });
    const trabalhadores: TrabalhadorPrograma[] = pessoas.map((c) => {
      const a = c.asos[0];
      return {
        nome: c.nome, cargo: c.cargo, ghe: ghesNoPrograma.get(c.gheId!) ?? '—', ultimoExame: a?.dataExame ?? null, proximo: a?.proximoExame ?? null,
        fezExame: tipo === 'PCA' ? !!a?.exames.some((x) => /audiom/i.test(x)) : !!a && (!a.proximoExame || a.proximoExame >= geradoEm),
      };
    });
    const moldura = { titulo, logoEmpresa, consultoria, infos: this.infos(empresa, versao, geradoEm), aviso: AVISO, capa: capaDe(tipo, empresa, versao, geradoEm, [responsavelTecnico(empresa)]) };
    const responsavel = { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro };
    const medico = { nome: empresa.medicoPcmsoNome, crm: empresa.medicoPcmsoCrm };
    const extras = extrasDe(tipo, titulo, empresa, versao, historico, geradoEm, 12);
    const html = tipo === 'PCA' ? pcaHtml(moldura, expostos, trabalhadores, responsavel, medico, extras) : pprHtml(moldura, expostos, trabalhadores, responsavel, medico, extras);
    const pdf = await this.pdf.render(html);
    await this.contexto.registrar(empresaId, tipo, versao, geradoEm, 12);
    return { pdf, versao };
  }

  // Ordem de serviço de um trabalhador ou de todos (colaboradorId vazio).
  async ordemServico(consultoriaId: string, empresaId: string, colaboradorId?: string) {
    const { empresa, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'OS');
    const pgr = await this.prisma.documento.findFirst({ where: { empresaId, tipo: 'PGR' }, orderBy: { versao: 'desc' }, select: { versao: true, geradoEm: true } });
    const emergencia = (empresa.emergencia ?? {}) as { contatos?: string };
    const colaboradores = await this.prisma.colaborador.findMany({
      where: { empresaId, ...(colaboradorId ? { id: colaboradorId } : { dataDesligamento: null }) },
      orderBy: { nome: 'asc' },
      include: { ghe: { include: { riscos: true } }, entregasEpi: { where: { devolvidoEm: null }, orderBy: { dataEntrega: 'desc' }, select: { epi: true, ca: true, dataEntrega: true, validadeCa: true } } },
    });
    if (!colaboradores.length) throw new NotFoundException(colaboradorId ? 'Colaborador não encontrado nesta empresa' : 'Cadastre os colaboradores antes de gerar as ordens de serviço.');
    const lista: DadosOs[] = colaboradores.map((c) => ({
      colaborador: c,
      // Na OS vale o que a função dele faz; sem isso, a descrição do GHE.
      ghe: c.ghe ? { nome: nomeGhe(c.ghe), descricao: descricaoGhe(c.ghe), atividadesFuncao: lerFuncoes(c.ghe.funcoes).find((f) => chaveFuncao(f.nome) === chaveFuncao(c.cargo))?.atividades ?? null } : null,
      riscos: c.ghe?.riscos ?? [],
      entregas: c.entregasEpi,
    }));
    return this.pdf.render(
      osHtml({ titulo: 'Ordem de Serviço de Segurança e Saúde no Trabalho', logoEmpresa, consultoria, infos: identificacao(empresa), aviso: AVISO }, lista, {
        empresa: empresa.razaoSocial,
        pgr: pgr ? { versao: pgr.versao, data: pgr.geradoEm } : null,
        emitidoEm: geradoEm,
        local: cidadeDoEndereco(empresa.endereco) ?? empresa.consultoria.cidade ?? null,
        telefones: emergencia.contatos?.trim() || null,
        medicoPcmso: empresa.medicoPcmsoNome ? `${empresa.medicoPcmsoNome}${empresa.medicoPcmsoCrm ? `, CRM ${empresa.medicoPcmsoCrm}` : ''}` : null,
      }),
    );
  }
}
