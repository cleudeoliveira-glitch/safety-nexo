'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { JaConectado } from '@/components/JaConectado';
import { Aviso, Botao, Campo } from '@/components/ui';
import { cadastrar } from '@/lib/api';
import { PLANOS_SITE, reais, textoLimite } from '@/lib/planos';
import { salvarToken, salvarUsuario } from '@/lib/sessao';
import { PLATAFORMA } from '@/lib/plataforma';
import { NomePasso, PassosCompra, TopoSite } from '@/components/PassosCompra';

export default function Cadastro() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Etapa 2 do caminho de compra. O plano vem da página inicial ou de /planos (?plano=...).
  // Sem plano no endereço, a pessoa escolhe aqui mesmo (etapa 1).
  const [escolhido, setEscolhido] = useState<(typeof PLANOS_SITE)[number] | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get('plano');
    setEscolhido(PLANOS_SITE.find((x) => x.codigo === codigo) ?? null);
    setPronto(true);
  }, []);
  function escolher(p: (typeof PLANOS_SITE)[number] | null) {
    setEscolhido(p);
    window.history.replaceState(null, '', p ? `/cadastro?plano=${p.codigo}` : '/cadastro');
    window.scrollTo({ top: 0 });
  }
  const pago = !!escolhido && escolhido.precoMensal > 0;

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
      // Plano pago: segue para o pagamento. Grátis: já entra no sistema.
      window.location.href = pago ? `/cadastro/pagamento?plano=${escolhido!.codigo}` : '/empresas/nova';
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  if (!pronto) return null;

  if (!escolhido) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <TopoSite direita={<Link href="/entrar" className="text-sm font-semibold text-text/70 hover:text-primary">Já tenho conta</Link>} />
        <div>
          <PassosCompra atual={1} />
          <NomePasso atual={1} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-primary">Escolha o seu plano</h1>
          <p className="text-sm text-text/60">Dá para trocar depois, para cima ou para baixo, quando quiser. <Link href="/planos" className="font-semibold text-primary">Comparar os planos</Link></p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PLANOS_SITE.map((p) => (
            <button key={p.codigo} type="button" onClick={() => escolher(p)}
              className={`flex flex-col rounded-card border bg-white p-5 text-left transition hover:border-primary ${p.destaque ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
              {p.destaque && <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Recomendado</span>}
              <span className="font-semibold">{p.nome}</span>
              <span className="mt-1 text-2xl font-semibold text-primary">{p.precoMensal ? reais(p.precoMensal) : 'R$ 0'}<span className="text-sm font-normal text-text/60">/mês</span></span>
              <span className="mt-1 text-sm font-semibold text-text/80">{textoLimite(p.limiteEmpresas)}</span>
              <span className="mt-2 flex-1 text-sm text-text/65">{p.paraQuem}</span>
              <span className={`mt-4 block rounded-card px-4 py-2.5 text-center text-sm font-semibold ${p.destaque ? 'bg-primary text-white' : 'border border-border'}`}>Escolher</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <TopoSite direita={<Link href="/entrar" className="text-sm font-semibold text-text/70 hover:text-primary">Já tenho conta</Link>} />
      <div>
        <PassosCompra atual={2} gratis={!pago} />
        <NomePasso atual={2} />
      </div>
      <form onSubmit={enviar} className="mx-auto max-w-md space-y-5 rounded-card border border-border bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Crie a sua conta</h1>
          <p className="text-sm text-text/60">{pago ? 'Depois daqui você escolhe como pagar: cartão, Pix ou boleto.' : 'São 14 dias com todos os recursos liberados para 1 empresa, sem cartão e sem precisar de CNPJ.'}</p>
        </div>
        <JaConectado />
        <div className="flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span>
            Plano <strong>{escolhido.nome}</strong>: {escolhido.precoMensal ? `${reais(escolhido.precoMensal)} por mês` : 'grátis'}, {textoLimite(escolhido.limiteEmpresas).toLowerCase()}.
          </span>
          <button type="button" onClick={() => escolher(null)} className="shrink-0 font-semibold text-primary hover:underline">Trocar</button>
        </div>
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
        <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Criando conta…' : pago ? 'Continuar para o pagamento' : 'Criar conta e começar'}</Botao>
      </form>
    </main>
  );
}
