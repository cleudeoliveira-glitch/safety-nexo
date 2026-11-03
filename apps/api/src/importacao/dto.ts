import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';

export class RiscoImportadoDto {
  @IsIn(['FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'ACIDENTE']) tipo!: string;
  @IsString() @Length(2, 200, { message: 'Todo risco precisa do nome do agente.' }) agente!: string;
  @IsString() @Length(2, 300, { message: 'Informe a fonte geradora de cada risco.' }) fonteGeradora!: string;
  @IsOptional() @IsString() @MaxLength(3000) medidasControle?: string;
  @IsIn(['BAIXA', 'MEDIA', 'ALTA']) severidade!: string;
  @IsOptional() @IsString() @MaxLength(60) intensidade?: string;
  @IsOptional() @IsString() @MaxLength(60) limiteTolerancia?: string;
}

export class GheImportadoDto {
  @IsString() @Length(2, 200, { message: 'Todo GHE precisa de nome.' }) nome!: string;
  @IsOptional() @IsString() @MaxLength(2000) descricao?: string;
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => RiscoImportadoDto) riscos!: RiscoImportadoDto[];
}

export class ImportarDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => GheImportadoDto) ghes!: GheImportadoDto[];
}
