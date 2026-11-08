import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CadastroDto {
  // CONSULTORIA: atende várias empresas. EMPRESA: a própria empresa, com técnico dentro.
  @IsOptional()
  @IsIn(['CONSULTORIA', 'EMPRESA'])
  tipo?: 'CONSULTORIA' | 'EMPRESA';

  // Nome da consultoria, ou a razão social quando é empresa.
  @IsString()
  @Length(2, 200)
  nomeConsultoria!: string;

  @IsOptional()
  @IsString()
  @Length(14, 18, { message: 'Informe o CNPJ completo.' })
  cnpj?: string;

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
