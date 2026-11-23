'use client';

import { useMemo, useState } from 'react';
import { CampoAjuda, type Ajuda } from '@/components/CampoAjuda';

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Escolher numa lista oficial (ex.: tabelas do eSocial) sem rolar centenas de linhas:
// botões com os mais comuns, busca por palavra e, se não achar, escrever do seu jeito.
// Envia o texto escolhido em "name" e o código oficial em "nameCodigo".
export function EscolhaOficial({ id, rotulo, name, nameCodigo, itens, comuns = [], exemplo, required, ajuda, inicial }: {
  id: string; rotulo: string; name: string; nameCodigo: string; itens: [string, string][];
  comuns?: [string, string][]; // [código oficial, nome curto do botão]: os mais usados, um toque e pronto
  exemplo?: string; required?: boolean; ajuda?: Ajuda; inicial?: string;
}) {
  const [codigo, setCodigo] = useState('');
  const [texto, setTexto] = useState(inicial ?? '');
  const [busca, setBusca] = useState('');
  const [livre, setLivre] = useState(false);

  // Só vira botão o código que existe na lista carregada (evita botão que não leva a nada).
  const botoes = useMemo(() => comuns.flatMap(([c, nome]) => { const item = itens.find(([cod]) => cod === c); return item ? [{ item, nome }] : []; }), [comuns, itens]);
  const achados = useMemo(() => {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean);
    return termos.length ? itens.filter(([c, d]) => termos.every((t) => semAcento(`${c} ${d}`).includes(t))).slice(0, 8) : [];
  }, [busca, itens]);
  const escolher = ([c, d]: [string, string]) => { setCodigo(c); setTexto(d); setBusca(''); setLivre(false); };

  // Sem a lista (sem internet, por exemplo): fica o campo de escrever, como antes.
  const semLista = itens.length === 0;

  return (
    <div className="md:col-span-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold">{rotulo}</label>
        {ajuda && <CampoAjuda titulo={rotulo} ajuda={ajuda} />}
      </div>
      <input type="hidden" name={nameCodigo} value={livre || semLista ? '' : codigo} />
      {semLista || livre ? (
        <div className="space-y-1">
          <input id={id} name={name} required={required} value={texto} onChange={(e) => { setTexto(e.target.value); setCodigo(''); }}
            placeholder={exemplo ? `Ex.: ${exemplo}` : ''} className="campo-sn w-full" />
          {!semLista && <button type="button" onClick={() => setLivre(false)} className="min-h-[44px] text-sm font-semibold text-primary">← Escolher da lista oficial</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Campo que leva o texto e a validação "obrigatório" (fica invisível; o que se vê são os botões).
              Não pode ser readOnly: campo só de leitura o navegador não confere como obrigatório. */}
          <input id={id} name={name} required={required} value={texto} onChange={() => undefined} tabIndex={-1} aria-hidden="true"
            className="pointer-events-none absolute h-px w-px opacity-0" onFocus={() => document.getElementById(`${id}-busca`)?.focus()} />
          {texto ? (
            <div className="flex min-h-[52px] items-center justify-between gap-2 rounded-card border-2 border-primary bg-primary/5 px-3 py-2">
              <span className="text-sm"><strong>✓ {texto}</strong>{codigo && <span className="block text-xs text-text/50">Código eSocial {codigo}</span>}</span>
              <button type="button" onClick={() => { setTexto(''); setCodigo(''); setTimeout(() => document.getElementById(`${id}-busca`)?.focus(), 30); }}
                className="min-h-[44px] shrink-0 px-2 text-sm font-semibold text-primary">Trocar</button>
            </div>
          ) : (
            <>
              {botoes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {botoes.map(({ item, nome }) => (
                    <button key={item[0]} type="button" onClick={() => escolher(item)}
                      className="min-h-[44px] rounded-full border border-border bg-white px-4 text-sm font-semibold hover:border-primary">{nome}</button>
                  ))}
                </div>
              )}
              <input id={`${id}-busca`} type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder={exemplo ? `Procurar na lista oficial. Ex.: ${exemplo}` : 'Procurar na lista oficial'} className="campo-sn w-full" />
              {busca.trim() && (
                <ul className="divide-y divide-border rounded-card border border-border bg-white">
                  {achados.map((a) => (
                    <li key={a[0]}><button type="button" onClick={() => escolher(a)} className="min-h-[48px] w-full px-3 py-2 text-left text-sm hover:bg-primary/5">{a[1]}</button></li>
                  ))}
                  <li><button type="button" onClick={() => { setLivre(true); setTexto(busca); setCodigo(''); }} className="min-h-[48px] w-full px-3 py-2 text-left text-sm font-semibold text-primary">
                    {achados.length ? 'Não é nenhum desses: escrever do meu jeito' : `Nada na lista com "${busca}". Escrever do meu jeito`}
                  </button></li>
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
