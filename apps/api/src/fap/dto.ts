import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class FapRatDto {
  @IsInt() @Min(2010) @Max(2100) ano!: number;
  @IsIn([1, 2, 3], { message: 'O RAT é 1, 2 ou 3%.' }) rat!: number;
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'O FAP tem até 4 casas decimais.' }) @Min(0.5, { message: 'O FAP vai de 0,5000 a 2,0000.' }) @Max(2, { message: 'O FAP vai de 0,5000 a 2,0000.' }) fap!: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1e11) folhaMensal?: number;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string;
}
