'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { JaConectado } from '@/components/JaConectado';
import { Aviso, Botao, Campo } from '@/components/ui';
import { entrar } from '@/lib/api';
import { salvarToken, salvarUsuario } from '@/lib/sessao';

type Quem = 'consultoria' | 'empresa';

export default function Entrar() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [quem, setQuem] = useState<Quem>('consultoria');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('tipo') === 'empresa') setQuem('empresa'); }, []);

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
      <form onSubmit={enviar} className="w-full max-w-md space-y-5 rounded-card border border-border bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Safety Nexo" className="h-12 w-auto" />
        <div role="tablist" aria-label="Quem está entrando" className="grid grid-cols-2 gap-2 rounded-card bg-background p-1">
          {([['consultoria', 'Sou Consultoria'], ['empresa', 'Sou Empresa / Cliente']] as [Quem, string][]).map(([v, n]) => (
            <button key={v} type="button" role="tab" aria-selected={quem === v} onClick={() => setQuem(v)}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${quem === v ? 'bg-primary text-white shadow-sm' : 'text-text/70 hover:text-primary'}`}>{n}</button>
          ))}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-primary">Entrar</h1>
          <p className="text-sm text-text/60">
            {quem === 'consultoria'
              ? 'Acesse as empresas que a sua consultoria atende.'
              : 'Acesse os documentos, treinamentos, EPIs e vencimentos da sua empresa.'}
          </p>
        </div>
        <JaConectado />
        <Campo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="email" placeholder="Ex.: voce@empresa.com.br" />
        <div>
          <Campo id="senha" name="senha" type="password" rotulo="Senha" required autoComplete="current-password" placeholder="Sua senha" />
          <p className="mt-2 text-right text-sm">
            <Link href="/esqueci-senha" className="font-semibold text-primary hover:underline">Esqueci minha senha</Link>
          </p>
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Entrando…' : 'Entrar'}</Botao>
        {quem === 'consultoria' ? (
          <p className="text-center text-sm">
            Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-primary">Criar conta de consultoria</Link>
          </p>
        ) : (
          <div className="space-y-1 text-center text-sm">
            <p>
              Sua empresa tem técnico próprio? <Link href="/cadastro?tipo=empresa" className="font-semibold text-primary">Criar conta como Empresa</Link>
            </p>
            <p className="text-text/60">A sua consultoria já atende vocês? Peça a ela o convite de acesso.</p>
          </div>
        )}
        <p className="text-center text-sm">
          <Link href="/planos" className="font-semibold text-primary">Ver os planos e o que tem em cada um</Link>
        </p>
      </form>
    </main>
  );
}
