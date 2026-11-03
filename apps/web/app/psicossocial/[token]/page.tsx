'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Botao } from '@/components/ui';
import { FormularioPs, formularioPs } from '@/lib/api';

// Página pública e anônima: o trabalhador responde pelo celular. Nada identifica quem respondeu.
export default function ResponderPsicossocial({ params }: { params: { token: string } }) {
  const [f, setF] = useState<FormularioPs | null>(null);
  const [erro, setErro] = useState('');
  const [setor, setSetor] = useState('');
  const [valores, setValores] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null | undefined>(undefined);
  const [jaRespondeu, setJaRespondeu] = useState(false);
  const chave = `ps-respondido-${params.token}`;

  useEffect(() => {
    try { setJaRespondeu(localStorage.getItem(chave) === '1'); } catch { /* sem armazenamento */ }
    formularioPs.dados(params.token).then(setF).catch((e: Error) => setErro(e.message));
  }, [params.token, chave]);

  const faltam = f ? f.questionario.itens.filter((i) => valores[i.n] === undefined).length : 0;

  async function enviar() {
    setEnviando(true); setErro('');
    try {
      const r = await formularioPs.responder(params.token, { setor, valores });
      try { localStorage.setItem(chave, '1'); } catch { /* sem armazenamento */ }
      setAviso(r.aviso);
      window.scrollTo(0, 0);
    } catch (e) { setErro((e as Error).message); } finally { setEnviando(false); }
  }

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-6 h-10 w-auto" />
      <section className="rounded-card border border-border bg-white p-6 shadow-sm">
        {!f && !erro && <p>Carregando…</p>}
        {!f && erro && <p className="text-danger">{erro}</p>}
        {f && aviso !== undefined && (
          <div className="space-y-4">
            <p className="rounded-card bg-success px-4 py-3 text-center font-semibold text-white">Respostas enviadas. Obrigado!</p>
            {aviso && <p className="rounded-card border border-primary px-4 py-3 text-sm">{aviso}</p>}
          </div>
        )}
        {f && aviso === undefined && (<>
          <h1 className="text-xl font-semibold text-primary">{f.titulo}</h1>
          <p className="mt-1 text-sm text-text/70">{f.empresa} · aplicado por {f.consultoria}</p>
          <p className="mt-4 rounded-card bg-background px-4 py-3 text-sm">
            <strong>É anônimo.</strong> Não pedimos nome, e-mail nem telefone. A empresa só vê o resultado do setor quando várias pessoas responderem, nunca a resposta de alguém.
          </p>
          {!f.aberta ? <p className="mt-4 text-danger">Esta pesquisa já foi encerrada.</p> : (<>
            {jaRespondeu && <p className="mt-4 text-sm text-warning">Parece que você já respondeu neste aparelho. Se outra pessoa está usando o mesmo celular, pode seguir.</p>}
            <p className="mt-4 text-sm text-text/70">{f.questionario.descricao}</p>
            <div className="mt-4">
              <label htmlFor="setor" className="mb-1.5 block text-sm font-semibold">Seu setor</label>
              <select id="setor" value={setor} onChange={(e) => setSetor(e.target.value)} className="w-full rounded-card border border-border bg-background px-3 py-2">
                <option value="">Escolha</option>{f.setores.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <ol className="mt-5 space-y-4">
              {f.questionario.itens.map((i) => (
                <li key={i.n}>
                  <p className="text-sm font-semibold">{i.n}. {i.texto}</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`Pergunta ${i.n}`}>
                    {f.questionario.escala.map((o) => (
                      <button key={o.valor} type="button" role="radio" aria-checked={valores[i.n] === o.valor} onClick={() => setValores({ ...valores, [i.n]: o.valor })}
                        className={`min-w-[88px] rounded-card px-4 py-2 text-sm font-semibold ${valores[i.n] === o.valor ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{o.rotulo}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            {erro && <p className="mt-4 text-sm text-danger">{erro}</p>}
            <Botao className="mt-6 w-full" disabled={!setor || faltam > 0 || enviando} onClick={enviar}>
              {enviando ? 'Enviando…' : faltam ? `Faltam ${faltam} pergunta(s)` : !setor ? 'Escolha o seu setor' : 'Enviar respostas'}
            </Botao>
          </>)}
        </>)}
      </section>
    </main>
  );
}
