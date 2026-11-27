import { SetMetadata } from '@nestjs/common';

// Rotas que só o dono da conta da consultoria usa: plano, pagamento, equipe, excluir empresa e apagar de vez da Lixeira.
// O técnico da equipe faz todo o trabalho de SST, mas não mexe nisso.
export const SO_DONO = 'soDonoDaConta';
export const SoDono = () => SetMetadata(SO_DONO, true);
export const MENSAGEM_SO_DONO = 'Só o dono da conta pode fazer isso. Fale com o dono, que também pode mudar você para dono em Meu perfil, na parte Minha equipe.';
