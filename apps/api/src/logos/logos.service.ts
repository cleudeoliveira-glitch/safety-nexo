import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { Guarda } from '../common/guarda';

const TIPOS_ACEITOS: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg' };
const TAMANHO_MAXIMO = 2 * 1024 * 1024;

// Logos no Supabase Storage em produção; em disco no uso local (ver common/guarda.ts).
const guarda = new Guarda('logos', process.env.LOGOS_DIR ?? join(__dirname, '..', '..', 'storage', 'logos'));

@Injectable()
export class LogosService {
  constructor(private readonly prisma: PrismaService) {}

  async salvarLogoEmpresa(consultoriaId: string, empresaId: string, arquivo?: Express.Multer.File) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    const logoPath = await this.salvar(`empresa-${empresaId}`, arquivo);
    return this.prisma.empresa.update({ where: { id: empresaId }, data: { logoPath } });
  }

  async salvarLogoConsultoria(consultoriaId: string, arquivo?: Express.Multer.File) {
    const logoPath = await this.salvar(`consultoria-${consultoriaId}`, arquivo);
    return this.prisma.consultoria.update({ where: { id: consultoriaId }, data: { logoPath } });
  }

  async comoDataUri(logoPath: string | null): Promise<string | null> {
    if (!logoPath) return null;
    try {
      const conteudo = await guarda.ler(logoPath);
      const mime = extname(logoPath) === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${conteudo.toString('base64')}`;
    } catch {
      return null;
    }
  }

  private async salvar(nomeBase: string, arquivo?: Express.Multer.File): Promise<string> {
    if (!arquivo) throw new BadRequestException('Envie a imagem da logo no campo "arquivo".');
    const extensao = TIPOS_ACEITOS[arquivo.mimetype];
    if (!extensao) throw new BadRequestException('A logo precisa ser PNG ou JPG.');
    if (arquivo.size > TAMANHO_MAXIMO) throw new BadRequestException('A logo precisa ter no máximo 2 MB.');

    const nome = `${nomeBase}${extensao}`;
    await guarda.gravar(nome, arquivo.buffer, arquivo.mimetype);
    return nome;
  }
}
