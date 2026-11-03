import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class CriarItemDto {
  @IsString() @Length(2, 200) epi!: string;
  @IsString() @Length(1, 20) ca!: string;
  @IsOptional() @IsDateString() validadeCa?: string;
  @IsOptional() @IsString() @MaxLength(20) tamanho?: string;
  @IsInt() @Min(0) @Max(1_000_000) quantidade!: number;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) minimo?: number;
}

export class EditarItemDto {
  @IsOptional() @IsDateString() validadeCa?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) minimo?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class MovimentoDto {
  @IsInt() @Min(0) @Max(1_000_000) quantidade!: number; // entrada: quanto chegou · ajuste: saldo contado
  @IsOptional() @IsString() @MaxLength(300) observacao?: string;
}
