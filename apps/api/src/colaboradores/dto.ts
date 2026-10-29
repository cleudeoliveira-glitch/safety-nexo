import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
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
  @IsString()
  observacoes?: string;
}

export class CreateEntregaEpiDto {
  @IsString()
  @Length(2, 200)
  epi!: string;

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
