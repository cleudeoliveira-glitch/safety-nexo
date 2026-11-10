import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  descricaoProcessos?: string;
}

export class EpiComplDto {
  @IsBoolean() medProtecao!: boolean;
  @IsBoolean() condFuncto!: boolean;
  @IsBoolean() usoInint!: boolean;
  @IsBoolean() przValid!: boolean;
  @IsBoolean() periodicTroca!: boolean;
  @IsBoolean() higienizacao!: boolean;
}

// Dados do agente para o S-2240 (Tabela 24, unidade de medida, EPC/EPI).
export class EsocialRiscoDto {
  @IsOptional() @Matches(/^\d{2}\.\d{2}\.\d{3}$/, { message: 'O código da Tabela 24 tem o formato 00.00.000.' }) codAgNoc?: string;
  @IsOptional() @IsInt() @Min(1) @Max(30) unMed?: number;
  @IsOptional() @IsIn([0, 1, 2]) utilizEPC?: number;
  @IsOptional() @IsIn([0, 1, 2]) utilizEPI?: number;
  @IsOptional() @ValidateNested() @Type(() => EpiComplDto) epiCompl?: EpiComplDto;
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
  @IsOptional() @ValidateNested() @Type(() => EsocialRiscoDto) esocial?: EsocialRiscoDto;
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

  @IsOptional() @IsString() @Length(1, 30) matricula?: string;
  @IsOptional() @Matches(/^\d{3}$/, { message: 'A categoria do eSocial tem 3 dígitos (ex.: 901 para estagiário).' }) codCateg?: string;
}

export class EsocialColaboradorDto {
  @IsOptional() @IsString() @Length(0, 30) matricula?: string;
  @IsOptional() @Matches(/^(\d{3})?$/, { message: 'A categoria do eSocial tem 3 dígitos (ex.: 901 para estagiário).' }) codCateg?: string;
  @IsOptional() @Matches(/^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})?$/, { message: 'CPF inválido.' }) cpf?: string;
}

export class CodigoExameDto {
  @Matches(/^(\d{4})?$/, { message: 'O código da Tabela 27 tem 4 dígitos.' }) codigoEsocial!: string;
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

  @IsOptional()
  @IsIn(['BAIXA', 'MEDIA', 'ALTA'])
  probabilidade?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  possiveisLesoes?: string;
}

// Ajuste de um risco já cadastrado: classificação (NR-01, 1.5.4.4.2), lesões e medidas.
export class UpdateGheRiscoDto {
  @IsOptional() @IsIn(['BAIXA', 'MEDIA', 'ALTA']) severidade?: string;
  @IsOptional() @IsIn(['BAIXA', 'MEDIA', 'ALTA']) probabilidade?: string;
  @IsOptional() @IsString() @Length(0, 500) possiveisLesoes?: string;
  @IsOptional() @IsString() @Length(0, 2000) medidasControle?: string;
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

  @IsOptional() @Matches(/^(\d{4})?$/, { message: 'O código da Tabela 27 tem 4 dígitos.' }) codigoEsocial?: string;
}

export class MedicoPcmsoDto {
  @IsString()
  @Length(2, 200)
  nome!: string;

  @IsString()
  @Length(4, 20)
  crm!: string;
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export class UpdateEmpresaDto {
  // eSocial
  @IsOptional() @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: 'CPF do médico do PCMSO inválido.' }) medicoPcmsoCpf?: string;
  @IsOptional() @IsIn(UFS, { message: 'UF do CRM do médico do PCMSO inválida.' }) medicoPcmsoUf?: string;
  @IsOptional() @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: 'CPF do responsável técnico inválido.' }) responsavelTecnicoCpf?: string;
  @IsOptional() @IsIn(['CRM', 'CREA', 'OUTRO']) responsavelTecnicoConselho?: string;
  @IsOptional() @IsIn(UFS, { message: 'UF do registro do responsável técnico inválida.' }) responsavelTecnicoUf?: string;
  @IsOptional() @IsIn(['PRODUCAO_RESTRITA', 'PRODUCAO']) esocialAmbiente?: string;

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

export class CopiarDadosDto {
  @IsString() origemId!: string;
  // Vazio copia todos os GHEs da empresa de origem.
  @IsOptional() @IsArray() @IsString({ each: true }) gheIds?: string[];
  @IsOptional() @IsBoolean() responsaveis?: boolean;
}
