import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, Max, Min, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';

export class ItemInspecaoDto {
  @IsString() @Length(2, 300) texto!: string;
  @IsIn(['C', 'NC', 'NA'], { message: 'Responda cada item com Conforme, Não conforme ou Não se aplica.' }) resposta!: string;
  @IsOptional() @IsString() @MaxLength(500) observacao?: string;
  // Gravidade da infração na NR-28 (1 a 4), usada para estimar a multa.
  @IsOptional() @IsInt() @Min(1) @Max(4) grau?: number;
}

export class CriarInspecaoDto {
  @IsString() modelo!: string;
  @IsString() @Length(2, 120) titulo!: string;
  @IsString() @Length(2, 200) local!: string;
  @IsDateString({}, { message: 'Informe a data da inspeção.' }) data!: string;
  @IsString() @Length(2, 120) inspetor!: string;
  @IsArray()
  @ArrayMinSize(1, { message: 'Inclua pelo menos um item no checklist.' })
  @ValidateNested({ each: true })
  @Type(() => ItemInspecaoDto)
  itens!: ItemInspecaoDto[];
}
