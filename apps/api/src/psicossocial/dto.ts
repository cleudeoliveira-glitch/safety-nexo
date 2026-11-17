import { IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { QUESTIONARIOS } from './questionarios';

export class CriarAvaliacaoDto {
  @IsIn(QUESTIONARIOS.map((q) => q.id), { message: 'Escolha o questionário.' }) questionario!: string;
  @IsString() @Length(2, 200, { message: 'Dê um nome para a avaliação.' }) titulo!: string;
  @IsOptional() @IsInt() @Min(3, { message: 'O mínimo por setor é 3 respostas, para ninguém ser identificado.' }) @Max(50) minimoGrupo?: number;
}

export class ResponderDto {
  @IsString() @Length(1, 200, { message: 'Escolha o seu setor.' }) setor!: string;
  @IsObject() valores!: Record<string, number>;
}

export class AcaoDto {
  @IsOptional() @IsString() @MaxLength(200) setor?: string;
  @IsString() @Length(1, 120) dimensao!: string;
  @IsString() @Length(3, 1000, { message: 'Descreva a ação.' }) acao!: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
  @IsOptional() @IsDateString() prazo?: string;
}

export class AcaoFeitaDto { @IsBoolean() feita!: boolean; }

export class LevarPgrDto {
  @IsString() setor!: string;
  @IsString() dimensao!: string;
  @IsIn(['1', '2', '3', '4', '5', 'BAIXA', 'MEDIA', 'ALTA']) severidade!: string;
}

export class TecnicaDto {
  @IsString() @Length(1, 200) setor!: string;
  // Nota de 0 a 4 por tema; tema sem nota fica só com o questionário.
  @IsObject() valores!: Record<string, number | null>;
}
