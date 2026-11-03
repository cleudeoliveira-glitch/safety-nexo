import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

const FOTO = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

export class CadastrarRostoDto {
  // Cada amostra é o descritor de 128 números que o face-api.js calcula no navegador.
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) descritores!: number[][];
  @IsBoolean() consentimento!: boolean;
}

export class CapturaDto {
  @IsArray() @ArrayMinSize(128) @ArrayMaxSize(128) @IsNumber({}, { each: true }) descritor!: number[];
  @Matches(FOTO, { message: 'Foto inválida.' }) @MaxLength(300_000, { message: 'A foto ficou grande demais.' }) foto!: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() precisao?: number;
}

export class EntregaRostoDto extends CapturaDto {
  @IsString() @Length(2, 200) epi!: string;
  @IsString() @Length(1, 20) ca!: string;
  @IsOptional() @IsDateString() validadeCa?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantidade?: number;
  @IsIn(['ENTREGA_INICIAL', 'DESGASTE', 'PERDA', 'DANO']) motivo!: string;
  @IsOptional() @Matches(FOTO, { message: 'Foto do EPI inválida.' }) @MaxLength(300_000) fotoItem?: string;
}

export class IdentificarDto {
  @IsArray() @ArrayMinSize(128) @ArrayMaxSize(128) @IsNumber({}, { each: true }) descritor!: number[];
}
