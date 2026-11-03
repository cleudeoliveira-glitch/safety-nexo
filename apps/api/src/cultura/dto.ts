import { IsArray, IsDateString, IsInt, IsObject, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class SipatDto {
  @IsInt() @Min(2000) @Max(2100) ano!: number;
  @IsString() @Length(2, 200, { message: 'Informe o tema da SIPAT.' }) tema!: string;
  @IsDateString({}, { message: 'Informe o primeiro dia.' }) inicio!: string;
  @IsDateString({}, { message: 'Informe o último dia.' }) fim!: string;
}

export class AtividadeDto {
  @IsDateString({}, { message: 'Informe o dia da atividade.' }) data!: string;
  @IsString() @Length(1, 20, { message: 'Informe o horário.' }) horario!: string;
  @IsString() @Length(2, 200, { message: 'Informe o tema da atividade.' }) titulo!: string;
  @IsString() @Length(2, 200, { message: 'Informe quem conduz.' }) responsavel!: string;
  @IsString() @Length(2, 200, { message: 'Informe o local.' }) local!: string;
  @IsOptional() @IsInt() @Min(5) @Max(600) duracaoMin?: number;
}

export class PresencaDto { @IsArray() @IsString({ each: true }) presentes!: string[]; }

export class Auditoria5sDto {
  @IsString() @Length(1, 200, { message: 'Escolha o setor.' }) setor!: string;
  @IsDateString() data!: string;
  @IsString() @Length(2, 120, { message: 'Informe quem auditou.' }) auditor!: string;
  @IsObject() notas!: Record<string, number>;
  @IsOptional() @IsString() @MaxLength(3000) observacoes?: string;
}
