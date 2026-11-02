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
}
