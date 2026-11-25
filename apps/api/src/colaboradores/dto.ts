import { EhCpf } from '../common/documentos-br';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Max, Min, ValidateIf } from 'class-validator';
import { CATEGORIAS_CNH } from '../empresas/dto';
import { TIPOS_ASO } from './regras';

export class CreateAsoDto {
  @IsIn(TIPOS_ASO as unknown as string[])
  tipo!: string;

  @IsDateString({}, { message: 'Informe a data do exame.' })
  dataExame!: string;

  @IsIn(['APTO', 'INAPTO'])
  resultado!: string;

  @IsString()
  @Length(2, 200)
  medicoExaminadorNome!: string;

  @IsString()
  @Length(4, 20)
  medicoExaminadorCrm!: string;

  @IsOptional()
  @IsIn(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'], { message: 'UF do CRM inválida.' })
  medicoExaminadorUf?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CreateEntregaEpiDto {
  // Com item do almoxarifado, EPI e CA vêm do item.
  @IsOptional()
  @IsString()
  estoqueId?: string;

  @ValidateIf((o) => !o.estoqueId)
  @IsString()
  @Length(2, 200)
  epi!: string;

  @ValidateIf((o) => !o.estoqueId)
  @IsString()
  @Length(1, 20)
  ca!: string;

  @IsOptional()
  @IsDateString()
  validadeCa?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantidade?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fabricante?: string;

  // Dias de uso até a troca. Vazio: usa o prazo do item do almoxarifado ou a referência pelo tipo de EPI.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  vidaUtilDias?: number;

  @IsIn(['ENTREGA_INICIAL', 'DESGASTE', 'PERDA', 'DANO'])
  motivo!: string;

  @IsDateString({}, { message: 'Informe a data da entrega.' })
  dataEntrega!: string;
}

export const MOTIVOS_DEVOLUCAO = ['TROCA', 'DANIFICADO', 'SAIDA_EMPRESA', 'OUTRO'] as const;

export class DevolucaoEpiDto {
  @IsDateString({}, { message: 'Informe a data da devolução.' })
  data!: string;

  @IsIn(MOTIVOS_DEVOLUCAO as unknown as string[], { message: 'Escolha o motivo da devolução.' })
  motivo!: string;

  // Voltou em bom estado e pode ser entregue de novo: soma no saldo do almoxarifado.
  @IsOptional()
  @IsBoolean()
  voltaAoEstoque?: boolean;
}

// Edição dos dados do colaborador pela ficha. Campo vazio apaga o valor (menos nome e cargo).
export class EditarColaboradorDto {
  @IsOptional() @IsString() @Length(2, 200, { message: 'Escreva o nome completo.' }) nome?: string;
  @IsOptional() @IsString() @Length(2, 120, { message: 'Escreva o cargo.' }) cargo?: string;
  @IsOptional() @EhCpf() cpf?: string;
  @IsOptional() @Matches(/^(\d{4}-?\d{2})?$/, { message: 'O CBO tem 6 números (ex.: 7823-05).' }) cbo?: string;
  @IsOptional() @IsString() @MaxLength(30) matricula?: string;
  @IsOptional() @Matches(/^(\d{4}-\d{2}-\d{2}.*)?$/, { message: 'Data de admissão inválida.' }) dataAdmissao?: string;
  @IsOptional() @IsString() gheId?: string;
  @IsOptional() @IsIn(['', ...CATEGORIAS_CNH], { message: 'Categoria da CNH inválida (A, B, C, D, E, AB, AC, AD ou AE).' }) cnhCategoria?: string;
  @IsOptional() @Matches(/^(\d{4}-\d{2}-\d{2}.*)?$/, { message: 'Validade da CNH inválida.' }) cnhValidade?: string;
}

export class DesligamentoDto {
  // Vazio desfaz a saída (por exemplo, se foi marcada por engano).
  @IsOptional()
  @IsDateString({}, { message: 'Data de saída inválida.' })
  data?: string | null;
}
