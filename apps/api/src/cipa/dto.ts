import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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

export class CriarEleicaoDto {
  @IsDateString({}, { message: 'Informe a data do edital.' })
  editalEm!: string;

  @IsDateString({}, { message: 'Informe o início das inscrições.' })
  inscricaoInicio!: string;

  @IsDateString({}, { message: 'Informe o fim das inscrições.' })
  inscricaoFim!: string;

  @IsDateString({}, { message: 'Informe a data da eleição.' })
  eleicaoEm!: string;

  @IsString()
  @MaxLength(160)
  localVotacao!: string;

  @IsString()
  @MaxLength(60)
  horarioVotacao!: string;
}

export class AtualizarEleicaoDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  votantes?: number;

  @IsOptional()
  @IsDateString()
  posseEm?: string;

  @IsOptional()
  @IsDateString()
  treinamentoInicio?: string;

  @IsOptional()
  @IsDateString()
  treinamentoFim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instrutor?: string;
}

export class CriarMembroDto {
  @IsString()
  colaboradorId!: string;

  @IsIn(['EMPREGADOS', 'ORGANIZACAO'])
  representacao!: 'EMPREGADOS' | 'ORGANIZACAO';

  @IsOptional()
  @IsBoolean()
  titular?: boolean;
}

export class AtualizarMembroDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  votos?: number;

  @IsOptional()
  @IsBoolean()
  titular?: boolean;

  @IsOptional()
  @IsBoolean()
  presidente?: boolean;

  @IsOptional()
  @IsBoolean()
  vice?: boolean;
}
