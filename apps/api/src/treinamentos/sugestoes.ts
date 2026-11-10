import { Controller, Get, Injectable, NotFoundException, Param } from '@nestjs/common';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOGO } from './catalogo';
import { validadeDaTurma } from './treinamentos.service';

// Treinamentos que as NRs exigem quando o risco aparece no PGR. Só regras com base clara na norma;
// a consultora confere antes de montar a turma (ex.: a classe da instalação na NR-20).
type Regra = { norma: string; modelo: string; termos: RegExp; motivo: string };
const REGRAS: Regra[] = [
  { norma: 'NR-35', modelo: 'Trabalho em altura', termos: /altura|andaime|telhado|escada|plataforma elevat|queda de (pessoa|n[ií]vel)/i, motivo: 'trabalho acima de 2 m (NR-35, 35.3)' },
  { norma: 'NR-10', modelo: 'Segurança em instalações e serviços em eletricidade (básico)', termos: /eletric|el[eé]tric|energizad|choque|painel de (for[cç]a|distribui)/i, motivo: 'serviço em instalação elétrica (NR-10, 10.8)' },
  { norma: 'NR-33', modelo: 'Espaço confinado: trabalhador autorizado e vigia', termos: /espa[cç]o confinado|tanque|silo|cisterna|galeria|po[cç]o de visita|reservat[oó]rio/i, motivo: 'entrada em espaço confinado (NR-33)' },
  { norma: 'NR-12', modelo: 'Segurança em máquinas e equipamentos', termos: /m[aá]quina|prensa|serra|torno|esmeril|cilindro|guilhotina|dobradeira|misturador|moinho|cortador|amassadeira|laminador/i, motivo: 'operação de máquina (NR-12, 12.16)' },
  { norma: 'NR-11', modelo: 'Operador de empilhadeira e equipamentos de movimentação de cargas', termos: /empilhadeira|ponte rolante|guindaste|talha|transpaleteira el/i, motivo: 'operação de equipamento de transporte motorizado (NR-11, 11.1.5)' },
  { norma: 'NR-20', modelo: 'Inflamáveis e combustíveis: iniciação', termos: /inflam[aá]ve|combust[ií]ve|glp|g[aá]s de cozinha|solvente|gasolina|diesel|[aá]lcool et[ií]lico/i, motivo: 'contato com inflamáveis (NR-20). Confira a classe da instalação para escolher o curso' },
  { norma: 'NR-13', modelo: 'Operação de caldeiras', termos: /caldeira/i, motivo: 'operação de caldeira (NR-13)' },
  { norma: 'NR-31', modelo: 'Aplicação de agrotóxicos, aditivos, adjuvantes e produtos afins', termos: /agrot[oó]xic|defensivo agr/i, motivo: 'aplicação de agrotóxicos (NR-31)' },
  { norma: 'NR-31', modelo: 'Operação de motosserra e motopoda', termos: /motosserra|motopoda/i, motivo: 'operação de motosserra (NR-31)' },
];

export type Sugestao = { norma: string; modelo: string; motivo: string; onde: string[]; pendentes: { id: string; nome: string; cargo: string }[]; total: number };

@Injectable()
export class SugestoesTreinamentoService {
  constructor(private readonly prisma: PrismaService) {}

  async sugerir(consultoriaId: string, empresaId: string, hoje = new Date()): Promise<Sugestao[]> {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, consultoriaId },
      include: {
        ghes: { include: { riscos: { select: { agente: true, fonteGeradora: true } } } },
        colaboradores: {
          where: { dataDesligamento: null },
          select: {
            id: true, nome: true, cargo: true, gheId: true,
            entregasEpi: { select: { id: true }, take: 1 },
            treinamentos: { select: { turma: { select: { norma: true, fim: true, validadeMeses: true } } } },
          },
        },
        eleicoesCipa: { orderBy: { eleicaoEm: 'desc' }, take: 1, select: { membros: { select: { colaboradorId: true } } } },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');

    // Tem o treinamento em dia: turma da mesma NR, sem validade fixa ou ainda dentro da validade.
    const emDia = (c: (typeof empresa.colaboradores)[number], norma: string) =>
      c.treinamentos.some(({ turma }) => turma.norma === norma && turma.fim <= hoje && (() => { const v = validadeDaTurma(turma); return !v || v >= hoje; })());
    const montar = (norma: string, modelo: string, motivo: string, onde: string[], alvo: typeof empresa.colaboradores): Sugestao => ({
      norma, modelo, motivo, onde, total: alvo.length,
      pendentes: alvo.filter((c) => !emDia(c, norma)).map((c) => ({ id: c.id, nome: c.nome, cargo: c.cargo })),
    });

    const sugestoes = new Map<string, Sugestao>();
    for (const r of REGRAS) {
      if (!CATALOGO.some((m) => m.nome === r.modelo)) continue;
      const ghes = empresa.ghes.filter((g) => r.termos.test([g.nome, g.descricao ?? '', ...g.riscos.flatMap((x) => [x.agente, x.fonteGeradora])].join(' ')));
      const ids = new Set(ghes.map((g) => g.id));
      const alvo = empresa.colaboradores.filter((c) => (c.gheId && ids.has(c.gheId)) || r.termos.test(c.cargo));
      if (!alvo.length) continue;
      sugestoes.set(r.modelo, montar(r.norma, r.modelo, r.motivo, ghes.map((g) => g.nome), alvo));
    }
    // NR-06, 6.5.1: quem recebe EPI precisa ser orientado e treinado sobre uso, guarda e conservação.
    const comEpi = empresa.colaboradores.filter((c) => c.entregasEpi.length);
    if (comEpi.length) sugestoes.set('epi', montar('NR-06', 'Uso, guarda e conservação de EPI', 'recebeu EPI (NR-06, 6.5.1)', [], comEpi));
    // NR-05, 5.7: membros da CIPA treinados antes da posse.
    const membros = new Set(empresa.eleicoesCipa[0]?.membros.map((m) => m.colaboradorId) ?? []);
    const daCipa = empresa.colaboradores.filter((c) => membros.has(c.id));
    if (daCipa.length) sugestoes.set('cipa', montar('NR-05', 'Membros da CIPA', 'membro da CIPA (NR-05, 5.7)', [], daCipa));

    return [...sugestoes.values()].sort((a, b) => b.pendentes.length - a.pendentes.length);
  }
}

@PermiteEmpresa()
@Controller('empresas/:empresaId/treinamentos/sugeridos')
export class SugestoesTreinamentoController {
  constructor(private readonly s: SugestoesTreinamentoService) {}
  @Get() listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.s.sugerir(c, e); }
}
