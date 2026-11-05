import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class ConfiguracaoComercialDto {
  @IsOptional() @IsString() @MaxLength(18) cnpj?: string;
  @IsOptional() @IsString() @MaxLength(60) cidade?: string;
  @IsOptional() @IsString() @MaxLength(77) pixChave?: string;
  @IsOptional() @IsString() @MaxLength(60) pixNome?: string;
}

export class ItemPropostaDto {
  @IsString() @Length(2, 300) descricao!: string;
  @IsInt() @Min(1) quantidade!: number;
  @IsInt() @Min(0) valorCentavos!: number;
}

export class CriarPropostaDto {
  @IsOptional() @IsString() empresaId?: string;
  @IsOptional() @IsString() @Length(2, 200) clienteNome?: string;
  @IsOptional() @IsString() @MaxLength(18) clienteCnpj?: string;
  @IsOptional() @IsString() @MaxLength(200) clienteContato?: string;
  @IsDateString({}, { message: 'Informe a data da proposta.' }) data!: string;
  @IsOptional() @IsInt() @Min(1) @Max(365) validadeDias?: number;
  @IsArray() @ArrayMinSize(1, { message: 'Inclua pelo menos um serviço na proposta.' }) @ValidateNested({ each: true }) @Type(() => ItemPropostaDto) itens!: ItemPropostaDto[];
  @IsOptional() @IsString() @MaxLength(3000) observacoes?: string;
}

export class StatusPropostaDto {
  @IsIn(['ABERTA', 'ACEITA', 'RECUSADA']) status!: string;
}

export class CriarContratoDto {
  @IsString() empresaId!: string;
  @IsOptional() @IsString() propostaId?: string;
  @IsString() @Length(2, 3000) objeto!: string;
  @IsOptional() @IsInt() @Min(1) valorMensalCentavos?: number;
  @IsOptional() @IsInt() @Min(1) @Max(28) diaVencimento?: number;
  @IsDateString({}, { message: 'Informe o início do contrato.' }) inicio!: string;
  @IsOptional() @IsDateString() fim?: string;
  @IsOptional() @IsString() @MaxLength(5000) observacoes?: string;
}

export class CriarServicoDto {
  @IsString() empresaId!: string;
  @IsOptional() @IsString() contratoId?: string;
  @IsString() @Length(2, 500) descricao!: string;
  @IsOptional() @IsDateString() previsto?: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
  @IsOptional() @IsInt() @Min(1) valorCentavos?: number;
}

export class CriarCobrancaDto {
  @IsString() empresaId!: string;
  @IsOptional() @IsString() servicoId?: string;
  @IsString() @Length(2, 200) descricao!: string;
  @IsInt() @Min(1, { message: 'Informe o valor.' }) valorCentavos!: number;
  @IsDateString({}, { message: 'Informe o vencimento.' }) vencimento!: string;
}

export class MensalidadesDto {
  // Mês das mensalidades, no formato AAAA-MM.
  @IsString() @Length(7, 7) mes!: string;
}

export class DataDto {
  @IsOptional() @IsDateString() data?: string;
}

export class LigarReguaDto {
  @IsBoolean() ligada!: boolean;
}

export class EmailCobrancaDto {
  // Vazio apaga o e-mail de cobrança da empresa.
  @IsOptional() @IsEmail({}, { message: 'E-mail inválido.' }) email?: string;
}
