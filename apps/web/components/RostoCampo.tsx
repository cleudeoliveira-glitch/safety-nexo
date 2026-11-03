'use client';

import { useCallback, useEffect, useState } from 'react';
import { rosto } from '@/lib/api';
import type { BaseRosto } from '@/lib/campo';
import { CapturaGuardada, enviarCapturas, guardarCaptura, listarCapturas, removerCaptura, tentarDeNovo } from '@/lib/rosto-offline';
import { configRosto } from '@/lib/rosto';
import { CameraRosto, CapturaRosto } from './CameraRosto';
import { Aviso, Botao, Campo, Cartao, Selecao } from './ui';

const MOTIVOS = [['ENTREGA_INICIAL', 'Entrega inicial'], ['DESGASTE', 'Troca por desgaste'], ['PERDA', 'Perda'], ['DANO', 'Dano']] as const;
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const GUARDADO = 'Sem internet: guardado no aparelho. Será conferido e enviado quando a internet voltar.';
const captura = (c: CapturaRosto) => ({ descritor: c.descritor, foto: c.foto, ...(c.fotoItem ? { fotoItem: c.fotoItem } : {}), latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida });
// Sem sinal, nem tenta a internet: vai direto para o aparelho.
const semRede = () => { if (!navigator.onLine) throw new TypeError('sem internet'); };

type Acao = 'epi' | 'dds' | 'turma';

// Entrega de EPI e presença pelo rosto na tela de campo, com ou sem internet.
export function RostoCampo({ empresaId, base }: { empresaId: string; base: BaseRosto | undefined }) {
  const [acao, setAcao] = useState<Acao>('epi');
  const [colab, setColab] = useState('');
  const [item, setItem] = useState('');
  const [ref, setRef] = useState('');
  const [camera, setCamera] = useState<null | { titulo: string; modo: 'unico' | 'continuo'; dados?: Record<string, unknown> }>(null);
  const [capturas, setCapturas] = useState<CapturaGuardada[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [usos, setUsos] = useState({ EPI: true, DDS: false, TREINAMENTO: false });
  useEffect(() => { configRosto().then((c) => { if (c.usos) setUsos(c.usos); }); }, []);

  const atualizar = useCallback(() => { listarCapturas().then(setCapturas); }, []);
  useEffect(() => { atualizar(); window.addEventListener('capturas-rosto', atualizar); return () => window.removeEventListener('capturas-rosto', atualizar); }, [atualizar]);
  const enviar = async () => {
    const r = await enviarCapturas(); atualizar();
    if (r.enviados || r.recusados) setAviso({ tipo: r.recusados ? 'erro' : 'ok', texto: `${r.enviados} enviado(s).${r.recusados ? ` ${r.recusados} recusado(s): veja abaixo.` : ''}` });
  };

  if (!base) return <Aviso tipo="info">Abra o campo com internet uma vez para guardar os funcionários com rosto desta empresa.</Aviso>;
  const pessoa = base.colaboradores.find((c) => c.id === colab);
  const daEmpresa = capturas.filter((c) => c.empresaId === empresaId);

  return (
    <div className="space-y-4">
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      {daEmpresa.length > 0 && (
        <Cartao titulo={`Rostos para enviar (${daEmpresa.length})`} acao={navigator.onLine ? <Botao variante="secundario" onClick={enviar}>Enviar agora</Botao> : undefined}>
          <ul className="divide-y divide-border text-sm">
            {daEmpresa.map((c) => (
              <li key={c.id} className="py-2">
                <p><strong>{c.tipo === 'EPI' ? 'Entrega de EPI' : c.tipo === 'DDS' ? 'Presença no DDS' : 'Presença no treinamento'}</strong> · {c.titulo}</p>
                <p className="text-xs text-text/60">Capturado em {quando(c.criadoEm)}</p>
                {c.erro && (
                  <p className="text-xs text-danger">O sistema recusou: {c.erro}{' '}
                    <button className="underline" onClick={async () => { await tentarDeNovo(c.id); enviar(); }}>Tentar de novo</button>{' '}
                    <button className="underline" onClick={async () => { if (confirm('Descartar esta captura?')) await removerCaptura(c.id); }}>Descartar</button>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao titulo="Pelo rosto">
        <div role="tablist" className="mb-4 flex flex-wrap gap-2">
          {([['epi', 'Entrega de EPI'], ['dds', 'Presença no DDS'], ['turma', 'Presença no treinamento']] as [Acao, string][]).filter(([v]) => v === 'epi' || (v === 'dds' ? usos.DDS : usos.TREINAMENTO)).map(([v, n]) => (
            <button key={v} role="tab" aria-selected={acao === v} onClick={() => { setAcao(v); setRef(''); }} className={`rounded-card px-3 py-1.5 text-sm font-semibold ${acao === v ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{n}</button>
          ))}
        </div>

        {acao === 'epi' && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(ev) => {
            ev.preventDefault(); const d = new FormData(ev.currentTarget); const t = (k: string) => String(d.get(k) ?? '').trim();
            const dados = { quantidade: Number(t('qtd') || 1), motivo: t('motivo'), ...(item ? { estoqueId: item } : { epi: t('epi'), ca: t('ca') }) };
            setCamera({ titulo: `Entrega de EPI para ${pessoa?.nome}`, modo: 'unico', dados });
          }}>
            {base.colaboradores.length === 0 ? <p className="text-sm text-text/60 sm:col-span-2">Nenhum funcionário desta empresa tem o rosto cadastrado.</p> : (<>
              <Selecao id="rc-colab" rotulo="Funcionário" required value={colab} onChange={(e) => setColab(e.target.value)} className="sm:col-span-2">
                <option value="">Escolha</option>{base.colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.cargo}</option>)}
              </Selecao>
              <Selecao id="rc-item" rotulo="EPI do almoxarifado" value={item} onChange={(e) => setItem(e.target.value)} className="sm:col-span-2">
                <option value="">Não, vou digitar</option>{base.estoque.map((i) => <option key={i.id} value={i.id}>{i.epi}{i.tamanho ? ` (${i.tamanho})` : ''} · CA {i.ca}</option>)}
              </Selecao>
              {!item && <><Campo id="rc-epi" name="epi" rotulo="EPI" required /><Campo id="rc-ca" name="ca" rotulo="CA" required /></>}
              <Campo id="rc-qtd" name="qtd" type="number" min={1} defaultValue={1} rotulo="Quantidade" required />
              <Selecao id="rc-motivo" name="motivo" rotulo="Motivo" required>{MOTIVOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</Selecao>
              <Botao type="submit" className="sm:col-span-2">Abrir câmera</Botao>
            </>)}
          </form>
        )}

        {acao !== 'epi' && (
          <div className="space-y-3">
            <Selecao id="rc-ref" rotulo={acao === 'dds' ? 'DDS' : 'Turma'} value={ref} onChange={(e) => setRef(e.target.value)}>
              <option value="">Escolha</option>
              {acao === 'dds' ? base.dds.map((d) => <option key={d.id} value={d.id}>{new Date(d.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {d.tema}</option>)
                : base.turmas.map((t) => <option key={t.id} value={t.id}>{t.norma ? `${t.norma} · ` : ''}{t.nome}</option>)}
            </Selecao>
            <Botao className="w-full" disabled={!ref} onClick={() => {
              const nome = acao === 'dds' ? base.dds.find((d) => d.id === ref)?.tema : base.turmas.find((t) => t.id === ref)?.nome;
              setCamera({ titulo: `Presença: ${nome}`, modo: 'continuo' });
            }}>Abrir câmera</Botao>
          </div>
        )}
      </Cartao>

      {camera && (
        <CameraRosto titulo={camera.titulo} modo={camera.modo} pedirFotoItem={acao === 'epi'} onFechar={() => { setCamera(null); atualizar(); }}
          onCaptura={async (c) => {
            semRede();
            if (acao === 'epi') { const r = await rosto.entregarEpi(empresaId, colab, { ...camera.dados, ...captura(c) }); return `Rosto conferido. Entrega de ${r.entrega.epi} registrada.`; }
            const r = acao === 'dds' ? await rosto.presencaDds(empresaId, ref, captura(c)) : await rosto.presencaTurma(empresaId, ref, captura(c));
            return r.repetido ? `${r.nome} já estava com presença` : `${r.nome}: presença registrada`;
          }}
          guardarOffline={async (c) => {
            if (acao === 'epi') await guardarCaptura({ tipo: 'EPI', empresaId, refId: colab, titulo: `${pessoa?.nome ?? ''}`, dados: { ...camera.dados, ...captura(c) } });
            else await guardarCaptura({ tipo: acao === 'dds' ? 'DDS' : 'TREINAMENTO', empresaId, refId: ref, titulo: camera.titulo.replace('Presença: ', ''), dados: captura(c) });
            return GUARDADO;
          }} />
      )}
    </div>
  );
}
