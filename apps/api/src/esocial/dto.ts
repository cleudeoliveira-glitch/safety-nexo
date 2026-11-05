import { IsDateString, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class ToxicologicoDto {
  @IsString() colaboradorId!: string;
  @IsDateString({}, { message: 'Informe a data do exame.' }) dataExame!: string;
  @IsString() @Length(14, 18, { message: 'Informe o CNPJ do laboratório.' }) cnpjLaboratorio!: string;
  @IsString() @Length(11, 14, { message: 'Informe o código do exame (2 letras e 9 números).' }) codigoExame!: string;
  @IsString() @Length(3, 70, { message: 'Informe o nome do médico que assinou o laudo.' }) medicoNome!: string;
  @IsOptional() @IsString() @MaxLength(20) medicoCrm?: string;
  @IsOptional() @IsString() @MaxLength(2) medicoUf?: string;
}
