'use client';

import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { EleicaoCipa, ReuniaoCipa, reunioesCipa, salvarArquivo } from '@/lib/api';

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const caixa = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';

type Linha = { acao: string; responsavel: string; prazo: string };
const linhaVazia = (): Linha => ({ acao: '', responsavel: '', prazo: '' });

// Membros atuais da CIPA (eleitos e indicados), com o papel de cada um, para marcar presença.
function membrosDa(eleicao: EleicaoCipa | null) {
  if (!eleicao) return [];
  const indicados = eleicao.indicados.map((m) => `${m.nome} (${m.presidente ? 'presidente' : m.titular ? 'titular' : 'suplente'}, organização)`);
  const eleitos = eleicao.candidatos
    .filter((c) => c.situacao !== 'NAO_ELEITO')
    .map((c) => `${c.nome} (${c.vice ? 'vice-presidente' : c.situacao === 'TITULAR' ? 'titular' : 'suplente'}, empregados)`);
  return [...indicados, ...eleitos];
}

// Reuniões mensais da CIPA (NR-05, 5.6) com ata em PDF.
export function ReunioesCipa({ empresaId, eleicao }: { empresaId: string; eleicao: EleicaoCipa | null }) {
  const [reunioes, setReunioes] = useState<ReuniaoCipa[] | null>(null);
  const [dias, setDias] = useState<number | null>(null);
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const membros = membrosDa(eleicao);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [outros, setOutros] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia()]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await reunioesCipa.listar(empresaId);
      setReunioes(r.reunioes);
      setDias(r.diasDesdeUltimaOrdinaria);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);
  useEffect(() => { carregar(); }, [carregar]);

  function abrir() {
    setMarcados(new Set(membros));
    setOutros('');
    setLinhas([linhaVazia()]);
    setAberto(true);
  }

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const d = new FormData(form);
    const t = (k: string) => String(d.get(k) ?? '').trim();
    const presentes = [...membros.filter((m) => marcados.has(m)), ...outros.split('\n').map((x) => x.trim()).filter(Boolean)];
    if (!presentes.length) return setAviso({ tipo: 'erro', texto: 'Marque quem participou da reunião.' });
    setSalvando(true);
    try {
      const r = await reunioesCipa.criar(empresaId, {
        tipo: t('tipo'), data: t('data'), ...(t('horario') ? { horario: t('horario') } : {}), local: t('local'), presentes,
        pauta: t('pauta'), discussao: t('discussao'),
        encaminhamentos: linhas.filter((l) => l.acao.trim()).map((l) => ({ acao: l.acao.trim(), ...(l.responsavel.trim() ? { responsavel: l.responsavel.trim() } : {}), ...(l.prazo ? { prazo: l.prazo } : {}) })),
      });
      setAberto(false);
      setAviso({ tipo: 'ok', texto: `Ata da ${r.numero}ª reunião salva. Baixe o PDF para colher as assinaturas.` });
      await carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  async function baixar(r: ReuniaoCipa) {
    try {
      salvarArquivo(await reunioesCipa.pdf(empresaId, r.id), `Ata-reuniao-CIPA-${String(r.numero).padStart(3, '0')}.pdf`);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  async function excluir(r: ReuniaoCipa) {
    if (!confirm(`Excluir a ata da ${r.numero}ª reunião (${data(r.data)})?`)) return;
    try {
      await reunioesCipa.excluir(empresaId, r.id);
      setAviso({ tipo: 'ok', texto: 'Ata excluída.' });
      await carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  return (
    <Cartao titulo="Reuniões e atas da CIPA" id="reunioes" acao={!aberto && <Botao onClick={abrir}>+ Registrar reunião</Botao>}>
      <p className="mb-3 text-sm text-text/70">A CIPA se reúne todo mês, em horário de trabalho, e cada reunião tem ata assinada pelos presentes (NR-05, 5.6).
        Reunião extraordinária acontece quando há acidente grave ou fatal, ou quando uma das representações pede.</p>
      {aviso && <div className="mb-3"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      {dias !== null && dias > 35 && (
        <div className="mb-3"><Aviso tipo="erro">A última reunião ordinária foi há {dias} dias. A reunião deste mês está atrasada.</Aviso></div>
      )}

      {aberto && (
        <form className="mb-5 space-y-4 rounded-card border border-primary/30 bg-primary/5 p-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-4">
            <Selecao id="reu-tipo" name="tipo" rotulo="Tipo" required>
              <option value="ORDINARIA">Ordinária</option>
              <option value="EXTRAORDINARIA">Extraordinária</option>
            </Selecao>
            <Campo id="reu-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="reu-horario" name="horario" rotulo="Horário" placeholder="Ex.: 14h" />
            <Campo id="reu-local" name="local" rotulo="Local" required placeholder="Ex.: Sala de reuniões" />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Quem participou</legend>
            {membros.length > 0 ? (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {membros.map((m) => (
                  <label key={m} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="checkbox" className="h-6 w-6 shrink-0 accent-primary" checked={marcados.has(m)}
                      onChange={(e) => setMarcados((x) => { const n = new Set(x); if (e.target.checked) n.add(m); else n.delete(m); return n; })} />
                    {m}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text/60">Os membros aparecem aqui depois da eleição registrada nesta página. Por enquanto, escreva os nomes abaixo.</p>
            )}
            <label htmlFor="reu-outros" className="mt-3 block text-sm">Outros presentes ou convidados (um por linha)</label>
            <textarea id="reu-outros" rows={2} className={caixa} value={outros} onChange={(e) => setOutros(e.target.value)} placeholder={'Ex.: Ana Lima (técnica de segurança)'} />
          </fieldset>

          <div>
            <label htmlFor="reu-pauta" className="mb-1 block text-sm font-semibold">Pauta</label>
            <textarea id="reu-pauta" name="pauta" required rows={3} className={caixa} placeholder={'Ex.: Leitura da ata anterior\nAcidentes e quase acidentes do mês\nAndamento do plano de trabalho'} />
          </div>
          <div>
            <label htmlFor="reu-discussao" className="mb-1 block text-sm font-semibold">O que foi tratado</label>
            <textarea id="reu-discussao" name="discussao" required rows={5} className={caixa} placeholder="Escreva os assuntos discutidos e o que ficou decidido." />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold">Encaminhamentos (o que ficou combinado)</p>
            <div className="space-y-2">
              {linhas.map((l, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[1fr_200px_160px_auto]">
                  <input aria-label="O que fazer" className={caixa} value={l.acao} placeholder="Ex.: Trocar a fiação da bancada 2"
                    onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, acao: e.target.value } : x)))} />
                  <input aria-label="Responsável" className={caixa} value={l.responsavel} placeholder="Responsável"
                    onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, responsavel: e.target.value } : x)))} />
                  <input aria-label="Prazo" type="date" className={caixa} value={l.prazo}
                    onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, prazo: e.target.value } : x)))} />
                  <button type="button" className="text-sm text-danger" onClick={() => setLinhas(linhas.length > 1 ? linhas.filter((_, j) => j !== i) : [linhaVazia()])}>Tirar</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => setLinhas([...linhas, linhaVazia()])}>+ Mais um encaminhamento</button>
          </div>

          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
            <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar ata'}</Botao>
          </div>
        </form>
      )}

      {reunioes === null ? (
        <p className="text-sm text-text/60">Carregando…</p>
      ) : reunioes.length === 0 ? (
        <p className="text-sm text-text/60">Nenhuma reunião registrada ainda.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {reunioes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <strong>{r.numero}ª reunião {r.tipo === 'EXTRAORDINARIA' ? 'extraordinária' : 'ordinária'}</strong> · {data(r.data)}
                <span className="text-text/60"> · {r.presentes.length} presente(s){r.encaminhamentos.length ? ` · ${r.encaminhamentos.length} encaminhamento(s)` : ''}</span>
              </span>
              <span className="flex gap-2">
                <Botao variante="secundario" onClick={() => baixar(r)}>Baixar ata</Botao>
                <button type="button" className="text-sm text-danger hover:underline" onClick={() => excluir(r)}>Excluir</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
