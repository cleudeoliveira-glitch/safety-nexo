import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';

export class ItemInspecaoDto {
  @IsString() @Length(2, 300) texto!: string;
  @IsIn(['C', 'NC', 'NA'], { message: 'Responda cada item com Conforme, Não conforme ou Não se aplica.' }) resposta!: string;
  @IsOptional() @IsString() @MaxLength(500) observacao?: string;
}

export class CriarInspecaoDto {
  @IsString() modelo!: string;
  @IsString() @Length(2, 120) titulo!: string;
  @IsString() @Length(2, 200) local!: string;
  @IsDateString({}, { message: 'Informe a data da inspeção.' }) data!: string;
  @IsString() @Length(2, 120) inspetor!: string;
  @IsOptional() @IsDateString({}, { message: 'Data da próxima inspeção inválida.' }) proximaInspecao?: string;
  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua pelo menos um item no checklist.' })
  @ValidateNested({ each: true })
  @Type(() => ItemInspecaoDto)
  itens!: ItemInspecaoDto[];
}

export class ProximaInspecaoDto {
  @IsOptional() @IsDateString({}, { message: 'Data da próxima inspeção inválida.' }) data?: string | null;
}

export class FotosInspecaoDto {
  @IsOptional() @IsString() @MaxLength(500) legendas?: string; // JSON com uma legenda por foto enviada
}
