import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

const segredo = process.env.JWT_SECRET;
if (!segredo || segredo.length < 32) {
  throw new Error('Defina JWT_SECRET com pelo menos 32 caracteres antes de iniciar a API.');
}

@Module({
  imports: [JwtModule.register({ secret: segredo, signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
