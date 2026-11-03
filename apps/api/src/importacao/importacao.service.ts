import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ArquivoService } from '../arquivo/arquivo.service';
import { SessaoUsuario } from '../common/sessao.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ImportarDto } from './dto';
import { iaConfigurada, lerPdfComIa } from './leitor';

const SEM_IA = 'A leitura com IA ainda não está ligada neste servidor: falta configurar a chave da IA (ANTHROPIC_API_KEY).';
const chaveRisco = (tipo: string, agente: string) => `${tipo}|${agente.trim().toLowerCase()}`;

@Injectable()
export class ImportacaoService implements OnModuleInit {
  private readonly log = new Logger('ImportacaoPdf');
  constructor(private readonly prisma: PrismaService, private readonly arquivo: ArquivoService) {}

  // Se o servidor reiniciou no meio de uma leitura, ela não volta sozinha.
  async onModuleInit() {
    await this.prisma.importacaoPdf.updateMany({ where: { status: 'LENDO' }, data: { status: 'ERRO', erro: 'A leitura foi interrompida. Envie o arquivo de novo.' } });
  }

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
  }

  situacao() { return { iaLigada: iaConfigurada() }; }

  async enviar(sessao: SessaoUsuario, e: string, arq: Express.Multer.File | undefined) {
    await this.empresa(sessao.consultoriaId, e);
    if (!arq) throw new BadRequestException('Escolha o PDF.');
    if (arq.mimetype !== 'application/pdf') throw new BadRequestException('Envie o documento em PDF.');
    if (!iaConfigurada()) throw new BadRequestException(SEM_IA);
    const nome = Buffer.from(arq.originalname, 'latin1').toString('utf8');
    const guardado = await this.arquivo.enviar(sessao, e, arq, { titulo: `${nome.replace(/\.pdf$/i, '')} (documento antigo)`, categoria: 'Programas e laudos', descricao: 'Enviado para leitura com IA' });
    const imp = await this.prisma.importacaoPdf.create({
      data: { empresaId: e, arquivoId: guardado.id, nomeArquivo: nome.slice(0, 200), status: 'LENDO', criadoPorNome: guardado.criadoPorNome },
    });
    void this.ler(imp.id, arq.buffer);
    return imp;
  }

  private async ler(id: string, pdf: Buffer) {
    try {
      const r = await lerPdfComIa(pdf);
      await this.prisma.importacaoPdf.update({ where: { id }, data: { status: 'PRONTO', resultado: r as unknown as Prisma.InputJsonValue } });
    } catch (err) {
      this.log.warn(`Leitura ${id} falhou: ${(err as Error).message}`);
      const msg = err instanceof Error && /fora do formato|grande demais|não aceitou/.test(err.message) ? err.message : 'Não foi possível ler o documento agora. Tente de novo em alguns minutos.';
      await this.prisma.importacaoPdf.update({ where: { id }, data: { status: 'ERRO', erro: msg } });
    }
  }

  async listar(c: string, e: string) {
    await this.empresa(c, e);
    return this.prisma.importacaoPdf.findMany({ where: { empresaId: e }, orderBy: { createdAt: 'desc' }, take: 30 });
  }

  async obter(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const imp = await this.prisma.importacaoPdf.findFirst({ where: { id, empresaId: e } });
    if (!imp) throw new NotFoundException('Leitura não encontrada');
    const existentes = await this.prisma.ghe.findMany({ where: { empresaId: e }, select: { nome: true } });
    return { ...imp, ghesExistentes: existentes.map((g) => g.nome) };
  }

  // Grava o que a consultora conferiu. GHE com o mesmo nome recebe só os riscos que ainda não tem.
  async importar(c: string, e: string, id: string, dto: ImportarDto) {
    await this.empresa(c, e);
    const imp = await this.prisma.importacaoPdf.findFirst({ where: { id, empresaId: e } });
    if (!imp) throw new NotFoundException('Leitura não encontrada');
    if (imp.status !== 'PRONTO') throw new BadRequestException(imp.status === 'IMPORTADO' ? 'Esta leitura já foi importada.' : 'A leitura ainda não terminou.');
    if (!dto.ghes.length) throw new BadRequestException('Marque pelo menos um GHE para importar.');
    return this.prisma.$transaction(async (tx) => {
      const atuais = await tx.ghe.findMany({ where: { empresaId: e }, include: { riscos: { select: { tipo: true, agente: true } } } });
      let novosGhes = 0; let novosRiscos = 0; let repetidos = 0;
      for (const g of dto.ghes) {
        let ghe = atuais.find((x) => x.nome.trim().toLowerCase() === g.nome.trim().toLowerCase());
        if (!ghe) { ghe = { ...(await tx.ghe.create({ data: { empresaId: e, nome: g.nome.trim(), descricao: g.descricao?.trim() || null } })), riscos: [] }; novosGhes++; }
        const ja = new Set(ghe.riscos.map((r) => chaveRisco(r.tipo, r.agente)));
        for (const r of g.riscos) {
          const k = chaveRisco(r.tipo, r.agente);
          if (ja.has(k)) { repetidos++; continue; }
          ja.add(k);
          const quantitativo = !!r.intensidade?.trim();
          await tx.gheRisco.create({ data: {
            gheId: ghe.id, tipo: r.tipo, agente: r.agente.trim(), fonteGeradora: r.fonteGeradora.trim(), medidasControle: r.medidasControle?.trim() || null, severidade: r.severidade,
            intensidade: r.intensidade?.trim() || null, limiteTolerancia: r.limiteTolerancia?.trim() || null, tipoAvaliacao: quantitativo ? 'QUANTITATIVA' : null,
          } });
          novosRiscos++;
        }
      }
      await tx.importacaoPdf.update({ where: { id }, data: { status: 'IMPORTADO', importadoEm: new Date() } });
      return { novosGhes, novosRiscos, repetidos };
    });
  }

  async remover(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const r = await this.prisma.importacaoPdf.deleteMany({ where: { id, empresaId: e, status: { not: 'LENDO' } } });
    if (!r.count) throw new BadRequestException('Não dá para apagar uma leitura em andamento.');
    return { ok: true };
  }
}
