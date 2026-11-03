import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min, ValidateIf } from 'class-validator';
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

  @IsIn(['ENTREGA_INICIAL', 'DESGASTE', 'PERDA', 'DANO'])
  motivo!: string;

  @IsDateString({}, { message: 'Informe a data da entrega.' })
  dataEntrega!: string;
}
