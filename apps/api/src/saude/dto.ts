import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

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

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const NOVE = /^(\d{9})?$/;

// Códigos e dados extras da CAT para o S-2210.
export class EsocialCatDto {
  @IsOptional() @Matches(NOVE, { message: 'Situação geradora: código de 9 dígitos.' }) codSitGeradora?: string;
  @IsOptional() @Matches(NOVE, { message: 'Parte atingida: código de 9 dígitos.' }) codParteAting?: string;
  @IsOptional() @IsIn([0, 1, 2, 3]) lateralidade?: number;
  @IsOptional() @Matches(NOVE, { message: 'Agente causador: código de 9 dígitos.' }) codAgntCausador?: string;
  @IsOptional() @Matches(NOVE, { message: 'Natureza da lesão: código de 9 dígitos.' }) codLesao?: string;
  @IsOptional() @IsIn([1, 2, 3]) iniciatCAT?: number;
  @IsOptional() @IsIn([1, 3, 4, 5, 6, 9]) tpLocal?: number;
  @IsOptional() @IsString() @MaxLength(100) logradouro?: string;
  @IsOptional() @IsString() @MaxLength(10) numero?: string;
  @IsOptional() @IsString() @MaxLength(90) bairro?: string;
  @IsOptional() @Matches(/^(\d{5}-?\d{3})?$/, { message: 'CEP inválido.' }) cep?: string;
  @IsOptional() @Matches(/^(\d{7})?$/, { message: 'O código IBGE do município tem 7 dígitos.' }) codMunic?: string;
  @IsOptional() @IsIn([...UFS, '']) uf?: string;
  @IsOptional() @IsString() @MaxLength(18) cnpjLocal?: string;
  @IsOptional() @IsDateString() ultDiaTrab?: string;
  @IsOptional() @IsDateString() dtObito?: string;
  @IsOptional() @IsBoolean() internacao?: boolean;
  @IsOptional() @IsIn([1, 2, 3]) medicoConselho?: number;
  @IsOptional() @IsIn([...UFS, '']) medicoUf?: string;
  @IsOptional() @Matches(/^(1\.\d\.\d{19})?$/, { message: 'Recibo no formato 1.1.0000000000000000000.' }) reciboCatOrigem?: string;
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
  @IsOptional() @ValidateNested() @Type(() => EsocialCatDto) esocial?: EsocialCatDto;
}

export class AtualizarCatEsocialDto extends EsocialCatDto {
  @IsOptional() @IsString() @MaxLength(10) horasTrabalhadas?: string;
  @IsOptional() @IsDateString() atendimentoData?: string;
  @IsOptional() @IsString() @MaxLength(120) medicoNome?: string;
  @IsOptional() @IsString() @MaxLength(30) medicoCrm?: string;
  @IsOptional() @IsString() @MaxLength(10) cid?: string;
  @IsOptional() @IsInt() @Min(0) diasTratamento?: number;
}

export class EnvioCatDto {
  @IsString() @Length(1, 60) recibo!: string;
}
