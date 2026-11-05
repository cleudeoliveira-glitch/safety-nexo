import { BadRequestException, Body, Controller, Get, Module, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { iaConfigurada } from '../importacao/leitor';
import { PrismaService } from '../prisma/prisma.service';
import { analisarFoto, sugerirApr, sugerirInvestigacao } from './ia';

class FotoDto { @IsOptional() @IsString() @MaxLength(500) contexto?: string; }
class AprDto {
  @IsString() @Length(3, 500, { message: 'Descreva a atividade.' }) atividade!: string;
  @IsOptional() @IsString() @MaxLength(200) local?: string;
}
class InvestigacaoIaDto { @IsString() @Length(10, 5000, { message: 'Conte o que aconteceu com mais detalhes.' }) descricao!: string; }

const UMA_FOTO = FileInterceptor('foto', { limits: { fileSize: 8_000_000 } });
const imagem = (f?: Express.Multer.File) => (f ? { dados: f.buffer, tipo: f.mimetype } : undefined);

// Sugestões da IA. A consultora sempre revisa antes de usar.
@Controller()
export class IaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ia/status') status() { return { ligada: iaConfigurada() }; }

  private async empresa(consultoriaId: string, empresaId: string) {
    if (!(await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } }))) throw new BadRequestException('Empresa não encontrada');
  }

  @Post('empresas/:empresaId/ia/foto')
  @UseInterceptors(UMA_FOTO)
  async foto(@ConsultoriaId() c: string, @Param('empresaId') e: string, @UploadedFile() f: Express.Multer.File, @Body() d: FotoDto) {
    await this.empresa(c, e);
    if (!f) throw new BadRequestException('Envie uma foto.');
    return analisarFoto(imagem(f)!, d.contexto ?? '');
  }

  @Post('empresas/:empresaId/ia/apr')
  @UseInterceptors(UMA_FOTO)
  async apr(@ConsultoriaId() c: string, @Param('empresaId') e: string, @UploadedFile() f: Express.Multer.File | undefined, @Body() d: AprDto) {
    await this.empresa(c, e);
    return sugerirApr(d.atividade, d.local ?? '', imagem(f));
  }

  @Post('empresas/:empresaId/ia/investigacao')
  async investigacao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() d: InvestigacaoIaDto) {
    await this.empresa(c, e);
    return sugerirInvestigacao(d.descricao);
  }
}

@Module({ controllers: [IaController] })
export class IaModule {}
