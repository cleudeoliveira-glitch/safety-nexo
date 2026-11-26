'use client';

import { grau5, SEVERIDADES } from '@/lib/matriz';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, EscolherArquivo, Cartao } from '@/components/ui';
import { buscarEmpresa, Empresa, importarPdf, Leitura, RiscoImportar, TipoRisco } from '@/lib/api';

const TIPOS: [TipoRisco, string][] = [['FISICO', 'Físico'], ['QUIMICO', 'Químico'], ['BIOLOGICO', 'Biológico'], ['ERGONOMICO', 'Ergonômico'], ['ACIDENTE', 'Acidente']];
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const STATUS: Record<Leitura['status'], string> = { LENDO: 'Lendo…', PRONTO: 'Pronto para conferir', ERRO: 'Não deu certo', IMPORTADO: 'Importado' };

type RiscoEd = Omit<RiscoImportar, 'severidade'> & { severidade: RiscoImportar['severidade'] | ''; usar: boolean; pagina: number | null };
type GheEd = { nome: string; descricao: string; usar: boolean; riscos: RiscoEd[] };
const entrada = 'w-full rounded border border-border px-2 py-1 text-sm';
const cor = (falta: boolean) => (falta ? 'bg-warning/25 border-warning' : 'bg-white');
const riscoVazio = (): RiscoEd => ({ tipo: 'ACIDENTE', agente: '', fonteGeradora: '', medidasControle: '', severidade: '', intensidade: '', limiteTolerancia: '', usar: true, pagina: null });

export default function ImportarPdfPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [iaLigada, setIaLigada] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Leitura[]>([]);
  const [aberta, setAberta] = useState<(Leitura & { ghesExistentes: string[] }) | null>(null);
  const [ghes, setGhes] = useState<GheEd[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok' | 'info'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [e, s, l] = await Promise.all([buscarEmpresa(empresaId), importarPdf.situacao(empresaId), importarPdf.listar(empresaId)]);
      setEmpresa(e); setIaLigada(s.iaLigada); setLista(l);
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => { carregar(); }, [carregar]);
  // Enquanto alguma leitura estiver em andamento, confere de novo a cada 4 segundos.
  useEffect(() => {
    if (!lista.some((l) => l.status === 'LENDO')) return;
    const t = setTimeout(() => importarPdf.listar(empresaId).then(setLista).catch(() => undefined), 4000);
    return () => clearTimeout(t);
  }, [lista, empresaId]);

  async function abrir(id: string) {
    try {
      const l = await importarPdf.obter(empresaId, id); setAberta(l);
      setGhes((l.resultado?.ghes ?? []).map((g) => ({
        nome: g.nome, usar: true,
        descricao: [g.descricao, g.cargos.length ? `Cargos: ${g.cargos.join(', ')}` : '', g.trabalhadores ? `${g.trabalhadores} trabalhador(es) no documento original` : ''].filter(Boolean).join('. '),
        riscos: g.riscos.map((r) => ({ tipo: r.tipo, agente: r.agente, fonteGeradora: r.fonteGeradora ?? '', medidasControle: r.medidasControle ?? '', severidade: r.severidade ? grau5(r.severidade) : '', intensidade: r.intensidade ?? '', limiteTolerancia: r.limiteTolerancia ?? '', usar: true, pagina: r.pagina })),
      })));
      setTimeout(() => document.getElementById('conferir')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  const mudarGhe = (i: number, d: Partial<GheEd>) => setGhes(ghes.map((g, j) => (j === i ? { ...g, ...d } : g)));
  const mudarRisco = (i: number, k: number, d: Partial<RiscoEd>) => setGhes(ghes.map((g, j) => (j === i ? { ...g, riscos: g.riscos.map((r, m) => (m === k ? { ...r, ...d } : r)) } : g)));

  async function importar() {
    if (!aberta) return;
    const escolhidos = ghes.filter((g) => g.usar);
    if (escolhidos.some((g) => g.nome.trim().length < 2)) { setAviso({ tipo: 'erro', texto: 'Todo GHE precisa de nome.' }); return; }
    const faltando = escolhidos.flatMap((g) => g.riscos.filter((r) => r.usar && (r.agente.trim().length < 2 || !r.fonteGeradora.trim() || !r.severidade)).map((r) => `${g.nome}: ${r.agente || 'risco sem nome'}`));
    if (faltando.length) { setAviso({ tipo: 'erro', texto: `Preencha o agente, a fonte geradora e a severidade de: ${faltando.join('; ')}. Ou desmarque esses riscos.` }); return; }
    try {
      const r = await importarPdf.importar(empresaId, aberta.id, escolhidos.map((g) => ({
        nome: g.nome, descricao: g.descricao || undefined,
        riscos: g.riscos.filter((x) => x.usar).map((x) => ({ tipo: x.tipo, agente: x.agente, fonteGeradora: x.fonteGeradora, medidasControle: x.medidasControle || undefined, severidade: x.severidade as RiscoImportar['severidade'], intensidade: x.intensidade || undefined, limiteTolerancia: x.limiteTolerancia || undefined })),
      })));
      setAviso({ tipo: 'ok', texto: `Importado: ${r.novosGhes} GHE(s) novo(s) e ${r.novosRiscos} risco(s).${r.repetidos ? ` ${r.repetidos} risco(s) já existiam e ficaram como estavam.` : ''}` });
      setAberta(null); await carregar(); window.scrollTo(0, 0);
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const doc = aberta?.resultado;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">← Voltar</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Trazer PGR ou laudo antigo</h1>
        <p className="text-text/60">{empresa.razaoSocial} · o sistema lê o PDF e separa os GHEs e os riscos. Você confere tudo antes de entrar no sistema.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Cartao titulo="Enviar documento">
        <p className="mb-3 text-sm text-text/60">PGR, PPRA, LTCAT ou inventário de riscos em PDF, até 20 MB. Uma cópia fica no arquivo de documentos.</p>
        <form className="flex flex-wrap items-center gap-3" onSubmit={async (ev) => {
          ev.preventDefault();
          const modo = ((ev.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'ia' ? 'ia' : 'gratis';
          const f = new FormData(ev.currentTarget).get('arquivo');
          if (!(f instanceof File) || !f.size) { setAviso({ tipo: 'erro', texto: 'Escolha o PDF.' }); return; }
          setEnviando(true);
          try {
            await importarPdf.enviar(empresaId, f, modo);
            setAviso({ tipo: 'info', texto: modo === 'ia' ? 'Recebido. A IA está lendo; pode sair desta tela e voltar depois.' : 'Recebido. Lendo o documento; em poucos segundos aparece em Leituras.' });
            (ev.target as HTMLFormElement).reset(); await carregar();
          } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } finally { setEnviando(false); }
        }}>
          <EscolherArquivo name="arquivo" accept="application/pdf,.pdf" aria-label="PDF" />
          <Botao type="submit" value="gratis" disabled={enviando}>{enviando ? 'Enviando…' : 'Ler grátis'}</Botao>
          {iaLigada && <Botao type="submit" value="ia" variante="secundario" disabled={enviando}>Ler com IA</Botao>}
        </form>
        <p className="mt-3 text-xs text-text/60">
          A leitura grátis acha os GHEs e os riscos pelos nomes dos campos do documento. Ela não lê PDF escaneado (foto do papel): nesse caso, digite à mão.
          {iaLigada === false && ' A leitura com IA, que entende qualquer modelo e PDF escaneado, está desligada porque tem custo por uso.'}
        </p>
        <div className="mt-3 border-t border-border pt-3">
          <Botao variante="secundario" onClick={async () => {
            try { const l = await importarPdf.manual(empresaId); await carregar(); await abrir(l.id); }
            catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
          }}>Digitar à mão, sem PDF</Botao>
        </div>
      </Cartao>

      {lista.length > 0 && (
        <Cartao titulo="Leituras">
          <ul className="divide-y divide-border text-sm">
            {lista.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">{l.nomeArquivo}</p>
                  <p className="text-xs text-text/60">{quando(l.createdAt)} · {l.criadoPorNome} · <span className={l.status === 'ERRO' ? 'text-danger' : l.status === 'PRONTO' ? 'text-success' : ''}>{STATUS[l.status]}</span>{l.erro ? `: ${l.erro}` : ''}</p>
                </div>
                <div className="flex gap-3">
                  {l.status === 'PRONTO' && <Botao variante="secundario" onClick={() => abrir(l.id)}>Conferir</Botao>}
                  {(l.status !== 'LENDO' || Date.now() - new Date(l.createdAt).getTime() > 5 * 60_000) && excluindo !== l.id && <button className="text-danger underline" onClick={() => setExcluindo(l.id)}>Excluir</button>}
                </div>
                {excluindo === l.id && (
                  <ExcluirLeitura leitura={l} cancelar={() => setExcluindo(null)} excluir={async (levarCadastro) => {
                    try {
                      const r = await importarPdf.remover(empresaId, l.id, levarCadastro);
                      setExcluindo(null);
                      if (aberta?.id === l.id) setAberta(null);
                      setAviso({ tipo: 'ok', texto: levarCadastro ? `PGR antigo excluído, com ${r.riscos} risco(s) e ${r.ghes} GHE(s) que vieram dele.` : 'PGR antigo excluído. Os GHEs e riscos que já estavam no cadastro continuam.' });
                      await carregar();
                    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
                  }} />
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {aberta && doc && (
        <div id="conferir" className="space-y-4">
          <Cartao titulo={`Conferir: ${aberta.nomeArquivo}`}>
            <p className="text-sm">{[doc.tipoDocumento, doc.empresa, doc.cnpj, doc.dataElaboracao && `elaborado em ${doc.dataElaboracao}`, doc.responsavelTecnico && `por ${doc.responsavelTecnico}`].filter(Boolean).join(' · ') || 'O documento não informa empresa nem data.'}</p>
            {doc.cnpj && empresa.cnpj && doc.cnpj.replace(/\D/g, '') !== empresa.cnpj.replace(/\D/g, '') && <p className="mt-2 text-sm text-danger">Atenção: o CNPJ do documento ({doc.cnpj}) é diferente do desta empresa ({empresa.cnpj}).</p>}
            {doc.avisos.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-warning">{doc.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}
            <p className="mt-3 text-xs text-text/60">O sistema copia só o que achou escrito. Campos em amarelo não foram achados: preencha ou desmarque o risco. Confira tudo com o original antes de importar.</p>
            {!ghes.length && <p className="mt-3 text-sm">Nenhum GHE por enquanto. Use &quot;Adicionar GHE&quot; para digitar.</p>}
          </Cartao>

          {ghes.map((g, i) => {
            const existe = aberta.ghesExistentes.some((n) => n.trim().toLowerCase() === g.nome.trim().toLowerCase());
            return (
              <Cartao key={i} titulo={`GHE: ${g.nome || 'sem nome'}`} acao={
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={g.usar} onChange={(e) => mudarGhe(i, { usar: e.target.checked })} aria-label={`Importar GHE ${g.nome}`} />Importar</label>}>
                <div className={g.usar ? '' : 'opacity-50'}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-semibold">Nome<input className={`${entrada} ${cor(false)} mt-1`} value={g.nome} onChange={(e) => mudarGhe(i, { nome: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Descrição<input className={`${entrada} ${cor(false)} mt-1`} value={g.descricao} onChange={(e) => mudarGhe(i, { descricao: e.target.value })} /></label>
                  </div>
                  {existe && <p className="mt-2 text-xs text-primary">Já existe um GHE com este nome: os riscos novos entram nele, os repetidos ficam como estão.</p>}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[1150px] text-sm">
                      <thead><tr className="text-left text-xs text-text/60"><th className="w-8" /><th>Tipo</th><th>Agente</th><th>Fonte geradora</th><th>Medidas e EPIs</th><th>Severidade</th><th>Medição</th><th>Limite</th><th>Pág.</th></tr></thead>
                      <tbody>
                        {g.riscos.map((r, k) => (
                          <tr key={k} className={`align-top ${r.usar ? '' : 'opacity-40'}`}>
                            <td className="py-1"><input type="checkbox" checked={r.usar} onChange={(e) => mudarRisco(i, k, { usar: e.target.checked })} aria-label={`Importar risco ${r.agente}`} /></td>
                            <td className="p-1"><select className={`${entrada} ${cor(false)} min-w-[110px]`} value={r.tipo} onChange={(e) => mudarRisco(i, k, { tipo: e.target.value as TipoRisco })}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></td>
                            <td className="p-1"><input className={`${entrada} ${cor(!r.agente.trim())}`} value={r.agente} placeholder="Ex.: Ruído" onChange={(e) => mudarRisco(i, k, { agente: e.target.value })} /></td>
                            <td className="p-1"><input className={`${entrada} ${cor(!r.fonteGeradora.trim())}`} value={r.fonteGeradora} placeholder="O que gera o risco" onChange={(e) => mudarRisco(i, k, { fonteGeradora: e.target.value })} /></td>
                            <td className="p-1"><input className={`${entrada} ${cor(false)}`} value={r.medidasControle} onChange={(e) => mudarRisco(i, k, { medidasControle: e.target.value })} /></td>
                            <td className="p-1"><select className={`${entrada} ${cor(!r.severidade)}`} value={r.severidade} onChange={(e) => mudarRisco(i, k, { severidade: e.target.value as RiscoEd['severidade'] })} aria-label={`Severidade de ${r.agente}`}><option value="">Escolha</option>{SEVERIDADES.map(([v, n]) => <option key={v} value={v}>{v} · {n}</option>)}</select></td>
                            <td className="p-1"><input className={`${entrada} ${cor(false)}`} value={r.intensidade} onChange={(e) => mudarRisco(i, k, { intensidade: e.target.value })} /></td>
                            <td className="p-1"><input className={`${entrada} ${cor(false)}`} value={r.limiteTolerancia} onChange={(e) => mudarRisco(i, k, { limiteTolerancia: e.target.value })} /></td>
                            <td className="p-1 text-xs text-text/60">{r.pagina ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="mt-2 min-h-[44px] text-sm font-semibold text-primary hover:underline" onClick={() => mudarGhe(i, { riscos: [...g.riscos, riscoVazio()] })}>+ Adicionar risco</button>
                </div>
              </Cartao>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Botao variante="secundario" onClick={() => setGhes([...ghes, { nome: `GHE ${String(ghes.length + 1).padStart(2, '0')}`, descricao: '', usar: true, riscos: [riscoVazio()] }])}>+ Adicionar GHE</Botao>
            <div className="flex flex-wrap gap-3">
              <Botao variante="secundario" onClick={() => setAberta(null)}>Fechar</Botao>
              {ghes.length > 0 && <Botao onClick={importar}>Importar para a empresa</Botao>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Excluir o PGR antigo: diz o que sai e deixa escolher se os GHEs e riscos que vieram dele saem junto.
function ExcluirLeitura({ leitura, cancelar, excluir }: { leitura: Leitura; cancelar: () => void; excluir: (levarCadastro: boolean) => Promise<void> }) {
  const criados = (leitura.resultado as { criados?: { ghes?: string[]; riscos?: string[] } } | null)?.criados;
  const nRiscos = criados?.riscos?.length ?? 0;
  const nGhes = criados?.ghes?.length ?? 0;
  const [levar, setLevar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  return (
    <div className="w-full rounded-card border border-danger/40 bg-danger/5 p-3 text-sm">
      <p className="font-semibold text-danger">Excluir &quot;{leitura.nomeArquivo}&quot;?</p>
      <ul className="mt-1 list-disc pl-5 text-text/80">
        <li>Sai a leitura desta lista{leitura.arquivoId ? ' e a cópia do PDF guardada no Arquivo de documentos' : ''}.</li>
        {leitura.status === 'IMPORTADO' && (nRiscos > 0 || nGhes > 0) ? (
          <li>Este PGR já foi importado: trouxe {nRiscos} risco(s){nGhes ? ` e criou ${nGhes} GHE(s)` : ''}. Você escolhe abaixo se eles ficam ou saem.</li>
        ) : leitura.status === 'IMPORTADO' ? (
          <li>Os GHEs e riscos que ele trouxe continuam no cadastro (foram importados antes desta opção existir). Se quiser tirar, exclua na aba GHEs e riscos da empresa.</li>
        ) : <li>Nada foi importado dele, então o cadastro da empresa não muda.</li>}
      </ul>
      {leitura.status === 'IMPORTADO' && (nRiscos > 0 || nGhes > 0) && (
        <label className="mt-2 flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={levar} onChange={(e) => setLevar(e.target.checked)} />
          <span>Tirar também os riscos que vieram deste PGR{nGhes ? ' e os GHEs que ele criou (o GHE só sai se ficar sem nenhum outro risco)' : ''}. Riscos que você cadastrou à mão ficam.</span>
        </label>
      )}
      <p className="mt-2 text-xs text-text/60">Isso não tem volta.</p>
      <div className="mt-2 flex gap-2">
        <Botao variante="secundario" onClick={cancelar} disabled={ocupado}>Cancelar</Botao>
        <button type="button" disabled={ocupado} className="rounded-card bg-danger px-3 py-2 font-semibold text-white disabled:opacity-50"
          onClick={async () => { setOcupado(true); try { await excluir(levar); } finally { setOcupado(false); } }}>{ocupado ? 'Excluindo…' : 'Excluir de vez'}</button>
      </div>
    </div>
  );
}
