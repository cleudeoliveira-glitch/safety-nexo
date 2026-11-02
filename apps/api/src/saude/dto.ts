import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min, ValidateNested } from 'class-validator';

export class RecomendacaoDto {
  @IsString() @Length(2, 500) recomendacao!: string;
  @IsOptional() @IsString() @MaxLength(60) prazo?: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
}

export class CriarAetDto {
  @IsString() @Length(2, 200) posto!: string;
  @IsDateString({}, { message: 'Informe a data da AET.' }) data!: string;
  @IsString() @Length(2, 120) responsavel!: string;
  @IsString() @Length(2, 5000) demanda!: string;
  @IsString() @Length(2, 5000) funcionamento!: string;
  @IsString() @Length(2, 5000) metodos!: string;
  @IsString() @Length(2, 5000) diagnostico!: string;
  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua pelo menos uma recomendação.' })
  @ValidateNested({ each: true })
  @Type(() => RecomendacaoDto)
  recomendacoes!: RecomendacaoDto[];
  @IsString() @Length(2, 5000) restituicao!: string;
}

export class CriarCatDto {
  @IsString() colaboradorId!: string;
  @IsIn(['INICIAL', 'REABERTURA', 'OBITO']) tipoCat!: string;
  @IsIn(['TIPICO', 'TRAJETO', 'DOENCA']) tipoAcidente!: string;
  @IsDateString({}, { message: 'Informe a data e a hora do acidente.' }) dataHora!: string;
  @IsOptional() @IsString() @MaxLength(10) horasTrabalhadas?: string;
  @IsString() @Length(2, 300) local!: string;
  @IsString() @Length(2, 200) parteAtingida!: string;
  @IsString() @Length(2, 200) agenteCausador!: string;
  @IsString() @Length(2, 200) naturezaLesao!: string;
  @IsString() @Length(2, 3000) descricao!: string;
  @IsBoolean() houveAfastamento!: boolean;
  @IsOptional() @IsBoolean() houveObito?: boolean;
  @IsOptional() @IsBoolean() registroPolicial?: boolean;
  @IsOptional() @IsString() @MaxLength(500) testemunhas?: string;
  @IsOptional() @IsDateString() atendimentoData?: string;
  @IsOptional() @IsString() @MaxLength(120) medicoNome?: string;
  @IsOptional() @IsString() @MaxLength(30) medicoCrm?: string;
  @IsOptional() @IsString() @MaxLength(10) cid?: string;
  @IsOptional() @IsInt() @Min(0) diasTratamento?: number;
}

export class EnvioCatDto {
  @IsString() @Length(1, 60) recibo!: string;
}
