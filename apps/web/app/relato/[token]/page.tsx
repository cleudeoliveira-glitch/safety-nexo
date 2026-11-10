'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Ditado, EscolherFoto } from '@/components/Foto';
import { Botao } from '@/components/ui';
import { relatoPublico, TipoRelato, TIPOS_RELATO } from '@/lib/api';

const ICONE: Record<TipoRelato, string> = { QUASE_ACIDENTE: '⚠️', CONDICAO_INSEGURA: '🚧', ATO_INSEGURO: '🙋', SUGESTAO: '💡', DENUNCIA: '🛡️' };

// Página pública do QR code: qualquer pessoa relata pelo celular, sem login e sem precisar se identificar.
export default function RelatarPage({ params }: { params: { token: string } }) {
  const [dados, setDados] = useState<{ empresa: string; consultoria: string; setores: string[] } | null>(null);
  const [erro, setErro] = useState('');
  const [tipo, setTipo] = useState<TipoRelato | null>(null);
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [nome, setNome] = useState('');
  const [foto, setFoto] = useState<Blob | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [numero, setNumero] = useState<number | null>(null);

  useEffect(() => { relatoPublico.dados(params.token).then(setDados).catch((e: Error) => setErro(e.message)); }, [params.token]);

  async function enviar() {
    if (!tipo) return;
    setEnviando(true); setErro('');
    try {
      const r = await relatoPublico.enviar(params.token, { tipo, descricao, local, nome: tipo === 'DENUNCIA' ? '' : nome }, foto);
      setNumero(r.numero); window.scrollTo(0, 0);
    } catch (e) { setErro((e as Error).message); } finally { setEnviando(false); }
  }

  function outro() { setTipo(null); setDescricao(''); setLocal(''); setFoto(null); setNumero(null); }

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-5 h-10 w-auto" />
      <section className="rounded-card border border-border bg-white p-5 shadow-sm">
        {!dados && !erro && <p>Carregando…</p>}
        {!dados && erro && <p className="text-danger">{erro}</p>}
        {dados && numero !== null && (
          <div className="space-y-4 text-center">
            <p className="text-5xl">✅</p>
            <h1 className="text-xl font-semibold text-primary">Obrigado! Seu relato chegou.</h1>
            <p className="text-sm text-text/70">Ele é o nº {numero}. A segurança do trabalho vai olhar e tomar as providências. Cuidar uns dos outros é o que evita acidente.</p>
            <Botao variante="secundario" className="w-full" onClick={outro}>Relatar outra coisa</Botao>
          </div>
        )}
        {dados && numero === null && (<>
          <h1 className="text-xl font-semibold text-primary">Viu algum perigo? Conte pra gente.</h1>
          <p className="mt-1 text-sm text-text/70">{dados.empresa}</p>
          <p className="mt-3 rounded-card bg-background px-4 py-3 text-sm"><strong>Não precisa se identificar.</strong> Seu nome é opcional. Ninguém é punido por relatar.</p>

          <p className="mt-5 text-sm font-semibold">1. O que você quer contar?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(TIPOS_RELATO) as TipoRelato[]).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} aria-pressed={tipo === t}
                className={`rounded-card p-3 text-left text-sm font-semibold ${t === 'DENUNCIA' ? 'col-span-2' : ''} ${tipo === t ? 'bg-primary text-white' : 'border border-border bg-white'}`}>
                <span className="block text-2xl">{ICONE[t]}</span>{TIPOS_RELATO[t]}
              </button>
            ))}
          </div>

          {tipo === 'DENUNCIA' && (
            <p className="mt-4 rounded-card bg-success/10 px-4 py-3 text-sm text-text"><strong>Sua denúncia é sempre anônima.</strong> O sistema não pede nem guarda seu nome. Só a consultoria de segurança do trabalho lê, a empresa não vê.</p>
          )}
          {tipo && (<>
            <label htmlFor="rel-desc" className="mt-5 block text-sm font-semibold">2. Conte o que aconteceu ou o que viu</label>
            <textarea id="rel-desc" rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-2 w-full rounded-card border border-border bg-background px-3 py-2"
              placeholder={tipo === 'DENUNCIA' ? 'O que aconteceu, quando e onde. Não precisa dizer quem você é.' : tipo === 'SUGESTAO' ? 'Sua ideia para deixar o trabalho mais seguro' : 'Ex.: o piso perto do forno está com óleo e quase escorreguei'} />
            <div className="mt-2"><Ditado acrescentar={(t) => setDescricao((d) => (d ? `${d} ${t}` : t))} /></div>

            <label htmlFor="rel-local" className="mt-5 block text-sm font-semibold">3. Onde?</label>
            <input id="rel-local" list="setores" value={local} onChange={(e) => setLocal(e.target.value)} className="mt-2 w-full rounded-card border border-border bg-background px-3 py-2" placeholder="Ex.: perto do forno" />
            <datalist id="setores">{dados.setores.map((s) => <option key={s} value={s} />)}</datalist>

            <p className="mt-5 text-sm font-semibold">4. Uma foto ajuda muito (opcional)</p>
            <div className="mt-2"><EscolherFoto foto={foto} mudar={setFoto} /></div>

            {tipo !== 'DENUNCIA' && <>
              <label htmlFor="rel-nome" className="mt-5 block text-sm font-semibold">Seu nome <span className="font-normal text-text/60">(opcional)</span></label>
              <input id="rel-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-2 w-full rounded-card border border-border bg-background px-3 py-2" placeholder="Deixe em branco para ficar anônimo" />
            </>}

            {erro && <p className="mt-4 text-sm text-danger">{erro}</p>}
            <Botao className="mt-6 w-full py-3 text-base" disabled={descricao.trim().length < 5 || enviando} onClick={enviar}>
              {enviando ? 'Enviando…' : descricao.trim().length < 5 ? 'Escreva o que viu' : tipo === 'DENUNCIA' ? 'Enviar denúncia anônima' : 'Enviar relato'}
            </Botao>
          </>)}
          <p className="mt-6 text-center text-xs text-text/50">Segurança do trabalho: {dados.consultoria}</p>
        </>)}
      </section>
    </main>
  );
}
