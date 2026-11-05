import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { Guarda } from '../common/guarda';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { relatorioDeInspecao, RelatorioInspecaoIa } from '../ia/ia';
import { PrismaService } from '../prisma/prisma.service';
import { CriarInspecaoDto } from './dto';
import { ehModelo } from './modelos';
import { conformidade, FotoNoPdf, inspecaoHtml, ItemInspecao } from './templates';

// Fotos das inspeções: no Supabase Storage (ou na pasta local, sem nuvem).
const guarda = new Guarda('inspecoes', process.env.INSPECOES_DIR ?? join(__dirname, '..', '..', 'storage', 'inspecoes'));
export const MAX_FOTOS = 5;
const TIPOS: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export type FotoInspecao = { caminho: string; tipo: string; legenda?: string };
const fotosDe = (v: unknown) => (Array.isArray(v) ? (v as FotoInspecao[]) : []);
const DIA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class InspecoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private async achar(consultoriaId: string, empresaId: string, id: string) {
    const i = await this.prisma.inspecao.findFirst({ where: { id, empresaId, empresa: { consultoriaId } } });
    if (!i) throw new NotFoundException('Inspeção não encontrada');
    return i;
  }

  // O que vai para a tela: sem o caminho interno das fotos.
  private paraTela<T extends { itens: unknown; fotos: unknown }>(i: T) {
    const { fotos, ...resto } = i;
    return { ...resto, fotos: fotosDe(fotos).map((f, n) => ({ n, legenda: f.legenda ?? '' })), resumo: conformidade(i.itens as unknown as ItemInspecao[]) };
  }

  async listar(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.inspecao.findMany({ where: { empresaId }, orderBy: [{ data: 'desc' }, { createdAt: 'desc' }] });
    return lista.map((i) => this.paraTela(i));
  }

  async criar(consultoriaId: string, empresaId: string, dto: CriarInspecaoDto) {
    await this.empresa(consultoriaId, empresaId);
    if (!ehModelo(dto.modelo)) throw new BadRequestException('Modelo de checklist desconhecido.');
    const itens = dto.itens.map((i) => ({ texto: i.texto.trim(), resposta: i.resposta, ...(i.observacao?.trim() ? { observacao: i.observacao.trim() } : {}) }));
    const { proximaInspecao, ...dados } = dto;
    const criada = await this.prisma.inspecao.create({
      data: { ...dados, local: dto.local.trim(), itens, empresaId, data: new Date(dto.data), proximaInspecao: proximaInspecao ? new Date(proximaInspecao) : null },
    });
    return this.paraTela(criada);
  }

  async definirProxima(consultoriaId: string, empresaId: string, id: string, data: string | null | undefined) {
    await this.achar(consultoriaId, empresaId, id);
    const atualizada = await this.prisma.inspecao.update({ where: { id }, data: { proximaInspecao: data ? new Date(data) : null } });
    return this.paraTela(atualizada);
  }

  async enviarFotos(consultoriaId: string, empresaId: string, id: string, arquivos: Express.Multer.File[] | undefined, legendas?: string) {
    const i = await this.achar(consultoriaId, empresaId, id);
    if (!arquivos?.length) throw new BadRequestException('Escolha pelo menos uma foto.');
    const atuais = fotosDe(i.fotos);
    if (atuais.length + arquivos.length > MAX_FOTOS) throw new BadRequestException(`Cada inspeção aceita até ${MAX_FOTOS} fotos. Já tem ${atuais.length}.`);
    let textos: string[] = [];
    try { textos = legendas ? (JSON.parse(legendas) as string[]) : []; } catch { textos = []; }
    const novas: FotoInspecao[] = [];
    for (const [n, a] of arquivos.entries()) {
      const ext = TIPOS[a.mimetype];
      if (!ext) throw new BadRequestException('Envie as fotos em JPG, PNG ou WEBP.');
      const caminho = `${empresaId}/${id}/${Date.now()}-${n}${ext}`;
      await guarda.gravar(caminho, a.buffer, a.mimetype);
      novas.push({ caminho, tipo: a.mimetype, ...(String(textos[n] ?? '').trim() ? { legenda: String(textos[n]).trim().slice(0, 200) } : {}) });
    }
    const atualizada = await this.prisma.inspecao.update({ where: { id }, data: { fotos: [...atuais, ...novas] } });
    return this.paraTela(atualizada);
  }

  async foto(consultoriaId: string, empresaId: string, id: string, n: number) {
    const f = fotosDe((await this.achar(consultoriaId, empresaId, id)).fotos)[n];
    if (!f) throw new NotFoundException('Foto não encontrada');
    return { dados: await guarda.ler(f.caminho), tipo: f.tipo };
  }

  async removerFoto(consultoriaId: string, empresaId: string, id: string, n: number) {
    const i = await this.achar(consultoriaId, empresaId, id);
    const fotos = fotosDe(i.fotos);
    const f = fotos[n];
    if (!f) throw new NotFoundException('Foto não encontrada');
    await guarda.apagar(f.caminho).catch(() => undefined);
    const atualizada = await this.prisma.inspecao.update({ where: { id }, data: { fotos: fotos.filter((_, j) => j !== n) } });
    return this.paraTela(atualizada);
  }

  // A IA lê todas as fotos da inspeção e monta o relatório. Sem prazo marcado, usa o prazo que ela sugere.
  async analisarComIa(consultoriaId: string, empresaId: string, id: string) {
    const i = await this.achar(consultoriaId, empresaId, id);
    const fotos = fotosDe(i.fotos);
    if (!fotos.length) throw new BadRequestException('Inclua pelo menos uma foto do local para a IA analisar.');
    const imagens = await Promise.all(fotos.map(async (f) => ({ dados: await guarda.ler(f.caminho), tipo: f.tipo })));
    const ncs = (i.itens as unknown as ItemInspecao[]).filter((x) => x.resposta === 'NC').map((x) => x.texto);
    const contexto = [`Local: ${i.local}`, `Checklist: ${i.titulo}`, ncs.length ? `Não conformidades marcadas: ${ncs.join('; ')}` : '', ...fotos.map((f, n) => (f.legenda ? `Foto ${n + 1}: ${f.legenda}` : ''))].filter(Boolean).join('. ');
    const relatorio = await relatorioDeInspecao(imagens, contexto);
    const proxima = i.proximaInspecao ?? new Date(i.data.getTime() + relatorio.prazoSugeridoDias * DIA_MS);
    const atualizada = await this.prisma.inspecao.update({ where: { id }, data: { relatorioIa: relatorio, proximaInspecao: proxima } });
    return this.paraTela(atualizada);
  }

  async gerarPdf(consultoriaId: string, empresaId: string, id: string) {
    const i = await this.achar(consultoriaId, empresaId, id);
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'INSPECAO');
    const fotos: FotoNoPdf[] = [];
    for (const f of fotosDe(i.fotos)) {
      try { fotos.push({ uri: `data:${f.tipo};base64,${(await guarda.ler(f.caminho)).toString('base64')}`, legenda: f.legenda ?? '' }); } catch { /* foto apagada do armazenamento: segue sem ela */ }
    }
    return this.pdf.render(
      inspecaoHtml(
        {
          titulo: 'Relatório de Inspeção de Segurança',
          logoEmpresa,
          consultoria,
          infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]],
          aviso: 'Documento gerado pelo Safety Nexo. As não conformidades devem ser corrigidas e acompanhadas no plano de ação.',
        },
        { ...i, itens: i.itens as unknown as ItemInspecao[], fotos, relatorioIa: (i.relatorioIa as RelatorioInspecaoIa | null) ?? null },
      ),
    );
  }
}
