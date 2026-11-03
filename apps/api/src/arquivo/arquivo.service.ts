import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { PrismaService } from '../prisma/prisma.service';
import { SessaoUsuario } from '../common/sessao.decorator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (b: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js');

// Lê o texto do PDF com o pdftotext (poppler-utils, instalar no servidor), que respeita os espaços das tabelas.
// Sem ele, usa o pdf-parse, que é pior mas não precisa de nada instalado.
function textoDoPdf(pdf: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const p = execFile('pdftotext', ['-layout', '-enc', 'UTF-8', '-', '-'], { maxBuffer: 20_000_000, timeout: 60_000 }, (erro, saida) => {
      if (!erro) return resolve(saida);
      pdfParse(pdf).then((r) => resolve(r.text)).catch(() => resolve(''));
    });
    p.stdin?.on('error', () => undefined);
    p.stdin?.end(pdf);
  });
}

const PASTA = process.env.ARQUIVOS_DIR ?? join(__dirname, '..', '..', 'storage', 'arquivos');
const TIPOS_ACEITOS: Record<string, string> = {
  'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

// Em que pasta do arquivo cai cada PDF gerado, pelo nome do arquivo.
const CATEGORIAS: [RegExp, string][] = [
  [/^(PGR|PCMSO|LTCAT|LIP|LPP|PGRTR)\b/i, 'Programas e laudos'],
  [/^(ASO|Ficha-EPI|PPP|Comprovante-facial)/i, 'Funcionários'],
  [/^(AET|CAT)/i, 'Saúde ocupacional'],
  [/CIPA|Edital|Ata|Cedula|Ficha-de-inscricao|Certificado/i, 'CIPA'],
  [/^(APR|Permissao|DDS|Inspecao|Ordem)/i, 'Operação diária'],
  [/^SIPAT|^Auditoria-5S/i, 'Pessoas e cultura'],
  [/Lista-de-presenca|Certificados/i, 'Treinamentos'],
  [/emergencia|Brigada/i, 'Emergência'],
  [/^FAP/i, 'Previdência e custos'],
  [/^SSMA/i, 'Indicadores'],
];
export const categoriaDoNome = (nome: string) => CATEGORIAS.find(([r]) => r.test(nome))?.[1] ?? 'Outros';

@Injectable()
export class ArquivoService {
  private readonly log = new Logger('Arquivo');
  constructor(private readonly prisma: PrismaService) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
  }

  private async nomeUsuario(id: string) {
    return (await this.prisma.usuario.findUnique({ where: { id }, select: { nome: true } }))?.nome ?? '—';
  }

  private async gravar(dados: { empresaId: string; chave: string; titulo: string; categoria: string; origem: 'GERADO' | 'ENVIADO'; nomeArquivo: string; mime: string; conteudo: Buffer; descricao?: string; sessao: SessaoUsuario | { nome: string } }) {
    const ultimo = await this.prisma.arquivo.findFirst({ where: { empresaId: dados.empresaId, chave: dados.chave }, orderBy: { versao: 'desc' }, select: { versao: true } });
    const pasta = join(PASTA, dados.empresaId);
    await mkdir(pasta, { recursive: true });
    const caminho = `${dados.empresaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${TIPOS_ACEITOS[dados.mime] ?? ''}`;
    await writeFile(join(PASTA, caminho), dados.conteudo);
    const arquivo = await this.prisma.arquivo.create({
      data: {
        empresaId: dados.empresaId, chave: dados.chave, titulo: dados.titulo, categoria: dados.categoria, origem: dados.origem,
        versao: (ultimo?.versao ?? 0) + 1, nomeArquivo: dados.nomeArquivo, mime: dados.mime, tamanho: dados.conteudo.length, caminho,
        descricao: dados.descricao, ...('sub' in dados.sessao ? { criadoPorId: dados.sessao.sub, criadoPorNome: await this.nomeUsuario(dados.sessao.sub) } : { criadoPorNome: dados.sessao.nome }),
      },
    });
    if (dados.mime === 'application/pdf') {
      // O texto de dentro do PDF é lido depois, para não atrasar o download.
      textoDoPdf(dados.conteudo)
        .then((t) => this.prisma.arquivo.update({ where: { id: arquivo.id }, data: { texto: t.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500_000) || null } }))
        .catch((e) => this.log.warn(`não leu o texto do PDF ${arquivo.id}: ${e.message}`));
    }
    return arquivo;
  }

  // Chamado depois de cada PDF gerado pelo sistema (ver ArquivoInterceptor).
  async guardarGerado(sessao: SessaoUsuario, empresaId: string, rota: string, nomeArquivo: string, pdf: Buffer, colaboradorId?: string) {
    const base = nomeArquivo.replace(/\.pdf$/i, '').replace(/-v\d+$/, '');
    let titulo = base.replace(/-/g, ' ');
    if (colaboradorId) {
      const c = await this.prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId }, select: { nome: true } });
      if (c) titulo = `${titulo} · ${c.nome}`;
    }
    return this.gravar({ empresaId, chave: `gerado:${rota}`, titulo, categoria: categoriaDoNome(base), origem: 'GERADO', nomeArquivo, mime: 'application/pdf', conteudo: pdf, sessao });
  }

  // Uso interno (assinaturas): lê um arquivo da empresa sem registrar acesso.
  async lerInterno(empresaId: string, id: string) {
    const a = await this.prisma.arquivo.findFirst({ where: { id, empresaId } });
    if (!a) throw new NotFoundException('Documento não encontrado');
    return { arquivo: a, conteudo: await readFile(join(PASTA, a.caminho)) };
  }

  async guardarAssinado(empresaId: string, pedidoId: string, titulo: string, categoria: string, nomeArquivo: string, pdf: Buffer, quem: string) {
    return this.gravar({ empresaId, chave: `assinado:${pedidoId}`, titulo, categoria, origem: 'GERADO', nomeArquivo, mime: 'application/pdf', conteudo: pdf, descricao: 'Documento com a folha de assinaturas', sessao: { nome: quem } });
  }

  async enviar(sessao: SessaoUsuario, empresaId: string, arquivo: Express.Multer.File | undefined, dados: { titulo?: string; categoria?: string; descricao?: string; versaoDe?: string }) {
    await this.empresa(sessao.consultoriaId, empresaId);
    if (!arquivo) throw new BadRequestException('Escolha o arquivo.');
    if (!TIPOS_ACEITOS[arquivo.mimetype]) throw new BadRequestException('Envie PDF, imagem (PNG ou JPG), Word (.docx) ou Excel (.xlsx).');
    if (arquivo.mimetype === 'application/pdf' && arquivo.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw new BadRequestException('O arquivo não parece um PDF válido.');
    let chave: string; let titulo: string; let categoria: string;
    if (dados.versaoDe) {
      const anterior = await this.prisma.arquivo.findFirst({ where: { id: dados.versaoDe, empresaId } });
      if (!anterior) throw new NotFoundException('Documento não encontrado');
      chave = anterior.chave; titulo = anterior.titulo; categoria = anterior.categoria;
    } else {
      titulo = (dados.titulo ?? '').trim();
      if (titulo.length < 2) throw new BadRequestException('Dê um nome ao documento.');
      chave = `enviado:${titulo.toLowerCase()}`; categoria = (dados.categoria ?? '').trim() || 'Outros';
    }
    const nome = Buffer.from(arquivo.originalname, 'latin1').toString('utf8');
    return this.gravar({ empresaId, chave, titulo: titulo.slice(0, 200), categoria: categoria.slice(0, 60), origem: 'ENVIADO', nomeArquivo: nome.slice(0, 200), mime: arquivo.mimetype, conteudo: arquivo.buffer, descricao: dados.descricao?.slice(0, 500), sessao });
  }

  // Lista a versão mais recente de cada documento, com as anteriores e o total de visualizações.
  async listar(consultoriaId: string, empresaId: string, busca?: string) {
    await this.empresa(consultoriaId, empresaId);
    let ids: string[] | null = null;
    const trechos = new Map<string, string>();
    const termo = busca?.trim();
    if (termo) {
      const achados = await this.prisma.$queryRaw<{ id: string; trecho: string }[]>`
        SELECT id, CASE WHEN position('«' in t.simples) > 0 THEN t.simples ELSE t.radical END AS trecho
        FROM "Arquivo",
        LATERAL (SELECT
          ts_headline('simple', coalesce(texto, titulo), websearch_to_tsquery('simple', ${termo}), 'StartSel=«, StopSel=», MaxWords=30, MinWords=12, MaxFragments=1') AS simples,
          ts_headline('portuguese', coalesce(texto, titulo), websearch_to_tsquery('portuguese', ${termo}), 'StartSel=«, StopSel=», MaxWords=30, MinWords=12, MaxFragments=1') AS radical) t
        WHERE "empresaId" = ${empresaId}
          AND (to_tsvector('portuguese', coalesce("titulo", '') || ' ' || coalesce("texto", '')) @@ websearch_to_tsquery('portuguese', ${termo})
               OR "titulo" ILIKE ${'%' + termo + '%'} OR "nomeArquivo" ILIKE ${'%' + termo + '%'})
        LIMIT 200`;
      ids = achados.map((a) => a.id);
      for (const a of achados) trechos.set(a.id, a.trecho);
    }
    // Achou em qualquer versão: mostra o documento inteiro (versão atual e anteriores).
    const chaves = ids ? (await this.prisma.arquivo.findMany({ where: { id: { in: ids } }, select: { chave: true } })).map((a) => a.chave) : null;
    const todos = await this.prisma.arquivo.findMany({
      where: { empresaId, ...(chaves ? { chave: { in: chaves } } : {}) },
      orderBy: [{ criadoEm: 'desc' }],
      select: { id: true, chave: true, titulo: true, categoria: true, origem: true, versao: true, nomeArquivo: true, mime: true, tamanho: true, descricao: true, criadoPorNome: true, criadoEm: true, _count: { select: { acessos: true } } },
    });
    const grupos = new Map<string, typeof todos>();
    for (const a of todos) grupos.set(a.chave, [...(grupos.get(a.chave) ?? []), a]);
    return [...grupos.values()].map((versoes) => {
      versoes.sort((a, b) => b.versao - a.versao);
      const [atual, ...anteriores] = versoes;
      const achada = versoes.find((v) => trechos.has(v.id));
      return { ...atual, visualizacoes: atual._count.acessos, trecho: achada ? trechos.get(achada.id)! : null, achadoNaVersao: achada && achada.id !== atual.id ? achada.versao : null, anteriores: anteriores.map((v) => ({ id: v.id, versao: v.versao, criadoEm: v.criadoEm, criadoPorNome: v.criadoPorNome, nomeArquivo: v.nomeArquivo })) };
    });
  }

  async baixar(sessao: SessaoUsuario, empresaId: string, id: string) {
    await this.empresa(sessao.consultoriaId, empresaId);
    const a = await this.prisma.arquivo.findFirst({ where: { id, empresaId } });
    if (!a) throw new NotFoundException('Documento não encontrado');
    const conteudo = await readFile(join(PASTA, a.caminho)).catch(() => { throw new NotFoundException('O arquivo não está mais no servidor.'); });
    await this.prisma.arquivoAcesso.create({ data: { arquivoId: a.id, usuarioId: sessao.sub, usuarioNome: await this.nomeUsuario(sessao.sub), papel: sessao.papel } });
    return { arquivo: a, conteudo };
  }

  async acessos(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const a = await this.prisma.arquivo.findFirst({ where: { id, empresaId }, select: { chave: true } });
    if (!a) throw new NotFoundException('Documento não encontrado');
    return this.prisma.arquivoAcesso.findMany({ where: { arquivo: { empresaId, chave: a.chave } }, orderBy: { em: 'desc' }, take: 200, include: { arquivo: { select: { versao: true } } } });
  }

  async remover(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const a = await this.prisma.arquivo.findFirst({ where: { id, empresaId } });
    if (!a) throw new NotFoundException('Documento não encontrado');
    if (a.origem === 'GERADO') throw new BadRequestException('Documentos gerados pelo sistema ficam guardados como prova. Só os enviados podem ser apagados.');
    await this.prisma.arquivo.delete({ where: { id } });
    await unlink(join(PASTA, a.caminho)).catch(() => undefined);
    return { ok: true };
  }
}
