import { ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CriarTurmaDto {
  @IsString()
  @Length(2, 200)
  nome!: string;

  @IsOptional()
  @IsString()
  norma?: string;

  @IsInt()
  @Min(1)
  @Max(400)
  cargaHoraria!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  validadeMeses?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua pelo menos um item no conteúdo programático.' })
  @IsString({ each: true })
  conteudo!: string[];

  @IsDateString({}, { message: 'Informe o início do treinamento.' })
  inicio!: string;

  @IsDateString({}, { message: 'Informe o fim do treinamento.' })
  fim!: string;

  @IsString()
  @Length(2, 200)
  local!: string;

  @IsString()
  @Length(2, 120)
  instrutor!: string;

  @IsString()
  @Length(2, 200)
  qualificacao!: string;

  @IsString()
  @Length(2, 120)
  responsavelTecnico!: string;
}

export class ParticipantesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos um colaborador.' })
  @IsString({ each: true })
  colaboradorIds!: string[];
}
