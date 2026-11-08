import { IsEmail, IsString, Length } from 'class-validator';

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
}

export class EntrarDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
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
