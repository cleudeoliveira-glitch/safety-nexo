import { Equals, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CadastroDto {
  // Nome que sai nos documentos: da pessoa, da consultoria ou da empresa (não exige CNPJ).
  @IsString()
  @Length(2, 200)
  nomeConsultoria!: string;


  @IsString()
  @Length(2, 200)
  nome!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @Length(8, 100, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  senha!: string;

  // Aceite dos termos de uso e da política de privacidade (LGPD): guardado com a data e a versão.
  @Equals(true, { message: 'Para criar a conta, marque que leu e aceita os termos de uso e a política de privacidade.' })
  aceiteTermos!: boolean;

  @IsOptional() @IsString() @Length(1, 20)
  versaoTermos?: string;
}

export class EntrarDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @Length(1, 100, { message: 'Digite a sua senha.' })
  senha!: string;
}

export class EsqueciDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;
}

export class RedefinirDto {
  @IsString()
  token!: string;

  @IsString()
  @Length(8, 100, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  senha!: string;
}
