'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { pedirLocalizacao, QuadroAssinatura } from '@/components/QuadroAssinatura';
import { Botao } from '@/components/ui';
import { LinkAssinatura, linkAssinatura } from '@/lib/api';

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

// Página pública: quem recebeu o link lê o documento e assina com o dedo. Não precisa de login.
export default function AssinarPage({ params }: { params: { token: string } }) {
  const [dados, setDados] = useState<LinkAssinatura | null>(null);
  const [erro, setErro] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [cpf, setCpf] = useState('');
  const [leu, setLeu] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  useEffect(() => { linkAssinatura.dados(params.token).then(setDados).catch((e: Error) => setErro(e.message)); }, [params.token]);

  async function assinar() {
    setEnviando(true); setErro('');
    const local = await pedirLocalizacao();
    try {
      await linkAssinatura.assinar(params.token, { imagem: imagem!, cpf: cpf.replace(/\D/g, '') || undefined, ...(local ?? {}) });
      setFeito(true);
    } catch (e) { setErro((e as Error).message); } finally { setEnviando(false); }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-4 sm:p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-6 h-10 w-auto self-start" />
      <section className="rounded-card border border-border bg-white p-6 shadow-sm">
        {!dados && !erro && <p>Carregando…</p>}
        {!dados && erro && <p className="text-danger">{erro}</p>}
        {dados && (<>
          <h1 className="text-xl font-semibold text-primary">Assinatura de documento</h1>
          <p className="mt-1 text-sm text-text/70">{dados.consultoria} pediu sua assinatura no documento da empresa {dados.empresa}.</p>
          <dl className="mt-4 space-y-1 text-sm">
            <div><dt className="inline font-semibold">Documento: </dt><dd className="inline">{dados.titulo}</dd></div>
            <div><dt className="inline font-semibold">Quem assina: </dt><dd className="inline">{dados.nome} · {dados.papel}</dd></div>
          </dl>
          {dados.status === 'CANCELADO' ? <p className="mt-4 rounded-card border border-danger px-4 py-3 text-sm text-danger">Este pedido foi cancelado. Não é preciso assinar.</p>
            : dados.assinadoEm || feito ? (
              <p className="mt-4 rounded-card bg-success px-4 py-3 text-center font-semibold text-white">
                Assinatura registrada{dados.assinadoEm ? ` em ${dataHora(dados.assinadoEm)}` : ''}. Obrigado! Você pode fechar esta página.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <a href={linkAssinatura.urlDocumento(params.token)} target="_blank" rel="noreferrer" onClick={() => setLeu(true)}
                  className="block rounded-card border border-primary px-4 py-3 text-center font-semibold text-primary">1. Abrir e ler o documento</a>
                {dados.pedeCpf && (
                  <div>
                    <label htmlFor="cpf" className="mb-1.5 block text-sm font-semibold">2. Seu CPF, para conferir que é você</label>
                    <input id="cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full rounded-card border border-border bg-background px-3 py-2" />
                  </div>
                )}
                <QuadroAssinatura onPronto={setImagem} rotulo={`${dados.pedeCpf ? '3' : '2'}. Assine com o dedo ou o mouse`} />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={leu} onChange={(e) => setLeu(e.target.checked)} className="mt-1" />
                  <span>Li o documento e concordo em assiná-lo eletronicamente. Serão registrados data, hora, endereço de internet e, se eu permitir, o local.</span>
                </label>
                {erro && <p className="text-sm text-danger">{erro}</p>}
                <Botao className="w-full" disabled={!imagem || !leu || enviando || (dados.pedeCpf && cpf.replace(/\D/g, '').length !== 11)} onClick={assinar}>
                  {enviando ? 'Registrando…' : 'Assinar'}
                </Botao>
              </div>
            )}
          <p className="mt-5 text-xs text-text/50">Código de conferência: {dados.codigo}</p>
        </>)}
      </section>
    </main>
  );
}
