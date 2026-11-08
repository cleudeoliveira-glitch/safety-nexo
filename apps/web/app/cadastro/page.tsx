'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { JaConectado } from '@/components/JaConectado';
import { Aviso, Botao, Campo } from '@/components/ui';
import { cadastrar, meuPlano } from '@/lib/api';
import { PLANOS_SITE, reais, textoLimite } from '@/lib/planos';
import { salvarToken, salvarUsuario } from '@/lib/sessao';

export default function Cadastro() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Plano escolhido na página /planos (?plano=...). A conta começa no Free e o pedido vai para a equipe.
  const [escolhido, setEscolhido] = useState<(typeof PLANOS_SITE)[number] | null>(null);
  // Consultoria (atende várias empresas) ou Empresa (técnico dentro da empresa). Link com ?tipo=empresa já abre como Empresa.
  const [tipo, setTipo] = useState<'CONSULTORIA' | 'EMPRESA'>('CONSULTORIA');
  const empresa = tipo === 'EMPRESA';
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tipo') === 'empresa') setTipo('EMPRESA');
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
        tipo,
        nomeConsultoria: String(dados.get('nomeConsultoria')),
        cnpj: empresa ? String(dados.get('cnpj')) : undefined,
        nome: String(dados.get('nome')),
        email: String(dados.get('email')),
        senha: String(dados.get('senha')),
      });
      salvarToken(acesso.token);
      salvarUsuario(acesso.usuario);
      if (escolhido) await meuPlano.pedir(escolhido.codigo).catch(() => undefined);
      // A empresa já foi criada no cadastro: vai direto ao painel dela.
      window.location.href = empresa ? '/' : '/empresas/nova';
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={enviar} className="w-full max-w-md space-y-5 rounded-card border border-border bg-white p-8 shadow-sm">
        <img src="/logo.png" alt="Safety Nexo" className="h-12 w-auto" />
        <div role="tablist" aria-label="Tipo de conta" className="grid grid-cols-2 gap-2 rounded-card bg-background p-1">
          {([['CONSULTORIA', 'Sou Consultoria'], ['EMPRESA', 'Sou Empresa']] as const).map(([v, n]) => (
            <button key={v} type="button" role="tab" aria-selected={tipo === v} onClick={() => setTipo(v)}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${tipo === v ? 'bg-primary text-white shadow-sm' : 'text-text/70 hover:text-primary'}`}>{n}</button>
          ))}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-primary">{empresa ? 'Criar conta como Empresa' : 'Crie sua conta grátis'}</h1>
          <p className="text-sm text-text/60">
            {empresa
              ? 'Para a empresa que tem técnico de segurança dentro. Você vê e cuida só da sua empresa.'
              : 'Para a consultoria que atende várias empresas.'}{' '}
            São 14 dias com tudo liberado, sem cartão.
          </p>
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
        {empresa ? (
          <>
            <Campo id="nomeConsultoria" name="nomeConsultoria" rotulo="Nome da empresa (razão social)" required placeholder="Ex.: Construtora Silva Ltda" icone="predio" />
            <Campo id="cnpj" name="cnpj" rotulo="CNPJ" required minLength={14} maxLength={18} placeholder="00.000.000/0000-00" icone="numero" inputMode="numeric" />
          </>
        ) : (
          <Campo id="nomeConsultoria" name="nomeConsultoria" rotulo="Nome da sua consultoria" required placeholder="Ex.: Cleude Consultoria SST" icone="predio" />
        )}
        <Campo id="nome" name="nome" rotulo="Seu nome" required autoComplete="name" placeholder="Ex.: Maria Souza" icone="cracha" />
        <Campo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="email" placeholder="Ex.: voce@empresa.com.br" />
        <Campo id="senha" name="senha" type="password" rotulo="Senha" required minLength={8} autoComplete="new-password" dica="Pelo menos 8 caracteres." />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Criando conta…' : 'Criar conta'}</Botao>
        <p className="text-center text-sm">
          Já tem conta? <Link href={empresa ? '/entrar?tipo=empresa' : '/entrar'} className="font-semibold text-primary">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
