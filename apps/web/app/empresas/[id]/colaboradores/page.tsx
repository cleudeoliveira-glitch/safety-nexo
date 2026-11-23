'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  buscarEmpresa,
  CATEGORIAS_CNH,
  ColaboradorComSituacao,
  criarColaborador,
  Empresa,
  Ghe,
  listarColaboradoresComSituacao,
  listarGhes,
} from '@/lib/api';

const data = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const DIA_MS = 86_400_000;
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Situacao = { texto: string; cor: string };

// Situação do ASO pelo próximo exame do último atestado.
function situacaoAso(c: ColaboradorComSituacao): Situacao {
  if (!c.ultimoAso) return { texto: 'Sem ASO', cor: 'bg-warning/15 text-[#c2410c]' };
  const proximo = c.ultimoAso.proximoExame;
  if (!proximo) return { texto: 'ASO em dia', cor: 'bg-success/10 text-success' };
  const dias = Math.ceil((new Date(proximo).getTime() - Date.now()) / DIA_MS);
  if (dias < 0) return { texto: 'ASO vencido', cor: 'bg-danger/10 text-danger' };
  if (dias <= 30) return { texto: `ASO vence em ${dias} dia(s)`, cor: 'bg-warning/15 text-[#c2410c]' };
  return { texto: 'ASO em dia', cor: 'bg-success/10 text-success' };
}

function situacaoEpi(c: ColaboradorComSituacao): Situacao {
  if (!c.episEmUso) return { texto: 'Sem EPI entregue', cor: 'bg-text/5 text-text/60' };
  if (c.caVencido) return { texto: `${c.caVencido} EPI com CA vencido`, cor: 'bg-danger/10 text-danger' };
  return { texto: 'EPI em dia', cor: 'bg-success/10 text-success' };
}

const Selo = ({ s }: { s: Situacao }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cor}`}>{s.texto}</span>;

export default function ColaboradoresPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [lista, setLista] = useState<ColaboradorComSituacao[] | null>(null);
  const [busca, setBusca] = useState('');
  useEffect(() => { const b = new URLSearchParams(window.location.search).get('busca'); if (b) setBusca(b); }, []); // vindo da busca geral
  const [filtro, setFiltro] = useState<'ativos' | 'pendentes' | 'sairam' | 'todos'>('ativos');
  const [novoAberto, setNovoAberto] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, g, c] = await Promise.all([buscarEmpresa(empresaId), listarGhes(empresaId), listarColaboradoresComSituacao(empresaId)]);
      setEmpresa(e);
      setGhes(g);
      setLista(c);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);
  useEffect(() => { recarregar(); }, [recarregar]);

  const nomeGhe = useMemo(() => new Map(ghes.map((g) => [g.id, g.nome])), [ghes]);
  const pendente = (c: ColaboradorComSituacao) => !c.gheId || situacaoAso(c).texto !== 'ASO em dia' || c.caVencido > 0;

  const visiveis = useMemo(() => {
    if (!lista) return [];
    const termo = semAcento(busca.trim());
    return lista
      .filter((c) => {
        if (filtro === 'ativos' && c.dataDesligamento) return false;
        if (filtro === 'sairam' && !c.dataDesligamento) return false;
        if (filtro === 'pendentes' && (c.dataDesligamento || !pendente(c))) return false;
        if (!termo) return true;
        return [c.nome, c.cargo, c.cpf ?? '', c.matricula ?? '', nomeGhe.get(c.gheId ?? '') ?? ''].some((v) => semAcento(v).includes(termo));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, busca, filtro, nomeGhe]);

  if (!empresa || !lista) {
    return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando colaboradores…'}</main>;
  }

  const ativos = lista.filter((c) => !c.dataDesligamento);
  const comPendencia = ativos.filter(pendente).length;
  const texto = (d: FormData, campo: string) => String(d.get(campo) ?? '').trim();

  async function cadastrar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const d = new FormData(form);
    try {
      await criarColaborador(empresaId, {
        nome: texto(d, 'nome'),
        cpf: texto(d, 'cpf') || null,
        dataAdmissao: texto(d, 'dataAdmissao') || null,
        cargo: texto(d, 'cargo'),
        cbo: texto(d, 'cbo') || null,
        gheId: texto(d, 'gheId') || null,
        matricula: texto(d, 'matricula') || null,
        ...(texto(d, 'cnhCategoria') ? { cnhCategoria: texto(d, 'cnhCategoria') } : {}),
        ...(texto(d, 'cnhValidade') ? { cnhValidade: texto(d, 'cnhValidade') } : {}),
      });
      form.reset();
      setAviso({ tipo: 'ok', texto: `${texto(d, 'nome')} cadastrado(a). Abra a ficha para registrar ASO e EPI.` });
      await recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">← Voltar</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-primary">Colaboradores</h1>
            <p className="text-text/60">
              {empresa.razaoSocial} · {ativos.length} ativo(s)
              {comPendencia > 0 ? ` · ${comPendencia} com alguma pendência` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/empresas/${empresaId}/conectores#rh`} className="rounded-card border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">Importar do RH</Link>
            <Botao onClick={() => setNovoAberto((v) => !v)}>{novoAberto ? 'Fechar cadastro' : '+ Novo colaborador'}</Botao>
          </div>
        </div>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {novoAberto && (
        <Cartao titulo="Novo colaborador">
          <form className="grid gap-4 md:grid-cols-3" onSubmit={cadastrar}>
            <Campo id="colab-nome" name="nome" rotulo="Nome" required placeholder="Ex.: Maria Silva" />
            <Campo id="colab-cpf" name="cpf" rotulo="CPF" placeholder="Ex.: 123.456.789-00" />
            <Campo id="colab-cargo" name="cargo" rotulo="Cargo" required placeholder="Ex.: Padeira" />
            <Campo id="colab-admissao" name="dataAdmissao" type="date" rotulo="Admissão" />
            <Campo id="colab-cbo" name="cbo" rotulo="CBO" placeholder="Ex.: 8483-05" />
            <Campo id="colab-matricula" name="matricula" rotulo="Matrícula no eSocial" placeholder="Ex.: 000123" />
            <Selecao id="colab-ghe" name="gheId" rotulo="GHE">
              <option value="">Pela função (ou sem GHE)</option>
              {ghes.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </Selecao>
            <Selecao id="colab-cnh" name="cnhCategoria" rotulo="CNH (se dirige pela empresa)"
              ajuda={{ oQueE: 'Motorista com CNH C, D ou E precisa do exame toxicológico, que vai para o eSocial (S-2221).', baseLegal: 'CLT, art. 168, §6º' }}>
              <option value="">Não dirige</option>
              {CATEGORIAS_CNH.map((c) => <option key={c} value={c}>Categoria {c}</option>)}
            </Selecao>
            <Campo id="colab-cnh-validade" name="cnhValidade" type="date" rotulo="Validade da CNH" />
            <div className="flex justify-end md:col-span-3"><Botao type="submit">Cadastrar</Botao></div>
          </form>
        </Cartao>
      )}

      <Cartao titulo="Lista de colaboradores">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Campo id="busca-colab" rotulo="Procurar" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, cargo, CPF, matrícula ou GHE" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
            {([['ativos', 'Ativos'], ['pendentes', 'Com pendência'], ['sairam', 'Saíram'], ['todos', 'Todos']] as const).map(([v, n]) => (
              <button key={v} type="button" onClick={() => setFiltro(v)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filtro === v ? 'bg-primary text-white' : 'border border-border text-text/70 hover:border-primary'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-text/60">Ninguém cadastrado ainda. Use &quot;+ Novo colaborador&quot; ou traga a lista do RH.</p>
        ) : visiveis.length === 0 ? (
          <p className="text-sm text-text/60">Nenhum colaborador encontrado com esse filtro.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {visiveis.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-48 flex-1">
                  <Link href={`/empresas/${empresaId}/colaboradores/${c.id}`} className={`font-semibold hover:underline ${c.dataDesligamento ? 'text-text/50' : 'text-primary'}`}>{c.nome}</Link>
                  <p className="text-text/60">
                    {c.cargo} · <span className={c.gheId ? '' : 'text-warning'}>{nomeGhe.get(c.gheId ?? '') ?? 'Sem GHE'}</span>
                    {c.dataAdmissao ? ` · desde ${data(c.dataAdmissao)}` : ''}
                    {c.cnhCategoria ? ` · CNH ${c.cnhCategoria}` : ''}
                    {c.dataDesligamento ? ` · saiu em ${data(c.dataDesligamento)}` : ''}
                  </p>
                </div>
                {!c.dataDesligamento && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Selo s={situacaoAso(c)} />
                    <Selo s={situacaoEpi(c)} />
                  </div>
                )}
                <Link href={`/empresas/${empresaId}/colaboradores/${c.id}`} className="font-semibold text-primary hover:underline">Abrir ficha →</Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
