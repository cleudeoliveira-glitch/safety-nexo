'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { entrar } from '@/lib/api';
import { salvarToken, salvarUsuario } from '@/lib/sessao';

export default function Entrar() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    try {
      const acesso = await entrar({ email: String(dados.get('email')), senha: String(dados.get('senha')) });
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
      <form onSubmit={enviar} className="w-full max-w-sm space-y-5 rounded-card border border-border bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Safety Nexo" className="h-12 w-auto" />
        <div>
          <h1 className="text-2xl font-semibold text-primary">Entrar</h1>
          <p className="text-sm text-text/60">Acesse as empresas da sua consultoria.</p>
        </div>
        <Campo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="email" />
        <Campo id="senha" name="senha" type="password" rotulo="Senha" required autoComplete="current-password" />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Entrando…' : 'Entrar'}</Botao>
        <p className="text-center text-sm">
          Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-primary">Crie grátis</Link>
        </p>
      </form>
    </main>
  );
}
