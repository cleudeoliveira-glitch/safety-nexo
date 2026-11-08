import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';

export const TIPOS_RELATO = ['QUASE_ACIDENTE', 'CONDICAO_INSEGURA', 'ATO_INSEGURO', 'SUGESTAO'] as const;
export const CATEGORIAS_CAUSA = ['METODO', 'MAQUINA', 'MATERIAL', 'PESSOAS', 'AMBIENTE', 'GESTAO'] as const;

export class RelatoPublicoDto {
  @IsIn(TIPOS_RELATO, { message: 'Escolha o tipo do relato.' }) tipo!: string;
  @IsString() @Length(5, 3000, { message: 'Conte o que você viu (pelo menos algumas palavras).' }) descricao!: string;
  @IsOptional() @IsString() @MaxLength(200) local?: string;
  @IsOptional() @IsString() @MaxLength(120) nome?: string;
}

export class TratarRelatoDto {
  @IsIn(['NOVO', 'EM_ANALISE', 'ENCERRADO']) status!: string;
  @IsOptional() @IsString() @MaxLength(3000) resposta?: string;
}

export class AcaoDto {
  @IsString() @Length(3, 2000, { message: 'Descreva a ação.' }) descricao!: string;
  @IsOptional() @IsString() @MaxLength(200) local?: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
  @IsOptional() @IsDateString() prazo?: string;
  @IsOptional() @IsIn(['ALTA', 'MEDIA', 'BAIXA']) prioridade?: string;
  @IsOptional() @IsIn(['RAPIDO', 'MEDIO', 'DEMORADO']) esforco?: string;
  @IsOptional() @IsIn(['MANUAL', 'RELATO', 'INSPECAO', 'INVESTIGACAO', 'IA']) origem?: string;
  @IsOptional() @IsString() @MaxLength(60) origemId?: string;
  @IsOptional() @IsString() @MaxLength(200) origemTexto?: string;
}

export class AtualizarAcaoDto {
  @IsOptional() @IsString() @Length(3, 2000) descricao?: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
  @IsOptional() @IsDateString() prazo?: string;
  @IsOptional() @IsIn(['ALTA', 'MEDIA', 'BAIXA']) prioridade?: string;
  @IsOptional() @IsIn(['RAPIDO', 'MEDIO', 'DEMORADO']) esforco?: string;
  @IsOptional() @IsIn(['ABERTA', 'ANDAMENTO', 'FEITA']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacao?: string;
}

export class CausaDto {
  @IsIn(CATEGORIAS_CAUSA) categoria!: string;
  @IsString() @Length(2, 1000) texto!: string;
}

export class MedidaDto {
  @IsString() @Length(3, 2000) descricao!: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
  @IsOptional() @IsDateString() prazo?: string;
  @IsOptional() @IsIn(['ALTA', 'MEDIA', 'BAIXA']) prioridade?: string;
}

export class InvestigacaoDto {
  @IsOptional() @IsString() catId?: string;
  @IsOptional() @IsString() relatoId?: string;
  @IsString() @Length(3, 200, { message: 'Dê um título à investigação.' }) titulo!: string;
  @IsDateString() dataOcorrencia!: string;
  @IsString() @Length(2, 200) local!: string;
  @IsString() @Length(10, 5000, { message: 'Descreva o que aconteceu.' }) descricao!: string;
  @IsString() @Length(2, 500, { message: 'Diga quem participou da investigação.' }) equipe!: string;
  @IsArray() @ArrayMaxSize(7) @IsString({ each: true }) porques!: string[];
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => CausaDto) causas!: CausaDto[];
  @IsOptional() @IsString() @MaxLength(5000) conclusao?: string;
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => MedidaDto) medidas!: MedidaDto[];
}
