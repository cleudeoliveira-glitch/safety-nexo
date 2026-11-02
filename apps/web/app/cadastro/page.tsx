'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { cadastrar } from '@/lib/api';
import { salvarToken, salvarUsuario } from '@/lib/sessao';

export default function Cadastro() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    try {
      const acesso = await cadastrar({
        nomeConsultoria: String(dados.get('nomeConsultoria')),
        nome: String(dados.get('nome')),
        email: String(dados.get('email')),
        senha: String(dados.get('senha')),
      });
      salvarToken(acesso.token);
      salvarUsuario(acesso.usuario);
      window.location.href = '/empresas/nova';
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
          <h1 className="text-2xl font-semibold text-primary">Crie sua conta grátis</h1>
          <p className="text-sm text-text/60">Plano Free: 1 empresa para começar, sem cartão.</p>
        </div>
        <Campo id="nomeConsultoria" name="nomeConsultoria" rotulo="Nome da sua consultoria" required placeholder="Ex.: Cleude Consultoria SST" />
        <Campo id="nome" name="nome" rotulo="Seu nome" required autoComplete="name" />
        <Campo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="email" />
        <Campo id="senha" name="senha" type="password" rotulo="Senha" required minLength={8} autoComplete="new-password" dica="Pelo menos 8 caracteres." />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Criando conta…' : 'Criar conta'}</Botao>
        <p className="text-center text-sm">
          Já tem conta? <Link href="/entrar" className="font-semibold text-primary">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
