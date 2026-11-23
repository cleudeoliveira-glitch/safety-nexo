import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

// Tira espaços, quebras de linha e aspas que costumam vir junto quando o segredo é
// copiado e colado no GitHub ou no Render. Sem isso, um espaço a mais já dá "401".
export function limparSegredo(v: string | undefined): string {
  return (v ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
}

// Confere o segredo enviado (tarefas agendadas, aviso do Asaas) com o do servidor.
// Compara pelo resumo (sha256) para o tempo ser sempre o mesmo, seja qual for o tamanho.
export function conferirSegredo(recebido: string | undefined, certo: string | undefined, falta: string, recusa = 'Segredo incorreto.') {
  const b = limparSegredo(certo);
  if (!b) throw new ServiceUnavailableException(falta);
  const a = limparSegredo(recebido);
  if (!a) throw new UnauthorizedException(`${recusa} Nenhum segredo foi enviado.`);
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  if (!timingSafeEqual(ha, hb)) throw new UnauthorizedException(recusa);
}
