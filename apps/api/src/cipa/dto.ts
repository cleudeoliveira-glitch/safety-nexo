import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CipaDto {
  @IsOptional()
  @IsBoolean()
  atendidaSesmt?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Informe a data de início do mandato.' })
  inicioMandato?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  representante?: string;
}
