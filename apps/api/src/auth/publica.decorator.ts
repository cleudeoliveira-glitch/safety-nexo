import { SetMetadata } from '@nestjs/common';

export const ROTA_PUBLICA = 'rotaPublica';

// Marca uma rota (ou controller) que não exige login.
export const Publica = () => SetMetadata(ROTA_PUBLICA, true);
