import { grau5 } from '../documentos/nivel-risco';
import { BadRequestException, HttpException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ArquivoService } from '../arquivo/arquivo.service';
import { SessaoUsuario } from '../common/sessao.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { registrarFalha } from '../diagnostico/falhas';
import { ImportarDto } from './dto';
import { iaConfigurada, lerPdfComIa } from './leitor';
import { lerPdfSemIa } from './leitor-gratis';

const SEM_IA = 'A leitura com IA está desligada (ela tem custo). Use "Ler grátis" ou "Digitar à mão", que funcionam sem pagar nada.';
export type ModoLeitura = 'gratis' | 'ia';
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

  // Leitura grátis (sem IA) é o padrão. A IA só entra quando a chave estiver ligada e a pessoa pedir.
  async enviar(sessao: SessaoUsuario, e: string, arq: Express.Multer.File | undefined, modo: ModoLeitura = 'gratis') {
    await this.empresa(sessao.consultoriaId, e);
    if (!arq) throw new BadRequestException('Escolha o PDF.');
    // Alguns computadores mandam o PDF como "arquivo genérico". Vale o que está dentro do arquivo, não o rótulo.
    const ehPdf = arq.buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    if (!ehPdf) throw new BadRequestException(arq.mimetype === 'application/pdf' ? 'O arquivo não abriu como PDF. Abra no computador, salve de novo como PDF e envie.' : 'Envie o documento em PDF.');
    arq.mimetype = 'application/pdf';
    if (modo === 'ia' && !iaConfigurada()) throw new BadRequestException(SEM_IA);
    const nome = Buffer.from(arq.originalname, 'latin1').toString('utf8');
    // A cópia no arquivo de documentos é um extra: se o armazenamento falhar, a leitura segue mesmo assim.
    let arquivoId: string | null = null;
    let criadoPorNome: string | null = null;
    try {
      const guardado = await this.arquivo.enviar(sessao, e, arq, { titulo: `${nome.replace(/\.pdf$/i, '')} (documento antigo)`, categoria: 'Programas e laudos', descricao: modo === 'ia' ? 'Enviado para leitura com IA' : 'Enviado para leitura grátis' });
      arquivoId = guardado.id; criadoPorNome = guardado.criadoPorNome;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.log.warn(`Cópia do PDF antigo não foi guardada: ${(err as Error).message}`);
      registrarFalha({ origem: 'MOTOR', rota: `POST /empresas/${e}/importar-pdf (cópia no arquivo)`, status: 500, mensagem: (err as Error).message, detalhe: (err as Error).stack ?? null, consultoriaId: sessao.consultoriaId, usuarioId: sessao.sub });
    }
    criadoPorNome ??= (await this.prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { nome: true } }))?.nome ?? '—';
    const imp = await this.prisma.importacaoPdf.create({
      data: { empresaId: e, arquivoId, nomeArquivo: nome.slice(0, 200), status: 'LENDO', criadoPorNome },
    });
    void this.ler(imp.id, arq.buffer, modo);
    return imp;
  }

  // Sem PDF: abre a tela de conferência vazia para digitar os GHEs e os riscos olhando o documento antigo.
  async manual(sessao: SessaoUsuario, e: string) {
    await this.empresa(sessao.consultoriaId, e);
    const nomeUsuario = (await this.prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { nome: true } }))?.nome ?? '—';
    const resultado = { tipoDocumento: null, empresa: null, cnpj: null, dataElaboracao: null, responsavelTecnico: null, ghes: [], avisos: ['Digitação à mão: use "Adicionar GHE" e "Adicionar risco" olhando o documento antigo.'] };
    return this.prisma.importacaoPdf.create({
      data: { empresaId: e, nomeArquivo: 'Digitado à mão', status: 'PRONTO', criadoPorNome: nomeUsuario, resultado: resultado as unknown as Prisma.InputJsonValue },
    });
  }

  private async ler(id: string, pdf: Buffer, modo: ModoLeitura) {
    try {
      const r = modo === 'ia' ? await lerPdfComIa(pdf) : await lerPdfSemIa(pdf);
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
      // Guarda o que entrou por esta leitura, para poder tirar tudo junto se o PGR antigo for apagado.
      const criados: { ghes: string[]; riscos: string[] } = { ghes: [], riscos: [] };
      for (const g of dto.ghes) {
        let ghe = atuais.find((x) => x.nome.trim().toLowerCase() === g.nome.trim().toLowerCase());
        if (!ghe) { ghe = { ...(await tx.ghe.create({ data: { empresaId: e, nome: g.nome.trim(), descricao: g.descricao?.trim() || null } })), riscos: [] }; novosGhes++; criados.ghes.push(ghe.id); }
        const ja = new Set(ghe.riscos.map((r) => chaveRisco(r.tipo, r.agente)));
        for (const r of g.riscos) {
          const k = chaveRisco(r.tipo, r.agente);
          if (ja.has(k)) { repetidos++; continue; }
          ja.add(k);
          const quantitativo = !!r.intensidade?.trim();
          const novo = await tx.gheRisco.create({ data: {
            gheId: ghe.id, tipo: r.tipo, agente: r.agente.trim(), fonteGeradora: r.fonteGeradora.trim(), medidasControle: r.medidasControle?.trim() || null, severidade: grau5(r.severidade),
            intensidade: r.intensidade?.trim() || null, limiteTolerancia: r.limiteTolerancia?.trim() || null, tipoAvaliacao: quantitativo ? 'QUANTITATIVA' : null,
          } });
          criados.riscos.push(novo.id);
          novosRiscos++;
        }
      }
      await tx.importacaoPdf.update({ where: { id }, data: { status: 'IMPORTADO', importadoEm: new Date(), resultado: { ...((imp.resultado as object | null) ?? {}), criados } as unknown as Prisma.InputJsonValue } });
      return { novosGhes, novosRiscos, repetidos };
    });
  }

  // Apagar o PGR antigo: sai a leitura e a cópia do PDF no arquivo de documentos.
  // Com levarCadastro, saem também os riscos que vieram dele e os GHEs que ele criou (se não tiverem outros riscos).
  async remover(c: string, e: string, id: string, levarCadastro = false) {
    await this.empresa(c, e);
    const imp = await this.prisma.importacaoPdf.findFirst({ where: { id, empresaId: e } });
    if (!imp) throw new NotFoundException('Leitura não encontrada');
    // Leitura parada há mais de 5 minutos já não vai terminar: pode apagar.
    if (imp.status === 'LENDO' && Date.now() - imp.createdAt.getTime() < 5 * 60_000) throw new BadRequestException('A leitura ainda está em andamento. Espere alguns minutos e tente de novo.');
    const criados = ((imp.resultado as { criados?: { ghes?: string[]; riscos?: string[] } } | null)?.criados) ?? { ghes: [], riscos: [] };
    let riscos = 0; let ghes = 0;
    await this.prisma.$transaction(async (tx) => {
      if (levarCadastro) {
        riscos = (await tx.gheRisco.deleteMany({ where: { id: { in: criados.riscos ?? [] }, ghe: { empresaId: e } } })).count;
        const vazios = await tx.ghe.findMany({ where: { id: { in: criados.ghes ?? [] }, empresaId: e, riscos: { none: {} } }, select: { id: true } });
        ghes = (await tx.ghe.deleteMany({ where: { id: { in: vazios.map((g) => g.id) } } })).count;
      }
      await tx.importacaoPdf.delete({ where: { id } });
    });
    if (imp.arquivoId) await this.arquivo.remover(c, e, imp.arquivoId).catch(() => undefined);
    return { ok: true, riscos, ghes };
  }

}
