'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { esqueciSenha } from '@/lib/api';

// "Esqueci minha senha": manda um link por e-mail para criar uma senha nova.
export default function EsqueciSenha() {
  const [enviado, setEnviado] = useState<null | { emailLigado: boolean }>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      setEnviado(await esqueciSenha(String(new FormData(evento.currentTarget).get('email'))));
    } catch (e) {
      setErro((e as Error).message);
    }
    setEnviando(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={enviar} className="w-full max-w-md space-y-5 rounded-card border border-border bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Safety Nexo" className="h-12 w-auto" />
        <div>
          <h1 className="text-2xl font-semibold text-primary">Esqueci minha senha</h1>
          <p className="text-sm text-text/60">Digite o e-mail que você usa para entrar. Mandamos um link para você criar uma senha nova.</p>
        </div>
        {enviado ? (
          enviado.emailLigado ? (
            <Aviso tipo="ok">Pronto. Se este e-mail tiver conta, o link chega em alguns minutos. Olhe também a caixa de spam. O link vale por 1 hora.</Aviso>
          ) : (
            <Aviso tipo="info">O envio de e-mail ainda não está ligado. Fale com a sua consultoria ou com o suporte do Safety Nexo: eles mandam o link pelo WhatsApp.</Aviso>
          )
        ) : (
          <>
            <Campo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="email" placeholder="Ex.: voce@empresa.com.br" />
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Enviando…' : 'Mandar o link'}</Botao>
          </>
        )}
        <p className="text-center text-sm"><Link href="/entrar" className="font-semibold text-primary">Voltar para entrar</Link></p>
      </form>
    </main>
  );
}
