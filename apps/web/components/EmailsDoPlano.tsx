'use client';

import { useState } from 'react';
import { Aviso, Botao } from '@/components/ui';
import { admin } from '@/lib/api';

// Cartão do Painel ADM: mostra quando o cliente recebe e-mail sobre o teste e o plano, e manda os exemplos para o ADM conferir.
export function EmailsDoPlano() {
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function mandar() {
    setOcupado(true);
    setMsg(null);
    try {
      const r = await admin.exemplosEmailsPlano();
      setMsg({ tipo: 'ok', texto: `Pronto! Mandei ${r.enviados} e-mails de exemplo para ${r.para}. Olhe também a caixa de spam.` });
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-primary">E-mails automáticos para os clientes</h2>
      <p className="mt-1 text-sm text-text/70">O sistema manda sozinho, uma vez para cada cliente:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text/80">
        <li><strong>3 dias antes</strong> de acabar o teste de 14 dias, lembrando dos planos.</li>
        <li><strong>No dia em que o teste acaba</strong>, explicando que a conta passou para o Grátis e nada foi apagado.</li>
        <li><strong>Quando o pagamento cai</strong> (ou quando você libera um plano aqui no painel), confirmando que o plano está liberado.</li>
        <li>Nos meses seguintes, um e-mail curto a cada pagamento recebido.</li>
      </ul>
      <p className="mt-2 text-sm text-text/70">Os e-mails do teste saem todo dia às 9h. A cada um, chega um aviso no seu celular (pode desligar em &quot;Escolher o que chega no celular&quot;).</p>
      <div className="mt-3">
        <Botao onClick={mandar} disabled={ocupado}>{ocupado ? 'Mandando…' : 'Mandar os exemplos para o meu e-mail'}</Botao>
      </div>
      {msg && <div className="mt-3"><Aviso tipo={msg.tipo}>{msg.texto}</Aviso></div>}
    </section>
  );
}
