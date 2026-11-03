import { IsBoolean, IsNumber, IsOptional, Matches, MaxLength } from 'class-validator';

export class AssinarPresencaDto {
  @Matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, { message: 'Faça o X ou a assinatura no quadro.' }) @MaxLength(400_000, { message: 'A assinatura ficou grande demais.' }) imagem!: string;
  @IsOptional() @Matches(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, { message: 'Foto inválida.' }) @MaxLength(200_000, { message: 'A foto ficou grande demais.' }) foto?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() precisao?: number;
  @IsOptional() @IsBoolean() aRogo?: boolean; // não sabe ler: o instrutor assina como testemunha
}

export class FotoColaboradorDto {
  @Matches(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, { message: 'Foto inválida.' }) @MaxLength(200_000, { message: 'A foto ficou grande demais.' }) imagem!: string;
}
