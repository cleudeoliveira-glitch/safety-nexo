import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CadastroDto, CodigoDto, EntrarDto, EsqueciDto, RedefinirDto } from './dto';
import { Publica } from './publica.decorator';

@Publica()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('cadastro')
  cadastrar(@Body() dto: CadastroDto) {
    return this.auth.cadastrar(dto);
  }

  @Post('entrar')
  @HttpCode(200)
  entrar(@Body() dto: EntrarDto) {
    return this.auth.entrar(dto);
  }

  // Segunda etapa da entrada: o código de 6 números que chegou por e-mail.
  @Post('entrar/codigo')
  @HttpCode(200)
  entrarComCodigo(@Body() dto: CodigoDto) {
    return this.auth.entrarComCodigo(dto.desafio, dto.codigo);
  }

  @Post('esqueci')
  @HttpCode(200)
  esqueci(@Body() dto: EsqueciDto) {
    return this.auth.esqueci(dto.email);
  }

  @Post('redefinir')
  @HttpCode(200)
  redefinir(@Body() dto: RedefinirDto) {
    return this.auth.redefinir(dto);
  }
}
