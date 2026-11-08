'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RostoCampo } from '@/components/RostoCampo';
import { ListasGuardadas } from '@/components/ListasGuardadas';
import { reduzirFoto } from '@/components/Foto';
import { FotoGuardada, guardarFotos } from '@/lib/fotos-offline';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { EtapaApr, ItemInspecao } from '@/lib/api';
import { libera, planoMinimo, usePlano } from '@/lib/plano';
import { BaseCampo, enviarPendentes, guardarPendente, lerBase, lerPendentes, Pendente, prepararCampo, removerPendente, tirarErro } from '@/lib/campo';
import { lerToken } from '@/lib/sessao';

type Aba = 'inspecao' | 'apr' | 'dds' | 'rosto';
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Tela para usar no campo, com ou sem sinal. O que for preenchido sem internet fica no aparelho e é enviado depois.
export default function CampoPage() {
  const [online, setOnline] = useState(true);
  const [base, setBase] = useState<BaseCampo | null>(null);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [aba, setAba] = useState<Aba>('inspecao');
  const [empresaId, setEmpresaId] = useState('');
  const [modelo, setModelo] = useState('');
  const [respostas, setRespostas] = useState<Record<number, ItemInspecao['resposta']>>({});
  const [etapas, setEtapas] = useState<EtapaApr[]>([{ etapa: '', riscos: '', medidas: '', epis: '' }]);
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok' | 'info'; texto: string } | null>(null);
  const [logado, setLogado] = useState(true);
  const [fotos, setFotos] = useState<FotoGuardada[]>([]); // fotos da inspeção, guardadas no aparelho até enviar
  const [abrirAcoes, setAbrirAcoes] = useState(true);
  const [temaDds, setTemaDds] = useState('');
  const [buscaDds, setBuscaDds] = useState('');
  const [presentes, setPresentes] = useState<string[]>([]);

  const atualizar = useCallback(() => setPendentes(lerPendentes()), []);
  const sincronizar = useCallback(async () => {
    const r = await enviarPendentes(); atualizar();
    if (r.enviados) setAviso({ tipo: 'ok', texto: `${r.enviados} registro(s) enviado(s) ao sistema.${r.falhas ? ` ${r.falhas} com problema: veja abaixo.` : ''}` });
  }, [atualizar]);

  useEffect(() => {
    setLogado(!!lerToken()); setOnline(navigator.onLine); setBase(lerBase()); atualizar();
    if (new URLSearchParams(window.location.search).get('aba') === 'epi') setAba('rosto'); // vindo do menu "Entrega de EPI"
    // Com uma empresa só, já deixa escolhida.
    const b = lerBase(); if (b?.empresas.length === 1) setEmpresaId(b.empresas[0].id);
    const ligar = () => { setOnline(true); sincronizar(); }; const desligar = () => setOnline(false);
    window.addEventListener('online', ligar); window.addEventListener('offline', desligar);
    if (navigator.onLine && lerToken()) {
      prepararCampo().then((b) => { setBase(b); if (b.empresas.length === 1) setEmpresaId(b.empresas[0].id); }).catch(() => undefined);
      sincronizar();
    }
    return () => { window.removeEventListener('online', ligar); window.removeEventListener('offline', desligar); };
  }, [atualizar, sincronizar]);

  const empresa = base?.empresas.find((e) => e.id === empresaId);
  const checklist = base?.modelos.find((m) => m.modelo === modelo);

  const tema = base?.temasDds?.find((x) => x.tema === temaDds);
  const pessoasEmpresa = (empresaId && base?.pessoas?.[empresaId]) || [];

  function salvar(tipo: Pendente['tipo'], titulo: string, dados: Record<string, unknown>) {
    if (!empresa) throw new Error('Escolha a empresa.');
    const novo = guardarPendente({ tipo, empresaId: empresa.id, empresaNome: empresa.razaoSocial, titulo, dados });
    if (tipo === 'inspecao' && fotos.length) guardarFotos(novo.id, fotos).catch(() => setAviso({ tipo: 'erro', texto: 'As fotos não couberam no aparelho. A inspeção foi guardada sem elas.' }));
    atualizar(); setChave((k) => k + 1); setRespostas({}); setEtapas([{ etapa: '', riscos: '', medidas: '', epis: '' }]);
    setFotos([]); setTemaDds(''); setPresentes([]);
    setAviso({ tipo: 'ok', texto: navigator.onLine ? 'Guardado. Enviando agora…' : 'Guardado no aparelho. Será enviado sozinho quando a internet voltar.' });
    if (navigator.onLine) sincronizar();
  }
  const plano = usePlano();
  const tentar = (f: () => void) => { try { f(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } };

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/" className="text-sm text-primary">← Painel</Link>
          <h1 className="mt-2 text-2xl font-semibold text-primary">Campo</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${online ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>{online ? 'Com internet' : 'Sem internet: guardando no aparelho'}</span>
      </div>

      {!libera(plano, 'offline') && (
        <div className="card-pendente rounded-card p-4 text-sm">
          <p className="font-semibold">O uso no campo sem internet faz parte do plano {planoMinimo('offline')} ou maior.</p>
          <p className="mt-1">No plano Grátis, preencha as inspeções e a APR com internet, em Operação diária. <Link href="/plano?recurso=offline" className="font-semibold text-primary">Ver os planos</Link></p>
        </div>
      )}
      {libera(plano, 'offline') && !logado && <Aviso tipo="erro">Entre no sistema uma vez com internet para usar o campo neste aparelho. <Link href="/entrar" className="underline">Entrar</Link></Aviso>}
      {logado && !base && <Aviso tipo="info">Abra esta tela uma vez com internet para guardar as empresas e os checklists no aparelho.</Aviso>}
      {base && <p className="text-xs text-text/60">Empresas, checklists e rostos dos funcionários guardados em {quando(base.atualizadoEm)}. Dica: no celular, use &quot;Adicionar à tela inicial&quot; para abrir o Safety Nexo como aplicativo.</p>}
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {pendentes.length > 0 && (
        <Cartao titulo={`Para enviar (${pendentes.length})`} acao={online ? <Botao variante="secundario" onClick={sincronizar}>Enviar agora</Botao> : undefined}>
          <ul className="divide-y divide-border text-sm">
            {pendentes.map((p) => (
              <li key={p.id} className="py-2">
                <p><strong>{p.tipo === 'inspecao' ? 'Inspeção' : p.tipo === 'dds' ? 'DDS' : 'APR'}</strong> · {p.titulo} · {p.empresaNome}</p>
                <p className="text-xs text-text/60">Preenchida em {quando(p.criadoEm)}</p>
                {p.erro && (
                  <p className="text-xs text-danger">O sistema recusou: {p.erro}{' '}
                    <button className="underline" onClick={() => { tirarErro(p.id); atualizar(); sincronizar(); }}>Tentar de novo</button>{' '}
                    <button className="underline" onClick={() => confirm('Descartar este registro?') && (removerPendente(p.id), atualizar())}>Descartar</button>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {base && libera(plano, 'offline') && (<>
        <Selecao id="cp-emp" rotulo="Empresa" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          <option value="">Escolha</option>{base.empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
        </Selecao>
        <ListasGuardadas empresaId={empresaId} />
        <div role="tablist" className="flex flex-wrap gap-2">
          {([['rosto', 'Entrega de EPI (rosto)'], ['inspecao', 'Inspeção (checklist)'], ['dds', 'DDS'], ['apr', 'APR']] as [Aba, string][]).map(([v, n]) => (
            <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === v ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{n}</button>
          ))}
        </div>

        {aba === 'rosto' && (empresaId ? <RostoCampo empresaId={empresaId} base={base.rosto?.[empresaId]} /> : <Aviso tipo="info">Escolha a empresa.</Aviso>)}

        {aba === 'inspecao' && (
          <Cartao titulo="Inspeção">
            <form key={chave} className="space-y-4" onSubmit={(ev) => {
              ev.preventDefault(); const d = new FormData(ev.currentTarget); const t = (c: string) => String(d.get(c) ?? '').trim();
              tentar(() => {
                if (!checklist) throw new Error('Escolha o checklist.');
                const faltam = checklist.itens.filter((_, i) => !respostas[i]).length;
                if (faltam) throw new Error(`Responda todos os itens. Faltam ${faltam}.`);
                const itens = checklist.itens.map((texto, i) => ({ texto, resposta: respostas[i], observacao: t(`obs-${i}`) || undefined, grau: checklist.graus?.[i] }));
                salvar('inspecao', `${checklist.titulo} · ${t('local')}${fotos.length ? ` · ${fotos.length} foto(s)` : ''}`, { modelo: checklist.modelo, titulo: checklist.titulo, local: t('local'), data: t('data'), inspetor: t('inspetor'), itens, abrirAcoes });
              });
            }}>
              <Selecao id="cp-mod" rotulo="Checklist" value={modelo} onChange={(e) => { setModelo(e.target.value); setRespostas({}); }}>
                <option value="">Escolha</option>{base.modelos.map((m) => <option key={m.modelo} value={m.modelo}>{m.titulo}</option>)}
              </Selecao>
              <div className="grid gap-3 sm:grid-cols-3">
                <Campo id="cp-local" name="local" rotulo="Local" required />
                <Campo id="cp-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
                <Campo id="cp-insp" name="inspetor" rotulo="Inspetor(a)" required />
              </div>
              {checklist && (
                <ol className="space-y-3">
                  {checklist.itens.map((item, i) => (
                    <li key={i} className={`rounded-card p-3 ${respostas[i] === 'C' ? 'card-ok' : respostas[i] === 'NC' ? 'card-nao' : respostas[i] === 'NA' ? 'border border-border bg-background' : 'border border-border bg-white'}`}>
                      <p className="text-sm">{i + 1}. {item}</p>
                      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`Item ${i + 1}`}>
                        {([['C', 'Conforme'], ['NC', 'Não conforme'], ['NA', 'Não se aplica']] as [ItemInspecao['resposta'], string][]).map(([v, n]) => (
                          <button key={v} type="button" role="radio" aria-checked={respostas[i] === v} onClick={() => setRespostas({ ...respostas, [i]: v })}
                            className={`rounded-card px-3 py-1.5 text-xs font-semibold ${respostas[i] === v ? (v === 'NC' ? 'bg-danger text-white' : v === 'C' ? 'bg-success text-white' : 'bg-text/60 text-white') : 'border border-border bg-white'}`}>{n}</button>
                        ))}
                      </div>
                      {respostas[i] === 'NC' && <input name={`obs-${i}`} aria-label={`Observação do item ${i + 1}`} placeholder="O que está errado?" className="mt-2 w-full rounded-card border border-border bg-background px-3 py-2 text-sm" />}
                    </li>
                  ))}
                </ol>
              )}
              <div className="space-y-2 rounded-card border border-border bg-white p-3">
                <p className="text-sm font-semibold text-primary">Fotos (até 5)</p>
                <p className="text-xs text-text/60">Tire a foto da não conformidade. Ela fica no aparelho e sobe junto com a inspeção.</p>
                {fotos.length > 0 && (
                  <ul className="space-y-2">
                    {fotos.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f.foto)} alt="" className="h-14 w-14 rounded-lg object-cover" />
                        <input aria-label={`Legenda da foto ${i + 1}`} value={f.legenda} placeholder="Ex.: Extintor sem lacre" onChange={(e) => setFotos(fotos.map((x, j) => (j === i ? { ...x, legenda: e.target.value } : x)))} className="flex-1 px-3 py-2 text-sm" />
                        <button type="button" className="text-xs text-danger" onClick={() => setFotos(fotos.filter((_, j) => j !== i))}>Tirar</button>
                      </li>
                    ))}
                  </ul>
                )}
                {fotos.length < 5 && (
                  <label className="inline-block cursor-pointer rounded-card border-2 border-dashed border-primary/40 px-4 py-2.5 text-sm font-semibold text-primary">
                    📷 Tirar ou escolher foto
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const arq = e.target.files?.[0]; e.target.value = '';
                      if (arq) { const foto = await reduzirFoto(arq, 1280); setFotos((x) => [...x, { foto, legenda: '' }].slice(0, 5)); }
                    }} />
                  </label>
                )}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={abrirAcoes} onChange={(e) => setAbrirAcoes(e.target.checked)} className="mt-1 h-4 w-4" />
                <span>Abrir uma ação (5W2H) no plano de ação para cada item não conforme, quando enviar.</span>
              </label>
              <Botao type="submit" className="w-full">Guardar inspeção</Botao>
            </form>
          </Cartao>
        )}

        {aba === 'dds' && (
          <Cartao titulo="DDS do dia">
            {!base.temasDds?.length ? <Aviso tipo="info">Abra esta tela uma vez com internet para guardar os 150 temas de DDS no aparelho.</Aviso> : (
              <form key={chave} className="space-y-4" onSubmit={(ev) => {
                ev.preventDefault(); const d = new FormData(ev.currentTarget); const t = (c: string) => String(d.get(c) ?? '').trim();
                tentar(() => {
                  if (!tema) throw new Error('Escolha o tema.');
                  if (!presentes.length) throw new Error('Marque quem participou.');
                  salvar('dds', `DDS: ${tema.tema}`, { tema: tema.tema, conteudo: tema.conteudo, data: t('data'), duracaoMin: Number(t('duracao')) || 10, ministrante: t('ministrante'), participantes: presentes });
                });
              }}>
                <Campo id="cd-busca" rotulo="Procurar tema" type="search" value={buscaDds} onChange={(e) => setBuscaDds(e.target.value)} placeholder="Ex.: cinto, altura, calor" />
                <Selecao id="cd-tema" rotulo="Tema" value={temaDds} onChange={(e) => setTemaDds(e.target.value)}>
                  <option value="">Escolha</option>
                  {base.temasDds.filter((x) => !buscaDds || `${x.tema} ${x.categoria}`.toLowerCase().includes(buscaDds.toLowerCase())).map((x) => <option key={x.tema} value={x.tema}>{x.categoria} · {x.tema}</option>)}
                </Selecao>
                {tema && (
                  <div className="card-total space-y-2 rounded-card p-4 text-sm">
                    <p>{tema.conteudo}</p>
                    <p><strong>Pergunte à equipe:</strong> {tema.pergunta}</p>
                    <p><strong>Conte este caso:</strong> {tema.situacao}</p>
                    <p><strong>Dinâmica:</strong> {tema.dinamica}</p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo id="cd-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
                  <Campo id="cd-dur" name="duracao" type="number" rotulo="Minutos" defaultValue={10} min={1} />
                  <Campo id="cd-min" name="ministrante" rotulo="Quem conduziu" required placeholder="Ex.: Técnico João" />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-primary">Quem participou ({presentes.length})</p>
                  {pessoasEmpresa.length === 0 ? <p className="text-xs text-text/60">Nenhum funcionário guardado desta empresa.</p> : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {pessoasEmpresa.map((p) => {
                        const marcado = presentes.includes(p.id);
                        return (
                          <li key={p.id}>
                            <button type="button" onClick={() => setPresentes(marcado ? presentes.filter((n) => n !== p.id) : [...presentes, p.id])}
                              className={`w-full rounded-card px-3 py-3 text-left text-sm ${marcado ? 'card-ok font-semibold' : 'border border-border bg-white'}`}>
                              {marcado ? '✓ ' : ''}{p.nome} <span className="text-xs text-text/60">· {p.cargo}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-text/60">A assinatura de cada um (lista de toque) é feita depois que o DDS chega ao sistema, em Listas guardadas.</p>
                </div>
                <Botao type="submit" className="w-full">Guardar DDS</Botao>
              </form>
            )}
          </Cartao>
        )}

        {aba === 'apr' && (
          <Cartao titulo="Análise Preliminar de Risco">
            <form key={chave} className="space-y-4" onSubmit={(ev) => {
              ev.preventDefault(); const d = new FormData(ev.currentTarget); const t = (c: string) => String(d.get(c) ?? '').trim();
              tentar(() => {
                const lista = etapas.filter((e) => e.etapa.trim());
                if (!lista.length) throw new Error('Inclua pelo menos uma etapa.');
                salvar('apr', `${t('atividade')} · ${t('local')}`, { atividade: t('atividade'), local: t('local'), data: t('data'), responsavel: t('resp'), equipe: t('equipe').split(',').map((x) => x.trim()).filter(Boolean), etapas: lista });
              });
            }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo id="ca-ativ" name="atividade" rotulo="Atividade" required />
                <Campo id="ca-local" name="local" rotulo="Local" required />
                <Campo id="ca-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
                <Campo id="ca-resp" name="resp" rotulo="Responsável" required />
                <Campo id="ca-equipe" name="equipe" rotulo="Equipe (separe por vírgula)" className="sm:col-span-2" />
              </div>
              {etapas.map((e, i) => (
                <div key={i} className="space-y-2 rounded-card border border-border p-3">
                  <p className="text-sm font-semibold">Etapa {i + 1}</p>
                  {(['etapa', 'riscos', 'medidas', 'epis'] as const).map((c) => (
                    <input key={c} aria-label={`${c} da etapa ${i + 1}`} placeholder={{ etapa: 'O que se faz', riscos: 'Riscos', medidas: 'Como controlar', epis: 'EPIs' }[c]} value={e[c] ?? ''}
                      onChange={(ev) => setEtapas(etapas.map((x, j) => (j === i ? { ...x, [c]: ev.target.value } : x)))} className="w-full rounded-card border border-border bg-background px-3 py-2 text-sm" />
                  ))}
                </div>
              ))}
              <button type="button" className="text-sm font-semibold text-primary" onClick={() => setEtapas([...etapas, { etapa: '', riscos: '', medidas: '', epis: '' }])}>+ Outra etapa</button>
              <Botao type="submit" className="w-full">Guardar APR</Botao>
            </form>
          </Cartao>
        )}
      </>)}
    </main>
  );
}
