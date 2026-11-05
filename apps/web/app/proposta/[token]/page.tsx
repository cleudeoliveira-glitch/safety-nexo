'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Botao } from '@/components/ui';
import { propostaOnline, PropostaPublica, reais } from '@/lib/api';

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const campo = 'mt-1 w-full rounded-card border border-border bg-background px-3 py-2';

// Página aberta (sem login) em que o cliente vê a proposta e aceita ou recusa com um toque.
export default function PropostaPage({ params }: { params: { token: string } }) {
  const [p, setP] = useState<PropostaPublica | null>(null);
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState<'ver' | 'aceitar' | 'recusar'>('ver');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<'ACEITA' | 'RECUSADA' | null>(null);

  useEffect(() => { propostaOnline.ver(params.token).then(setP).catch((e: Error) => setErro(e.message)); }, [params.token]);

  async function responder() {
    setEnviando(true); setErro('');
    try {
      if (modo === 'aceitar') { await propostaOnline.aceitar(params.token, { nome, cargo: cargo || undefined }); setFeito('ACEITA'); }
      else { await propostaOnline.recusar(params.token, { nome, motivo: motivo || undefined }); setFeito('RECUSADA'); }
    } catch (e) { setErro((e as Error).message); } finally { setEnviando(false); }
  }

  const respondida = feito ?? (p && p.status !== 'ABERTA' ? p.status : null);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-5 h-10 w-auto" />
      <section className="rounded-card border border-border bg-white p-5 shadow-sm">
        {!p && !erro && <p>Carregando…</p>}
        {!p && erro && <p className="text-danger">{erro}</p>}
        {p && (<>
          <p className="text-sm text-text/60">{p.consultoria.nome}{p.consultoria.cnpj ? ` · CNPJ ${p.consultoria.cnpj}` : ''}</p>
          <h1 className="mt-1 text-2xl font-semibold text-primary">Proposta nº {p.numero}</h1>
          <p className="mt-1 text-sm text-text/70">Para <strong>{p.cliente.nome}</strong>{p.cliente.contato ? ` · A/C ${p.cliente.contato}` : ''} · {data(p.data)}</p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-text/60"><th className="py-2">Serviço</th><th className="py-2 text-right">Qtd.</th><th className="py-2 text-right">Valor</th></tr></thead>
              <tbody>
                {p.itens.map((i, n) => (
                  <tr key={n} className="border-b border-border"><td className="py-2 pr-2">{i.descricao}</td><td className="py-2 text-right">{i.quantidade}</td><td className="py-2 text-right">{reais(i.quantidade * i.valorCentavos)}</td></tr>
                ))}
                <tr><td className="py-2 font-semibold" colSpan={2}>Total</td><td className="py-2 text-right text-lg font-semibold text-primary">{reais(p.total)}</td></tr>
              </tbody>
            </table>
          </div>
          {p.observacoes && <div className="mt-4 whitespace-pre-line rounded-card bg-background px-4 py-3 text-sm"><strong>Condições:</strong> {p.observacoes}</div>}
          <p className="mt-3 text-xs text-text/60">Válida até {data(p.validadeAte)}.</p>

          {respondida ? (
            <div className={`mt-6 rounded-card p-4 text-center ${respondida === 'ACEITA' ? 'bg-success/10' : 'bg-background'}`}>
              <p className="text-4xl">{respondida === 'ACEITA' ? '✅' : '📄'}</p>
              <p className="mt-2 font-semibold">{respondida === 'ACEITA' ? 'Proposta aceita. Obrigado!' : 'Resposta registrada. Obrigado por avisar.'}</p>
              <p className="mt-1 text-sm text-text/70">{respondida === 'ACEITA' ? `${p.consultoria.nome} vai entrar em contato para os próximos passos.` : 'Se mudar de ideia, fale com quem enviou a proposta.'}</p>
            </div>
          ) : p.vencida ? (
            <p className="mt-6 rounded-card bg-background px-4 py-3 text-sm">O prazo desta proposta acabou. Peça uma proposta atualizada a {p.consultoria.nome}.</p>
          ) : modo === 'ver' ? (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Botao className="flex-1 py-3 text-base" onClick={() => setModo('aceitar')}>Aceitar a proposta</Botao>
              <Botao variante="secundario" className="py-3" onClick={() => setModo('recusar')}>Recusar</Botao>
            </div>
          ) : (
            <div className="mt-6 space-y-3 rounded-card border border-primary p-4">
              <p className="font-semibold">{modo === 'aceitar' ? 'Para aceitar, diga quem está aprovando' : 'Para recusar, diga quem está respondendo'}</p>
              <label className="block text-sm">Seu nome completo<input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></label>
              {modo === 'aceitar'
                ? <label className="block text-sm">Cargo (opcional)<input className={campo} value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Sócio, Gerente" /></label>
                : <label className="block text-sm">Motivo (opcional)<textarea className={campo} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>}
              {modo === 'aceitar' && <p className="text-xs text-text/60">Ao aceitar, fica registrado seu nome, a data, a hora e o endereço de internet, como comprovante do aceite.</p>}
              {erro && <p className="text-sm text-danger">{erro}</p>}
              <Botao className="w-full py-3 text-base" disabled={enviando || nome.trim().length < 3} onClick={responder}>
                {enviando ? 'Enviando…' : modo === 'aceitar' ? `Confirmo o aceite de ${reais(p.total)}` : 'Confirmar recusa'}
              </Botao>
              <button type="button" className="w-full text-sm text-text/60 underline" onClick={() => { setModo('ver'); setErro(''); }}>Voltar</button>
            </div>
          )}
        </>)}
      </section>
    </main>
  );
}
