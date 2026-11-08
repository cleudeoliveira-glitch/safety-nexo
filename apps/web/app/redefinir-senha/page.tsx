'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { redefinirSenha } from '@/lib/api';
import { salvarToken, salvarUsuario } from '@/lib/sessao';

// Tela aberta pelo link do e-mail, do convite ou do WhatsApp: cria a senha e já entra.
export default function RedefinirSenha() {
  const [token, setToken] = useState<string | null>(null);
  const [convite, setConvite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setToken(q.get('token'));
    setConvite(q.get('convite') === '1');
  }, []);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const senha = String(d.get('senha'));
    if (senha !== String(d.get('repetir'))) { setErro('As duas senhas não estão iguais.'); return; }
    setErro(null);
    setEnviando(true);
    try {
      const acesso = await redefinirSenha(token!, senha);
      salvarToken(acesso.token);
      salvarUsuario(acesso.usuario);
      window.location.href = '/';
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={enviar} className="w-full max-w-md space-y-5 rounded-card border border-border bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Safety Nexo" className="h-12 w-auto" />
        <div>
          <h1 className="text-2xl font-semibold text-primary">{convite ? 'Criar a sua senha' : 'Criar senha nova'}</h1>
          <p className="text-sm text-text/60">{convite ? 'Bem-vindo ao Safety Nexo. Escolha a senha que você vai usar para entrar.' : 'Escolha a senha nova. Depois você já entra no sistema.'}</p>
        </div>
        {token === null ? (
          <Aviso tipo="erro">Link incompleto. Abra de novo o link que você recebeu ou peça outro em "Esqueci minha senha".</Aviso>
        ) : (
          <>
            <Campo id="senha" name="senha" type="password" rotulo="Senha" required minLength={8} autoComplete="new-password" dica="Pelo menos 8 caracteres." placeholder="Sua senha nova" />
            <Campo id="repetir" name="repetir" type="password" rotulo="Repita a senha" required minLength={8} autoComplete="new-password" placeholder="Digite de novo" />
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Salvando…' : 'Salvar e entrar'}</Botao>
          </>
        )}
        <p className="text-center text-sm"><Link href="/esqueci-senha" className="font-semibold text-primary">Pedir um link novo</Link></p>
      </form>
    </main>
  );
}
