import { IsBoolean, IsDateString, IsIn, IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class RegistroSaudeDto {
  @IsString() colaboradorId!: string;
  @IsIn(['VACINA', 'AUDIOMETRIA', 'ESPIROMETRIA', 'OUTRO']) tipo!: string;
  @IsDateString({}, { message: 'Informe a data.' }) data!: string;
  @IsString() @Length(2, 200, { message: 'Informe a vacina e a dose, ou o nome do exame.' }) titulo!: string;
  @IsOptional() @IsString() @MaxLength(2000) resultado?: string;
  @IsOptional() @IsObject() dados?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(200) profissional?: string;
  @IsOptional() @IsString() @MaxLength(60) lote?: string;
  @IsOptional() @IsDateString() proximaData?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacao?: string;
  @IsOptional() @IsBoolean() alterado?: boolean;
}
