import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, ValidateNested } from 'class-validator';

export class SignatarioDto {
  @IsString() @Length(2, 200, { message: 'Informe o nome de quem assina.' }) nome!: string;
  @IsOptional() @IsString() @MaxLength(14) cpf?: string;
  @IsString() @Length(2, 120, { message: 'Diga em que qualidade a pessoa assina (ex.: Responsável legal).' }) papel!: string;
}

export class CriarPedidoDto {
  @IsString() arquivoId!: string;
  @IsArray() @ArrayMinSize(1, { message: 'Inclua pelo menos uma pessoa para assinar.' }) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => SignatarioDto) signatarios!: SignatarioDto[];
  @IsOptional() @IsBoolean() icp?: boolean;
}

export class AssinarDto {
  @Matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, { message: 'Desenhe a assinatura.' }) @MaxLength(400_000, { message: 'A imagem da assinatura ficou grande demais.' }) imagem!: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() precisao?: number;
  @IsOptional() @IsString() @MaxLength(11) cpf?: string; // confirmação de quem assina pelo link
}
