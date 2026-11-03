import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { TIPOS_ATESTADO } from './absenteismo';

export class TerceiroDto {
  @IsString() @Length(2, 200, { message: 'Informe o nome da empresa prestadora.' }) razaoSocial!: string;
  @IsOptional() @IsString() @MaxLength(18) cnpj?: string;
  @IsString() @Length(2, 300, { message: 'Diga qual serviço ela faz.' }) servico!: string;
  @IsOptional() @IsString() @MaxLength(120) contato?: string;
  @IsOptional() @IsString() @MaxLength(30) telefone?: string;
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fim?: string;
}

export class TerceiroDocumentoDto {
  @IsString() @Length(2, 120, { message: 'Escolha o documento.' }) tipo!: string;
  @IsOptional() @IsDateString({}, { message: 'Validade inválida.' }) validade?: string;
  @IsOptional() @IsString() @MaxLength(300) observacao?: string;
}

export class TreinamentoTerceiroDto {
  @IsString() @Length(2, 120) nome!: string;
  @IsOptional() @IsDateString() validade?: string;
}

export class TerceiroTrabalhadorDto {
  @IsString() @Length(2, 200, { message: 'Informe o nome do trabalhador.' }) nome!: string;
  @IsOptional() @IsString() @MaxLength(14) cpf?: string;
  @IsOptional() @IsString() @MaxLength(120) funcao?: string;
  @IsOptional() @IsDateString() asoValidade?: string;
  @IsOptional() @IsDateString() integracao?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TreinamentoTerceiroDto) treinamentos?: TreinamentoTerceiroDto[];
}

export class AtestadoDto {
  @IsString({ message: 'Escolha o funcionário.' }) colaboradorId!: string;
  @IsDateString({}, { message: 'Informe a data do atestado.' }) inicio!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(365, { message: 'Atestado de no máximo 365 dias.' }) dias!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(24) horas?: number;
  @IsIn(Object.keys(TIPOS_ATESTADO), { message: 'Escolha o tipo do atestado.' }) tipo!: string;
  @IsOptional() @Matches(/^([A-Za-z]\d{2}(\.?\d{1,2})?)?$/, { message: 'CID no formato A00 ou A00.0.' }) cid?: string;
  @IsOptional() @IsString() @MaxLength(120) medico?: string;
  @IsOptional() @IsString() @MaxLength(300) observacao?: string;
}

export class JornadaDto {
  @Type(() => Number) @IsNumber() @Min(1) @Max(12) jornadaDiariaHoras!: number;
}
