import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

export class ConfigEmergenciaDto {
  @IsString() @Length(2, 6) divisao!: string;
  @IsIn(['BAIXO', 'MEDIO', 'ALTO'], { message: 'Escolha o risco de incêndio.' }) risco!: string;
  @IsArray() @ArrayMaxSize(200) @IsInt({ each: true }) @Min(0, { each: true }) populacaoPorPavimento!: number[];
  @IsOptional() @IsString() @MaxLength(300) pontoEncontro?: string;
  @IsOptional() @IsString() @MaxLength(1000) rotasFuga?: string;
  @IsOptional() @IsString() @MaxLength(500) contatos?: string;
  @IsOptional() @IsString() @MaxLength(200) coordenador?: string;
}

export class ControleDto {
  @IsIn(['AVCB', 'CLCB', 'EXTINTOR', 'HIDRANTE', 'ILUMINACAO', 'ALARME', 'SPDA', 'OUTRO']) tipo!: string;
  @IsString() @Length(2, 200) descricao!: string;
  @IsOptional() @IsString() @MaxLength(200) local?: string;
  @IsOptional() @IsString() @MaxLength(60) numero?: string;
  @IsOptional() @IsDateString() validade?: string;
}
