import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CadastroDto, EntrarDto, EsqueciDto, RedefinirDto } from './dto';
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
