import { Body, Controller, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { SsmaService } from './ssma.service';

class ConfigDto { @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1e7) custoDiaFalta?: number | null; }
class HorasDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês no formato AAAA-MM.' }) mes!: string;
  @IsOptional() @IsNumber() @Min(1, { message: 'Informe as horas trabalhadas no mês.' }) @Max(1e9) horas?: number | null;
}

@PermiteEmpresa()
@Controller('empresas/:empresaId/ssma')
export class SsmaController {
  constructor(private readonly ssma: SsmaService) {}

  @Get() montar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Query('fim') fim?: string, @Query('gheId') gheId?: string) { return this.ssma.montar(c, e, { fim, gheId: gheId || undefined }); }
  @Put('config') config(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: ConfigDto) { return this.ssma.configurar(c, e, dto.custoDiaFalta ?? null); }
  @Put('horas') horas(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: HorasDto) { return this.ssma.horas(c, e, dto.mes, dto.horas ?? null); }
  @Post('pdf') async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Query('fim') fim: string | undefined, @Query('gheId') gheId: string | undefined, @Res() res: Response) {
    enviarPdf(res, await this.ssma.relatorio(c, e, { fim, gheId: gheId || undefined }), 'SSMA-painel.pdf');
  }
}
