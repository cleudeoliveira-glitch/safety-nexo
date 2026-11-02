import { SetMetadata } from '@nestjs/common';

// Rotas que o login da empresa cliente pode usar. Sem esta marca, só a consultoria acessa.
export const PERMITE_EMPRESA = 'permiteEmpresa';
export const PermiteEmpresa = () => SetMetadata(PERMITE_EMPRESA, true);
