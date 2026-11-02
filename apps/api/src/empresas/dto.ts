import { IsDateString, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @Length(2, 200)
  razaoSocial!: string;

  @IsString()
  @Length(14, 18)
  cnpj!: string;

  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  grauRisco?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numFuncionarios?: number;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  responsavelTecnicoNome?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  responsavelTecnicoRegistro?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  representanteLegalNome?: string;
}

export class AvaliacaoRiscoDto {
  @IsIn(['QUALITATIVA', 'QUANTITATIVA'])
  tipoAvaliacao!: string;

  @IsOptional() @IsString() @Length(0, 60) intensidade?: string;
  @IsOptional() @IsString() @Length(0, 60) limiteTolerancia?: string;
  @IsOptional() @IsString() @Length(0, 200) tecnicaMedicao?: string;
  @IsOptional() @IsBoolean() epcEficaz?: boolean;
  @IsOptional() @IsBoolean() epiEficaz?: boolean;
  @IsOptional() @IsString() @Length(0, 60) epiCa?: string;
  @IsOptional() @IsString() @Length(0, 20) codigoAnexoIv?: string;
  @IsBoolean() aposentadoriaEspecial!: boolean;
  @IsOptional() @IsString() @Length(0, 10) anexoNr15?: string | null;
  @IsOptional() @IsIn(['NAO', 'MINIMO', 'MEDIO', 'MAXIMO']) grauInsalubridade?: string | null;
}

export class PericulosidadeDto {
  @IsIn(['NENHUM', 'EXPLOSIVOS', 'INFLAMAVEIS', 'SEGURANCA', 'ELETRICIDADE', 'MOTOCICLETA', 'RADIACOES'], { message: 'Escolha o anexo da NR-16 ou "não perigoso".' })
  anexo!: string;
  @IsOptional() @IsString() @Length(0, 2000) justificativa?: string;
}

export class CreateColaboradorDto {
  @IsString()
  @Length(2, 200)
  nome!: string;

  @IsOptional()
  @IsString()
  @Length(11, 14)
  cpf?: string;

  @IsString()
  cargo!: string;

  @IsOptional()
  @IsString()
  cbo?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de admissão inválida.' })
  dataAdmissao?: string;

  @IsOptional()
  @IsString()
  gheId?: string;
}

export class CreateGheDto {
  @IsString()
  @Length(2, 200)
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}

export class CreateGheRiscoDto {
  @IsIn(['FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'ACIDENTE'])
  tipo!: string;

  @IsString()
  @Length(2, 200)
  agente!: string;

  @IsString()
  @Length(2, 300)
  fonteGeradora!: string;

  @IsOptional()
  @IsString()
  medidasControle?: string;

  @IsOptional()
  @IsIn(['BAIXA', 'MEDIA', 'ALTA'])
  severidade?: string;
}

export class CreateExameGheDto {
  @IsString()
  @Length(2, 200)
  nome!: string;

  @IsIn(['CLINICO', 'COMPLEMENTAR'])
  tipo!: string;

  @IsOptional() @IsBoolean() admissional?: boolean;
  @IsOptional() @IsBoolean() periodico?: boolean;
  @IsOptional() @IsBoolean() retornoTrabalho?: boolean;
  @IsOptional() @IsBoolean() mudancaRisco?: boolean;
  @IsOptional() @IsBoolean() demissional?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  periodicidadeMeses?: number;
}

export class MedicoPcmsoDto {
  @IsString()
  @Length(2, 200)
  nome!: string;

  @IsString()
  @Length(4, 20)
  crm!: string;
}

export class UpdateEmpresaDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  razaoSocial?: string;

  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  grauRisco?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numFuncionarios?: number;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  responsavelTecnicoNome?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  responsavelTecnicoRegistro?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  representanteLegalNome?: string;
}
