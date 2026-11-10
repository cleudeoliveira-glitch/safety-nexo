'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { JaConectado } from '@/components/JaConectado';
import { Aviso, Botao, Campo } from '@/components/ui';
import { cadastrar, meuPlano } from '@/lib/api';
import { PLANOS_SITE, reais, textoLimite } from '@/lib/planos';
import { salvarToken, salvarUsuario } from '@/lib/sessao';
import { PLATAFORMA } from '@/lib/plataforma';

export default function Cadastro() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Plano escolhido na página /planos (?plano=...). A conta começa no Free e o pedido vai para a equipe.
  const [escolhido, setEscolhido] = useState<(typeof PLANOS_SITE)[number] | null>(null);
  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get('plano');
    const p = PLANOS_SITE.find((x) => x.codigo === codigo && x.precoMensal > 0);
    if (p) setEscolhido(p);
  }, []);

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
        aceiteTermos: dados.get('aceite') === 'on',
        versaoTermos: PLATAFORMA.versaoTermos,
      });
      salvarToken(acesso.token);
      salvarUsuario(acesso.usuario);
      if (escolhido) await meuPlano.pedir(escolhido.codigo).catch(() => undefined);
      window.location.href = '/empresas/nova';
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
          <h1 className="text-2xl font-semibold text-primary">Crie sua conta grátis</h1>
          <p className="text-sm text-text/60">São 14 dias com tudo liberado, sem cartão e sem precisar de CNPJ.</p>
        </div>
        <JaConectado />
        {escolhido ? (
          <p className="rounded-card border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            Você escolheu o plano <strong>{escolhido.nome}</strong> ({reais(escolhido.precoMensal)} por mês, {textoLimite(escolhido.limiteEmpresas).toLowerCase()}).
            Sua conta já começa a funcionar no Free e a equipe do Safety Nexo fala com você para ativar o {escolhido.nome}.
          </p>
        ) : null}
        <p className="text-sm">
          <Link href="/planos" className="font-semibold text-primary">Ver os planos e o que tem em cada um</Link>
        </p>
        <Campo id="nomeConsultoria" name="nomeConsultoria" rotulo="Nome que vai aparecer nos documentos" required icone="predio"
          placeholder="Ex.: Maria Souza Segurança do Trabalho" dica="Pode ser o seu nome, da sua consultoria ou da sua empresa. Dá para trocar depois." />
        <Campo id="nome" name="nome" rotulo="Seu nome" required autoComplete="name" placeholder="Ex.: Maria Souza" icone="cracha" />
        <Campo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="email" placeholder="Ex.: voce@empresa.com.br" />
        <Campo id="senha" name="senha" type="password" rotulo="Senha" required minLength={8} autoComplete="new-password" dica="Pelo menos 8 caracteres." />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="aceite" required className="mt-1" />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-primary">termos de uso</Link> e a{' '}
            <Link href="/privacidade" target="_blank" className="font-semibold text-primary">política de privacidade</Link>.
          </span>
        </label>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Criando conta…' : 'Criar conta'}</Botao>
        <p className="text-center text-sm">
          Já tem conta? <Link href="/entrar" className="font-semibold text-primary">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
