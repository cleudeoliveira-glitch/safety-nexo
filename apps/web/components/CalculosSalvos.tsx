'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { calculos, CalculoSalvo, Empresa, LinhaCalculo, salvarArquivo, TipoCalculo } from '@/lib/api';
import { empresasDaConta, escolherFoco, salvarFoco } from '@/lib/empresaFoco';
import { lerToken } from '@/lib/sessao';

// Guardar o resultado das calculadoras na empresa e baixar a memória de cálculo em PDF.

export const NOME_CALCULO: Record<TipoCalculo, string> = {
  CIPA: 'CIPA', SESMT: 'SESMT', BRIGADA: 'Brigada de incêndio', RUIDO: 'Dose de ruído', CALOR: 'Calor (IBUTG)', TAXAS: 'Taxas de acidente',
};

type Contexto = { empresas: Empresa[]; empresaId: string; escolher: (id: string) => void; versao: number; salvou: () => void };
const Ctx = createContext<Contexto | null>(null);

export function ProvedorCalculos({ children }: { children: React.ReactNode }) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (!lerToken()) return;
    empresasDaConta().then((l) => { setEmpresas(l); setEmpresaId(escolherFoco(l)); }).catch(() => setEmpresas([]));
  }, []);
  const escolher = useCallback((id: string) => { setEmpresaId(id); salvarFoco(id); }, []);
  const salvou = useCallback(() => setVersao((v) => v + 1), []);
  // Sem login ou sem empresa, as calculadoras funcionam do mesmo jeito; só não aparece o "Salvar".
  return <Ctx.Provider value={empresas.length ? { empresas, empresaId, escolher, versao, salvou } : null}>{children}</Ctx.Provider>;
}

const caixa = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';

function EscolherEmpresa({ ctx, id }: { ctx: Contexto; id: string }) {
  if (ctx.empresas.length < 2) return null;
  return (
    <Selecao id={id} rotulo="Empresa" value={ctx.empresaId} onChange={(e) => ctx.escolher(e.target.value)}>
      {ctx.empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
    </Selecao>
  );
}

export function SalvarCalculo({ tipo, entradas, resultado, conclusao, tituloSugerido }: {
  tipo: TipoCalculo; entradas: LinhaCalculo[]; resultado: LinhaCalculo[]; conclusao?: string; tituloSugerido: string;
}) {
  const ctx = useContext(Ctx);
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState(tituloSugerido);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  if (!ctx) return null;
  const empresa = ctx.empresas.find((e) => e.id === ctx.empresaId);

  async function salvar() {
    if (!ctx) return;
    setSalvando(true);
    try {
      await calculos.criar(ctx.empresaId, { tipo, titulo: titulo.trim(), entradas, resultado, ...(conclusao ? { conclusao } : {}), ...(observacao.trim() ? { observacao: observacao.trim() } : {}) });
      setAviso({ tipo: 'ok', texto: `Salvo em ${empresa?.razaoSocial ?? 'empresa'}. Está lá embaixo, em "Cálculos salvos", com o PDF da memória de cálculo.` });
      setAberto(false);
      setObservacao('');
      ctx.salvou();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {aviso && <div className="mb-3"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      {!aberto ? (
        <Botao variante="secundario" onClick={() => { setTitulo(tituloSugerido); setAviso(null); setAberto(true); }}>Salvar na empresa</Botao>
      ) : (
        <div className="space-y-3 rounded-card border border-primary/30 bg-primary/5 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id={`calc-titulo-${tipo}`} rotulo="Nome do cálculo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Ruído na prensa 2" />
            <EscolherEmpresa ctx={ctx} id={`calc-empresa-${tipo}`} />
          </div>
          <div>
            <label htmlFor={`calc-obs-${tipo}`} className="mb-1 block text-sm font-semibold">Observações (opcional)</label>
            <textarea id={`calc-obs-${tipo}`} rows={2} className={caixa} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: Medição feita com dosímetro calibrado, no turno da manhã." />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Botao variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
            <Botao onClick={salvar} disabled={salvando || titulo.trim().length < 2}>{salvando ? 'Salvando…' : `Salvar${empresa && ctx.empresas.length > 1 ? '' : ` em ${empresa?.razaoSocial ?? 'empresa'}`}`}</Botao>
          </div>
        </div>
      )}
    </div>
  );
}

export function ListaCalculosSalvos() {
  const ctx = useContext(Ctx);
  const [lista, setLista] = useState<CalculoSalvo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const empresaId = ctx?.empresaId ?? '';
  const versao = ctx?.versao ?? 0;
  const carregar = useCallback(() => {
    if (!empresaId) return;
    calculos.listar(empresaId).then((l) => { setLista(l); setErro(null); }).catch((e: Error) => setErro(e.message));
  }, [empresaId]);
  useEffect(() => { carregar(); }, [carregar, versao]);
  if (!ctx) return null;
  const empresa = ctx.empresas.find((e) => e.id === empresaId);

  async function baixar(c: CalculoSalvo) {
    try { salvarArquivo(await calculos.pdf(empresaId, c.id), `Memoria-de-calculo-${NOME_CALCULO[c.tipo].replace(/\W+/g, '-')}.pdf`); } catch (e) { setErro((e as Error).message); }
  }
  async function excluir(c: CalculoSalvo) {
    if (!window.confirm(`Excluir o cálculo "${c.titulo}"?`)) return;
    try { await calculos.excluir(empresaId, c.id); carregar(); } catch (e) { setErro((e as Error).message); }
  }

  return (
    <Cartao titulo="Cálculos salvos" id="salvos">
      <div className="mb-3 max-w-md"><EscolherEmpresa ctx={ctx} id="calc-lista-empresa" /></div>
      {erro && <div className="mb-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      {lista === null ? <p className="text-sm text-text/60">Carregando…</p> : lista.length === 0 ? (
        <p className="text-sm text-text/60">Nenhum cálculo salvo em {empresa?.razaoSocial ?? 'esta empresa'} ainda. Faça uma conta acima e toque em &quot;Salvar na empresa&quot;.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {lista.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <strong>{c.titulo}</strong>
                <span className="text-text/60"> · {NOME_CALCULO[c.tipo]} · {new Date(c.criadoEm).toLocaleDateString('pt-BR')} · {c.resultado[0] ? `${c.resultado[0].rotulo}: ${c.resultado[0].valor}` : ''}</span>
              </span>
              <span className="flex gap-2">
                <Botao variante="secundario" onClick={() => baixar(c)}>Baixar PDF</Botao>
                <button type="button" className="text-sm text-danger hover:underline" onClick={() => excluir(c)}>Excluir</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
