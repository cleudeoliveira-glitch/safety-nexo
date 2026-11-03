'use client';

import { useEffect, useState } from 'react';
import { Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  Afastamento, buscarMotivosAfastamento, Cat, Colaborador, criarAfastamento, encerrarAfastamento, listarAfastamentos, removerAfastamento,
} from '@/lib/api';

type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const texto = (d: FormData, k: string) => String(d.get(k) ?? '').trim();
// Os motivos mais comuns aparecem primeiro na lista.
const COMUNS = ['01', '03', '17', '46', '35', '53'];

export function AbaAfastamentos({ empresaId, colaboradores, cats, avisar }: { empresaId: string; colaboradores: Colaborador[]; cats: Cat[]; avisar: Avisar }) {
  const [lista, setLista] = useState<Afastamento[]>([]);
  const [motivos, setMotivos] = useState<[string, string][]>([]);
  const [motivo, setMotivo] = useState('01');
  const [colab, setColab] = useState('');
  const [chave, setChave] = useState(0);
  const [voltas, setVoltas] = useState<Record<string, string>>({});

  async function recarregar() {
    try { setLista(await listarAfastamentos(empresaId)); } catch (e) { avisar('erro', (e as Error).message); }
  }
  useEffect(() => {
    buscarMotivosAfastamento(empresaId).then(setMotivos).catch((e) => avisar('erro', e.message));
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function agir(acao: () => Promise<unknown>, ok: string) {
    try { await acao(); avisar('ok', ok); await recarregar(); } catch (e) { avisar('erro', (e as Error).message); }
  }

  const saude = motivo === '01' || motivo === '03';
  const catsDoColab = cats.filter((c) => c.colaboradorId === colab);
  const nome = (m: string) => motivos.find(([c]) => c === m)?.[1] ?? m;
  const ordenados = [...motivos.filter(([c]) => COMUNS.includes(c)).sort((a, b) => COMUNS.indexOf(a[0]) - COMUNS.indexOf(b[0])), ...motivos.filter(([c]) => !COMUNS.includes(c))];

  return (
    <div className="space-y-6">
      <Cartao titulo="Registrar afastamento">
        <p className="mb-4 text-sm text-text/60">
          Registre quando alguém para de trabalhar por doença, acidente, licença ou outro motivo. Se ainda não voltou, deixe a volta em branco.
          Afastamento de 30 dias ou mais por doença ou acidente pede ASO de retorno antes de voltar (NR-07, item 7.5.9).
        </p>
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault();
          const d = new FormData(ev.currentTarget);
          const transito = texto(d, 'transito');
          agir(async () => {
            await criarAfastamento(empresaId, {
              colaboradorId: colab, motivo, inicio: texto(d, 'inicio'), fim: texto(d, 'fim') || undefined,
              mesmoMotivo: saude && d.has('mesmo') ? true : saude ? false : undefined,
              acidenteTransito: saude && transito ? Number(transito) : undefined,
              observacao: texto(d, 'obs') || undefined, catId: texto(d, 'cat') || undefined,
            });
            setChave((k) => k + 1); setColab(''); setMotivo('01');
          }, 'Afastamento registrado.');
        }}>
          <Selecao id="af-colab" rotulo="Colaborador" required value={colab} onChange={(e) => setColab(e.target.value)}>
            <option value="">Escolha</option>
            {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Selecao>
          <Selecao id="af-motivo" rotulo="Motivo (Tabela 18 do eSocial)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="md:col-span-2">
            {ordenados.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </Selecao>
          <Campo id="af-inicio" name="inicio" type="date" rotulo="Primeiro dia afastado" required />
          <Campo id="af-fim" name="fim" type="date" rotulo="Último dia afastado" dica="Em branco se ainda está afastado." />
          {saude && catsDoColab.length > 0 && (
            <Selecao id="af-cat" name="cat" rotulo="CAT do acidente (se houver)">
              <option value="">Nenhuma</option>
              {catsDoColab.map((c) => <option key={c.id} value={c.id}>CAT de {new Date(c.dataHora).toLocaleDateString('pt-BR')}</option>)}
            </Selecao>
          )}
          {saude && (<>
            <Selecao id="af-transito" name="transito" rotulo="Foi acidente de trânsito?">
              <option value="">Não</option><option value="1">Sim, atropelamento</option><option value="2">Sim, colisão</option><option value="3">Sim, outro</option>
            </Selecao>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="mesmo" /> É a mesma doença de um afastamento que terminou nos últimos 60 dias
            </label>
          </>)}
          <Campo id="af-obs" name="obs" rotulo={motivo === '21' ? 'Observação (obrigatória para este motivo)' : 'Observação'} className="md:col-span-3" maxLength={255} required={motivo === '21'} />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Registrar afastamento</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="Afastamentos registrados">
        {!lista.length ? <p className="text-sm text-text/60">Nenhum afastamento registrado.</p> : (
          <ul className="divide-y divide-border">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.colaborador}</p>
                  <p className="text-sm text-text/70">{nome(a.motivo)}</p>
                  <p className="text-xs text-text/50">{data(a.inicio)} {a.fim ? `a ${data(a.fim)}` : 'até hoje'} · {a.dias} dia(s)</p>
                  {a.pedeRetorno && (a.asoRetorno
                    ? <p className="text-sm text-success">ASO de retorno feito.</p>
                    : <p className="text-sm text-danger">{a.emAberto ? 'Na volta, faça o ASO de retorno antes de reassumir.' : 'Falta o ASO de retorno (NR-07).'}</p>)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {a.emAberto && (<>
                    <input type="date" aria-label={`Último dia afastado de ${a.colaborador}`} value={voltas[a.id] ?? ''} onChange={(e) => setVoltas({ ...voltas, [a.id]: e.target.value })}
                      className="rounded-card border border-border px-2 py-1 text-sm" />
                    <Botao variante="secundario" onClick={() => voltas[a.id] ? agir(() => encerrarAfastamento(empresaId, a.id, voltas[a.id]), 'Volta registrada.') : avisar('erro', 'Escolha o último dia afastado.')}>Registrar volta</Botao>
                  </>)}
                  <button className="text-sm text-danger underline" onClick={() => confirm('Apagar este afastamento?') && agir(() => removerAfastamento(empresaId, a.id), 'Afastamento apagado.')}>Apagar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
