'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { buscarEmpresa, Colaborador, Empresa, listarColaboradores, prontuario, RegistroSaude, salvarArquivo, TipoRegistro } from '@/lib/api';

const FREQ = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const ABAS: [TipoRegistro, string][] = [['VACINA', 'Vacina'], ['AUDIOMETRIA', 'Audiometria'], ['ESPIROMETRIA', 'Espirometria'], ['OUTRO', 'Outro exame']];
const NOME: Record<TipoRegistro, string> = { VACINA: 'Vacina', AUDIOMETRIA: 'Audiometria', ESPIROMETRIA: 'Espirometria', OUTRO: 'Exame' };
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const celula = 'w-14 rounded border border-border bg-white px-1 py-1 text-center text-sm';

// Igual ao painel: só o registro mais recente de cada vacina (nome antes do traço) ou tipo de exame cobra a próxima data.
const chaveReg = (r: RegistroSaude) => `${r.colaboradorId}|${r.tipo}|${r.tipo === 'VACINA' ? r.titulo.split(/[-–(]/)[0].trim().toLowerCase() : ''}`;
function Situacao({ r, superado }: { r: RegistroSaude; superado: boolean }) {
  if (!r.proximaData) return null;
  if (superado) return <span className="text-xs text-text/50">próxima já feita</span>;
  const dias = Math.floor((new Date(r.proximaData).getTime() - Date.now()) / 86_400_000);
  const cls = dias < 0 ? 'text-danger' : dias <= 30 ? 'text-warning' : 'text-text/60';
  return <span className={`text-xs ${cls}`}>próxima em {data(r.proximaData)}{dias < 0 ? ' (atrasada)' : ''}</span>;
}

function Resumo({ r }: { r: RegistroSaude }) {
  if (r.tipo === 'AUDIOMETRIA' && r.dados) {
    const l = r.dados as { od: Record<string, number | null>; oe: Record<string, number | null> };
    return <table className="mt-1 text-xs"><tbody>
      <tr><td className="pr-2 text-text/60">Hz</td>{FREQ.map((f) => <td key={f} className="px-1 text-text/60">{f}</td>)}</tr>
      <tr><td className="pr-2 text-danger">Dir.</td>{FREQ.map((f) => <td key={f} className="px-1 text-center">{l.od[f] ?? '-'}</td>)}</tr>
      <tr><td className="pr-2 text-primary">Esq.</td>{FREQ.map((f) => <td key={f} className="px-1 text-center">{l.oe[f] ?? '-'}</td>)}</tr>
    </tbody></table>;
  }
  if (r.tipo === 'ESPIROMETRIA' && r.dados) {
    const e = r.dados as Record<string, number | null>;
    const n = (v: number | null) => (v == null ? '-' : v.toLocaleString('pt-BR'));
    return <p className="text-xs text-text/70">CVF {n(e.cvf)} L ({n(e.cvfPct)}%) · VEF1 {n(e.vef1)} L ({n(e.vef1Pct)}%) · VEF1/CVF {n(e.relacao)}%</p>;
  }
  return null;
}

export default function ProntuarioPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [colabs, setColabs] = useState<Colaborador[]>([]);
  const [colab, setColab] = useState('');
  const [lista, setLista] = useState<RegistroSaude[]>([]);
  const [aba, setAba] = useState<TipoRegistro>('VACINA');
  const [aud, setAud] = useState<{ od: Record<number, string>; oe: Record<number, string> }>({ od: {}, oe: {} });
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  useEffect(() => {
    setColab(new URLSearchParams(window.location.search).get('colaborador') ?? '');
    Promise.all([buscarEmpresa(empresaId), listarColaboradores(empresaId)]).then(([e, c]) => { setEmpresa(e); setColabs(c); }).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
  }, [empresaId]);
  const carregar = useCallback(async () => {
    try { setLista(await prontuario.listar(empresaId, colab || undefined)); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId, colab]);
  useEffect(() => { carregar(); }, [carregar]);

  const agir = async (f: () => Promise<string>) => {
    try { setAviso({ tipo: 'ok', texto: await f() }); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  };

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const pessoa = colabs.find((c) => c.id === colab);
  const maisRecente = new Map<string, RegistroSaude>();
  for (const r of lista) { const a = maisRecente.get(chaveReg(r)); if (!a || r.data > a.data) maisRecente.set(chaveReg(r), r); }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={pessoa ? `/empresas/${empresaId}/colaboradores/${pessoa.id}` : `/empresas/${empresaId}`} className="text-sm text-primary">← Voltar</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Prontuário de saúde</h1>
        <p className="text-text/60">{empresa.razaoSocial} · vacinas, audiometrias e espirometrias. Só a consultoria vê estes dados.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <div className="flex flex-wrap items-end gap-3">
        <Selecao id="pr-colab" rotulo="Funcionário" value={colab} onChange={(e) => setColab(e.target.value)} className="min-w-[260px]">
          <option value="">Todos</option>{colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Selecao>
        {pessoa && <Botao variante="secundario" onClick={() => agir(async () => { salvarArquivo(await prontuario.pdf(empresaId, pessoa.id), `Prontuario-${pessoa.nome}.pdf`); return 'Prontuário baixado. Ele não vai para o arquivo de documentos, por ser sigiloso.'; })}>Baixar prontuário em PDF</Botao>}
      </div>

      <Cartao titulo={pessoa ? `Registros de ${pessoa.nome}` : 'Registros de todos'}>
        {!lista.length ? <p className="text-sm text-text/60">Nada registrado ainda.</p> : (
          <ul className="divide-y divide-border">
            {lista.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm"><strong>{NOME[r.tipo]}</strong> · {r.titulo} · {data(r.data)}{!pessoa ? ` · ${r.colaborador.nome}` : ''}</p>
                  <p className="text-xs text-text/60">{[r.lote && `Lote ${r.lote}`, r.profissional, r.resultado, r.alterado && 'alterado'].filter(Boolean).join(' · ')}</p>
                  <Resumo r={r} />
                  <Situacao r={r} superado={maisRecente.get(chaveReg(r))?.id !== r.id} />
                </div>
                <button className="text-sm text-danger underline" onClick={() => confirm('Apagar este registro?') && agir(async () => { await prontuario.remover(empresaId, r.id); return 'Registro apagado.'; })}>Apagar</button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Registrar">
        {!pessoa ? <p className="text-sm text-text/60">Escolha o funcionário acima para registrar.</p> : (<>
          <div role="tablist" className="mb-4 flex flex-wrap gap-2">
            {ABAS.map(([v, n]) => <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === v ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{n}</button>)}
          </div>
          <form key={`${aba}-${chave}`} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
            ev.preventDefault(); const d = new FormData(ev.currentTarget); const t = (c: string) => String(d.get(c) ?? '').trim();
            agir(async () => {
              const corpo: Record<string, unknown> = { colaboradorId: pessoa.id, tipo: aba, data: t('data'), titulo: t('titulo'), resultado: t('resultado') || undefined, alterado: aba !== 'VACINA' && d.get('alterado') === 'on', profissional: t('prof') || undefined, proximaData: t('proxima') || undefined, observacao: t('obs') || undefined };
              if (aba === 'VACINA') corpo.lote = t('lote') || undefined;
              if (aba === 'AUDIOMETRIA') corpo.dados = { od: Object.fromEntries(FREQ.map((f) => [f, aud.od[f] ?? ''])), oe: Object.fromEntries(FREQ.map((f) => [f, aud.oe[f] ?? ''])) };
              if (aba === 'ESPIROMETRIA') corpo.dados = { cvf: t('cvf'), cvfPct: t('cvfPct'), vef1: t('vef1'), vef1Pct: t('vef1Pct'), relacao: t('relacao') };
              await prontuario.criar(empresaId, corpo);
              setChave((k) => k + 1); setAud({ od: {}, oe: {} });
              return `${NOME[aba]} registrada para ${pessoa.nome}.`;
            });
          }}>
            <Campo id="pr-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="pr-titulo" name="titulo" rotulo={aba === 'VACINA' ? 'Vacina e dose' : 'Exame'} required
              placeholder={aba === 'VACINA' ? 'Ex.: Hepatite B - 1ª dose' : aba === 'AUDIOMETRIA' ? 'Ex.: Audiometria referencial' : aba === 'ESPIROMETRIA' ? 'Ex.: Espirometria' : 'Ex.: Hemograma'}
              defaultValue={aba === 'AUDIOMETRIA' ? 'Audiometria tonal' : aba === 'ESPIROMETRIA' ? 'Espirometria' : ''} />
            <Campo id="pr-prof" name="prof" rotulo={aba === 'VACINA' ? 'Aplicada por (local ou profissional)' : 'Profissional e registro'} />
            {aba === 'VACINA' && <Campo id="pr-lote" name="lote" rotulo="Lote" />}
            {aba === 'AUDIOMETRIA' && (
              <div className="md:col-span-3 overflow-x-auto">
                <p className="mb-2 text-sm font-semibold">Limiares (dB NA)</p>
                <table className="text-sm"><tbody>
                  <tr><td className="pr-3 text-text/60">Hz</td>{FREQ.map((f) => <td key={f} className="px-1 text-center text-xs text-text/60">{f}</td>)}</tr>
                  {(['od', 'oe'] as const).map((o) => (
                    <tr key={o}><td className={`pr-3 font-semibold ${o === 'od' ? 'text-danger' : 'text-primary'}`}>{o === 'od' ? 'Direita' : 'Esquerda'}</td>
                      {FREQ.map((f) => <td key={f} className="px-1 py-1"><input inputMode="numeric" aria-label={`${o === 'od' ? 'Direita' : 'Esquerda'} ${f} Hz`} className={celula} value={aud[o][f] ?? ''} onChange={(e) => setAud({ ...aud, [o]: { ...aud[o], [f]: e.target.value } })} /></td>)}
                    </tr>
                  ))}
                </tbody></table>
                <p className="mt-1 text-xs text-text/60">De 5 em 5 dB. Deixe vazio a frequência que não foi testada.</p>
              </div>
            )}
            {aba === 'ESPIROMETRIA' && (<>
              <Campo id="pr-cvf" name="cvf" rotulo="CVF (litros)" inputMode="decimal" />
              <Campo id="pr-cvfp" name="cvfPct" rotulo="CVF (% do previsto)" inputMode="decimal" />
              <Campo id="pr-vef1" name="vef1" rotulo="VEF1 (litros)" inputMode="decimal" />
              <Campo id="pr-vef1p" name="vef1Pct" rotulo="VEF1 (% do previsto)" inputMode="decimal" />
              <Campo id="pr-rel" name="relacao" rotulo="VEF1/CVF (%)" inputMode="decimal" />
            </>)}
            {aba !== 'VACINA' && <Campo id="pr-res" name="resultado" rotulo="Resultado ou conclusão do laudo" className="md:col-span-2" />}
            {aba !== 'VACINA' && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" name="alterado" className="h-4 w-4 accent-primary" /> Resultado alterado
              </label>
            )}
            <Campo id="pr-prox" name="proxima" type="date" rotulo={aba === 'VACINA' ? 'Próxima dose' : 'Próximo exame'} />
            <Campo id="pr-obs" name="obs" rotulo="Observação" className="md:col-span-2" />
            <div className="flex items-end justify-end"><Botao type="submit">Registrar</Botao></div>
          </form>
        </>)}
      </Cartao>
    </main>
  );
}
