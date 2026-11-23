import { identificacao } from '../documentos/capa';
import * as QRCode from 'qrcode';
import { escape, folhaHtml } from '../documentos/layout';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { Guarda } from '../common/guarda';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { relatorioDeInspecao, RelatorioInspecaoIa } from '../ia/ia';
import { PrismaService } from '../prisma/prisma.service';
import { CriarInspecaoDto } from './dto';
import { ehModelo } from './modelos';
import { FotoNoPdf, inspecaoHtml, ItemInspecao, resumoInspecao } from './templates';

// Fotos das inspeções: no Supabase Storage (ou na pasta local, sem nuvem).
const guarda = new Guarda('inspecoes', process.env.INSPECOES_DIR ?? join(__dirname, '..', '..', 'storage', 'inspecoes'));
export const MAX_FOTOS = 15;
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

  // Apaga a inspeção e as fotos guardadas dela.
  async excluir(consultoriaId: string, empresaId: string, id: string) {
    const i = await this.achar(consultoriaId, empresaId, id);
    await Promise.all(fotosDe(i.fotos).map((f) => guarda.apagar(f.caminho).catch(() => undefined)));
    await this.prisma.inspecao.delete({ where: { id: i.id } });
    return { ok: true };
  }

  // O que vai para a tela: sem o caminho interno das fotos.
  // O resumo traz a conformidade e a multa estimada (NR-28) pelo número de empregados da empresa.
  private async paraTela<T extends { empresaId: string; modelo: string; itens: unknown; fotos: unknown }>(i: T, empregados?: number) {
    const { fotos, ...resto } = i;
    const n = empregados ?? (await this.prisma.empresa.findUnique({ where: { id: i.empresaId }, select: { numFuncionarios: true } }))?.numFuncionarios ?? 0;
    return { ...resto, fotos: fotosDe(fotos).map((f, k) => ({ n: k, legenda: f.legenda ?? '' })), resumo: resumoInspecao(i.modelo, i.itens as unknown as ItemInspecao[], n) };
  }

  // Etiquetas com QR para colar nos equipamentos e locais já inspecionados (extintor, máquina, escada...).
  // A câmera do celular lê o código e abre a inspeção daquele item no sistema, já com o modelo e o local.
  async etiquetas(consultoriaId: string, empresaId: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.inspecao.findMany({ where: { empresaId }, orderBy: { data: 'desc' }, select: { modelo: true, titulo: true, local: true } });
    const vistos = new Set<string>();
    const unicos = lista.filter((i) => { const k = `${i.modelo}|${i.local.trim().toLowerCase()}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
    if (!unicos.length) throw new BadRequestException('Faça a primeira inspeção de cada equipamento ou local. Depois as etiquetas com QR ficam prontas aqui.');
    const web = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
    const itens = await Promise.all(unicos.map(async (i) => {
      const link = `${web}/empresas/${empresaId}/operacao?modelo=${encodeURIComponent(i.modelo)}&local=${encodeURIComponent(i.local)}#checklist`;
      return `<div class="etq"><img src="${await QRCode.toDataURL(link, { margin: 0, width: 220 })}"/><div><strong>${escape(i.local)}</strong><br/>${escape(i.titulo)}<br/><span class="emp">${escape(empresa.razaoSocial)}</span><br/><em>Aponte a câmera do celular para inspecionar</em></div></div>`;
    }));
    return this.pdf.render(folhaHtml(`<div class="grade">${itens.join('')}</div>`,
      `.grade { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; } .etq { display: flex; gap: 12px; align-items: center; border: 1px dashed #9ca3af; padding: 10px; page-break-inside: avoid; font-size: 12px; } .etq img { width: 110px; flex: none; } .etq > div { flex: 1; min-width: 0; overflow-wrap: anywhere; } .emp { color: #6b7280; font-size: 10px; }`));
  }

  async listar(consultoriaId: string, empresaId: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.inspecao.findMany({ where: { empresaId }, orderBy: [{ data: 'desc' }, { createdAt: 'desc' }] });
    return Promise.all(lista.map((i) => this.paraTela(i, empresa.numFuncionarios)));
  }

  async criar(consultoriaId: string, empresaId: string, dto: CriarInspecaoDto) {
    await this.empresa(consultoriaId, empresaId);
    if (!ehModelo(dto.modelo)) throw new BadRequestException('Modelo de inspeção desconhecido.');
    const itens = dto.itens.map((i) => ({
      texto: i.texto.trim(),
      resposta: i.resposta,
      ...(i.observacao?.trim() ? { observacao: i.observacao.trim() } : {}),
      ...(i.grau ? { grau: i.grau } : {}),
    }));
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
    const contexto = [`Local: ${i.local}`, `Inspeção: ${i.titulo}`, ncs.length ? `Não conformidades marcadas: ${ncs.join('; ')}` : '', ...fotos.map((f, n) => (f.legenda ? `Foto ${n + 1}: ${f.legenda}` : ''))].filter(Boolean).join('. ');
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
          infos: identificacao(empresa),
          aviso: 'Feito com o Safety Nexo. O que não estiver conforme vai para o plano de ação.',
        },
        { ...i, itens: i.itens as unknown as ItemInspecao[], fotos, relatorioIa: (i.relatorioIa as RelatorioInspecaoIa | null) ?? null },
        empresa.numFuncionarios,
      ),
    );
  }
}
