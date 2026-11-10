import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { TIPOS_PT } from './conteudo';

export class EtapaAprDto {
  @IsString()
  @Length(2, 300)
  etapa!: string;

  @IsString()
  @MaxLength(1000)
  riscos!: string;

  @IsString()
  @MaxLength(1000)
  medidas!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  epis?: string;
}

export class CriarAprDto {
  @IsString()
  @Length(2, 200)
  atividade!: string;

  @IsString()
  @Length(2, 200)
  local!: string;

  @IsDateString({}, { message: 'Informe a data da APR.' })
  data!: string;

  @IsString()
  @Length(2, 120)
  responsavel!: string;

  @IsArray()
  @IsString({ each: true })
  equipe!: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua pelo menos uma etapa na APR.' })
  @ValidateNested({ each: true })
  @Type(() => EtapaAprDto)
  etapas!: EtapaAprDto[];
}

export class ItemChecklistDto {
  @IsString()
  @MaxLength(300)
  item!: string;

  @IsBoolean()
  ok!: boolean;
}

// Leitura do detector de gases no espaço confinado (NR-33).
export class MedicaoGasDto {
  @IsDateString({}, { message: 'Informe a hora da medição.' })
  hora!: string;

  @IsNumber({}, { message: 'Informe o oxigênio (%).' }) @Min(0) @Max(100)
  oxigenio!: number;

  @IsNumber({}, { message: 'Informe os inflamáveis (% do LIE).' }) @Min(0) @Max(100)
  lie!: number;

  @IsOptional() @IsNumber() @Min(0) h2s?: number;
  @IsOptional() @IsNumber() @Min(0) co?: number;
  @IsOptional() @IsString() @MaxLength(120) outro?: string;

  @IsString() @Length(2, 120, { message: 'Informe quem fez a medição.' })
  responsavel!: string;
}

export class CriarPermissaoDto {
  @IsIn(Object.keys(TIPOS_PT), { message: 'Tipo de permissão inválido.' })
  tipo!: string;

  @IsOptional()
  @IsString()
  aprId?: string;

  @IsString()
  @Length(2, 200)
  atividade!: string;

  @IsString()
  @Length(2, 200)
  local!: string;

  @IsDateString({}, { message: 'Informe o início da permissão.' })
  inicio!: string;

  @IsDateString({}, { message: 'Informe o fim da permissão.' })
  fim!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua pelo menos um executante.' })
  @IsString({ each: true })
  executantes!: string[];

  @IsString()
  @Length(2, 120)
  emitente!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemChecklistDto)
  checklist!: ItemChecklistDto[];

  // Espaço confinado: a PET precisa do supervisor de entrada e do vigia.
  @ValidateIf((o) => o.tipo === 'ESPACO_CONFINADO' || o.supervisorEntrada)
  @IsString() @Length(2, 120, { message: 'Informe o supervisor de entrada.' })
  supervisorEntrada?: string;

  @ValidateIf((o) => o.tipo === 'ESPACO_CONFINADO' || o.vigia)
  @IsString() @Length(2, 120, { message: 'Informe o vigia.' })
  vigia?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicaoGasDto)
  medicoes?: MedicaoGasDto[];
}

export class CriarDdsDto {
  @IsString()
  @Length(2, 200)
  tema!: string;

  @IsString()
  @MaxLength(5000)
  conteudo!: string;

  @IsDateString({}, { message: 'Informe a data do DDS.' })
  data!: string;

  @IsInt()
  @Min(1)
  @Max(240)
  duracaoMin!: number;

  @IsString()
  @Length(2, 120)
  ministrante!: string;

  @IsArray()
  @IsString({ each: true })
  participantes!: string[];
}
