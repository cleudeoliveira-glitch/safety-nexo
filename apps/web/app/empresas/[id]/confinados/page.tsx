'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EscolherPessoas } from '@/components/EscolherPessoas';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { rolarParaAncora } from '@/lib/abaDoEndereco';
import {
  buscarConteudoOperacao,
  buscarEmpresa,
  Colaborador,
  confinados,
  ConteudoOperacao,
  DadosEspaco,
  DadosPlanoResgate,
  Empresa,
  EspacoConfinado,
  listarColaboradores,
  PlanoResgate,
  planosResgate,
  salvarArquivo,
  TipoResgate,
} from '@/lib/api';

type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;
const caixa = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');

export default function ConfinadosPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [conteudo, setConteudo] = useState<ConteudoOperacao | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [espacos, setEspacos] = useState<EspacoConfinado[]>([]);
  const [planos, setPlanos] = useState<PlanoResgate[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const avisar: Avisar = useCallback((tipo, texto) => { setAviso({ tipo, texto }); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  const recarregar = useCallback(async () => {
    try {
      const [e, c, col, es, pl] = await Promise.all([buscarEmpresa(empresaId), buscarConteudoOperacao(), listarColaboradores(empresaId), confinados.listar(empresaId), planosResgate.listar(empresaId)]);
      setEmpresa(e); setConteudo(c); setColaboradores(col.filter((x) => !x.dataDesligamento)); setEspacos(es); setPlanos(pl);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);
  useEffect(() => { recarregar(); }, [recarregar]);

  const carregou = !!empresa;
  useEffect(() => {
    if (!carregou) return;
    const t = setTimeout(rolarParaAncora, 80);
    window.addEventListener('hashchange', rolarParaAncora);
    return () => { clearTimeout(t); window.removeEventListener('hashchange', rolarParaAncora); };
  }, [carregou]);

  if (!empresa || !conteudo) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">← Voltar</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Espaços confinados e resgate</h1>
        <p className="text-text/60">{empresa.razaoSocial}. Cadastre os espaços confinados (NR-33) e monte o plano de resgate de cada trabalho em altura ou em espaço confinado. A PT puxa os dois.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <Inventario empresaId={empresaId} conteudo={conteudo} espacos={espacos} recarregar={recarregar} avisar={avisar} />
      <Planos empresaId={empresaId} conteudo={conteudo} espacos={espacos.filter((x) => x.ativo)} planos={planos} colaboradores={colaboradores} recarregar={recarregar} avisar={avisar} />
    </main>
  );
}

// ---------- Inventário de espaços confinados
const espacoVazio = (): DadosEspaco => ({ codigo: '', nome: '', local: '', tipo: 'TANQUE', riscos: [], sinalizado: false, isolado: false, ativo: true });

function Inventario({ empresaId, conteudo, espacos, recarregar, avisar }: {
  empresaId: string; conteudo: ConteudoOperacao; espacos: EspacoConfinado[]; recarregar: () => Promise<void>; avisar: Avisar;
}) {
  const [editando, setEditando] = useState<{ id: string | null; dados: DadosEspaco } | null>(null);
  const proximoCodigo = () => `EC-${String(espacos.length + 1).padStart(2, '0')}`;

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editando) return;
    try {
      if (editando.id) await confinados.editar(empresaId, editando.id, editando.dados);
      else await confinados.criar(empresaId, editando.dados);
      avisar('ok', `${editando.dados.codigo || 'Espaço'} salvo.`);
      setEditando(null);
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  async function baixar() {
    try { salvarArquivo(await confinados.pdf(empresaId), 'Cadastro-espacos-confinados.pdf'); } catch (e) { avisar('erro', (e as Error).message); }
  }

  const mudar = (campos: Partial<DadosEspaco>) => setEditando((x) => (x ? { ...x, dados: { ...x.dados, ...campos } } : x));
  const d = editando?.dados;

  return (
    <Cartao titulo="Cadastro de espaços confinados (NR-33)" id="espacos"
      acao={<div className="flex flex-wrap gap-2">
        {espacos.some((x) => x.ativo) && <Botao variante="secundario" onClick={baixar}>Baixar cadastro em PDF</Botao>}
        {!editando && <Botao onClick={() => setEditando({ id: null, dados: { ...espacoVazio(), codigo: proximoCodigo() } })}>+ Novo espaço</Botao>}
      </div>}>
      <p className="mb-3 text-sm text-text/70">Espaço confinado é todo lugar que não foi feito para alguém ficar dentro, com entrada e saída difíceis e ventilação ruim: tanque, silo, poço, galeria, caixa de esgoto. A NR-33 pede que cada um seja identificado, sinalizado e fechado para quem não é autorizado.</p>

      {editando && d && (
        <form className="mb-5 space-y-4 rounded-card border border-primary/30 bg-primary/5 p-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-4">
            <Campo id="ec-codigo" rotulo="Código" required value={d.codigo} onChange={(e) => mudar({ codigo: e.target.value })} placeholder="EC-01" />
            <div className="md:col-span-2"><Campo id="ec-nome" rotulo="Nome" required value={d.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Ex.: Caixa d'água do galpão" /></div>
            <Selecao id="ec-tipo" rotulo="Tipo" value={d.tipo} onChange={(e) => mudar({ tipo: e.target.value })}>
              {Object.entries(conteudo.tiposEspaco).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </Selecao>
            <div className="md:col-span-2"><Campo id="ec-local" rotulo="Onde fica" required value={d.local} onChange={(e) => mudar({ local: e.target.value })} placeholder="Ex.: Cobertura do bloco B" /></div>
            <div className="md:col-span-2"><Campo id="ec-acessos" rotulo="Acessos" value={d.acessos ?? ''} onChange={(e) => mudar({ acessos: e.target.value })} placeholder="Ex.: Boca de visita de 60 cm no topo" /></div>
            <div className="md:col-span-4"><Campo id="ec-produtos" rotulo="O que tem ou já teve dentro" value={d.produtos ?? ''} onChange={(e) => mudar({ produtos: e.target.value })} placeholder="Ex.: Água tratada com cloro" /></div>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Perigos deste espaço</legend>
            <div className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(conteudo.riscosConfinado).map(([v, n]) => (
                <label key={v} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={d.riscos.includes(v)}
                    onChange={(e) => mudar({ riscos: e.target.checked ? [...d.riscos, v] : d.riscos.filter((r) => r !== v) })} />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="ec-medidas" className="mb-1 block text-sm font-semibold">Medidas de controle</label>
            <textarea id="ec-medidas" rows={3} className={caixa} value={d.medidasControle ?? ''} onChange={(e) => mudar({ medidasControle: e.target.value })}
              placeholder="Ex.: Bloqueio da bomba de recalque, ventilação forçada, medição contínua de gases, entrada só com PET" />
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={d.sinalizado} onChange={(e) => mudar({ sinalizado: e.target.checked })} /> Sinalizado (placa de entrada proibida)</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={d.isolado} onChange={(e) => mudar({ isolado: e.target.checked })} /> Entrada fechada para quem não é autorizado</label>
            {editando.id && <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-primary" checked={d.ativo} onChange={(e) => mudar({ ativo: e.target.checked })} /> Ainda existe</label>}
          </div>
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundario" onClick={() => setEditando(null)}>Cancelar</Botao>
            <Botao type="submit">Salvar espaço</Botao>
          </div>
        </form>
      )}

      {espacos.length === 0 ? <p className="text-sm text-text/60">Nenhum espaço confinado cadastrado.</p> : (
        <ul className="divide-y divide-border text-sm">
          {espacos.map((x) => (
            <li key={x.id} className={`flex flex-wrap items-center justify-between gap-2 py-2.5 ${x.ativo ? '' : 'text-text/50'}`}>
              <span>
                <strong>{x.codigo}</strong> · {x.nome} <span className="text-text/60">· {x.local}{x.riscos.length ? ` · ${x.riscos.length} perigo(s)` : ''}{x.ativo ? '' : ' · não existe mais'}</span>
                {x.ativo && (!x.sinalizado || !x.isolado) && <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-[#c2410c]">{!x.sinalizado ? 'Sem sinalização' : 'Entrada aberta'}</span>}
              </span>
              <span className="flex gap-3">
                <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setEditando({ id: x.id, dados: { ...x, descricao: x.descricao ?? undefined, acessos: x.acessos ?? undefined, produtos: x.produtos ?? undefined, medidasControle: x.medidasControle ?? undefined } })}>Editar</button>
                <button type="button" className="text-danger hover:underline" onClick={async () => {
                  if (!confirm(`Excluir ${x.codigo} · ${x.nome}? As PTs antigas continuam guardadas.`)) return;
                  try { await confinados.excluir(empresaId, x.id); avisar('ok', `${x.codigo} excluído.`); await recarregar(); } catch (e) { avisar('erro', (e as Error).message); }
                }}>Excluir</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

// ---------- Planos de resgate
const TELEFONES_PADRAO = [{ nome: 'SAMU', numero: '192' }, { nome: 'Bombeiros', numero: '193' }, { nome: 'Líder do resgate na empresa', numero: '' }];

function planoVazio(tipo: TipoResgate, conteudo: ConteudoOperacao): DadosPlanoResgate {
  const m = conteudo.modelosResgate[tipo];
  return { tipo, titulo: '', local: '', cenarios: m.cenarios, equipe: [], equipamentos: [...m.equipamentos], procedimento: m.procedimento, primeirosSocorros: m.primeirosSocorros, telefones: TELEFONES_PADRAO.map((t) => ({ ...t })) };
}

function Planos({ empresaId, conteudo, espacos, planos, colaboradores, recarregar, avisar }: {
  empresaId: string; conteudo: ConteudoOperacao; espacos: EspacoConfinado[]; planos: PlanoResgate[]; colaboradores: Colaborador[]; recarregar: () => Promise<void>; avisar: Avisar;
}) {
  const [editando, setEditando] = useState<{ id: string | null; dados: DadosPlanoResgate } | null>(null);
  const [outroEquip, setOutroEquip] = useState('');
  const d = editando?.dados;
  const mudar = (campos: Partial<DadosPlanoResgate>) => setEditando((x) => (x ? { ...x, dados: { ...x.dados, ...campos } } : x));

  function trocarTipo(tipo: TipoResgate) {
    if (!d) return;
    const m = conteudo.modelosResgate[tipo];
    // Troca os textos de partida só se ainda estão iguais ao modelo do outro tipo.
    const outro = conteudo.modelosResgate[d.tipo];
    mudar({
      tipo,
      espacoId: undefined,
      cenarios: d.cenarios === outro.cenarios ? m.cenarios : d.cenarios,
      procedimento: d.procedimento === outro.procedimento ? m.procedimento : d.procedimento,
      primeirosSocorros: d.primeirosSocorros === outro.primeirosSocorros ? m.primeirosSocorros : d.primeirosSocorros,
      equipamentos: d.equipamentos.join('|') === outro.equipamentos.join('|') ? [...m.equipamentos] : d.equipamentos,
    });
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!d || !editando) return;
    const dados = { ...d, telefones: d.telefones.filter((t) => t.nome.trim() && t.numero.trim()) };
    try {
      if (editando.id) await planosResgate.editar(empresaId, editando.id, dados);
      else await planosResgate.criar(empresaId, dados);
      avisar('ok', 'Plano de resgate salvo. Baixe o PDF e deixe uma cópia no local do trabalho.');
      setEditando(null);
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  async function baixar(p: PlanoResgate) {
    try { salvarArquivo(await planosResgate.pdf(empresaId, p.id), `Plano-de-resgate-${p.numero}.pdf`); } catch (e) { avisar('erro', (e as Error).message); }
  }

  const sugeridos = d ? conteudo.modelosResgate[d.tipo].equipamentos : [];
  const extras = d ? d.equipamentos.filter((x) => !sugeridos.includes(x)) : [];

  return (
    <Cartao titulo="Planos de resgate" id="resgate"
      acao={!editando && <Botao onClick={() => setEditando({ id: null, dados: planoVazio('ALTURA', conteudo) })}>+ Novo plano</Botao>}>
      <p className="mb-3 text-sm text-text/70">Todo trabalho em altura e toda entrada em espaço confinado precisam de um plano de resgate pronto antes de começar, com equipe treinada e equipamento no local (NR-35 e NR-33). Os textos vêm com uma sugestão de partida: ajuste ao local e ao que a empresa tem.</p>

      {editando && d && (
        <form className="mb-5 space-y-4 rounded-card border border-primary/30 bg-primary/5 p-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-3">
            <Selecao id="pr-tipo" rotulo="Tipo de trabalho" value={d.tipo} onChange={(e) => trocarTipo(e.target.value as TipoResgate)}>
              <option value="ALTURA">Trabalho em altura (NR-35)</option>
              <option value="ESPACO_CONFINADO">Espaço confinado (NR-33)</option>
            </Selecao>
            <div className="md:col-span-2"><Campo id="pr-titulo" rotulo="Nome do plano" required value={d.titulo} onChange={(e) => mudar({ titulo: e.target.value })} placeholder={d.tipo === 'ALTURA' ? 'Ex.: Resgate no telhado do galpão' : 'Ex.: Resgate na caixa d’água'} /></div>
            <div className="md:col-span-2"><Campo id="pr-local" rotulo="Local" required value={d.local} onChange={(e) => mudar({ local: e.target.value })} placeholder="Ex.: Galpão 2" /></div>
            {d.tipo === 'ESPACO_CONFINADO' ? (
              <Selecao id="pr-espaco" rotulo="Espaço confinado" value={d.espacoId ?? ''} onChange={(e) => mudar({ espacoId: e.target.value || undefined })}>
                <option value="">{espacos.length ? 'Escolha o espaço' : 'Cadastre o espaço acima'}</option>
                {espacos.map((x) => <option key={x.id} value={x.id}>{x.codigo} · {x.nome}</option>)}
              </Selecao>
            ) : <span />}
          </div>

          <div>
            <label htmlFor="pr-cenarios" className="mb-1 block text-sm font-semibold">O que pode dar errado</label>
            <textarea id="pr-cenarios" rows={3} className={caixa} required value={d.cenarios} onChange={(e) => mudar({ cenarios: e.target.value })} />
          </div>

          <EscolherPessoas titulo="Equipe de resgate da empresa" colaboradores={colaboradores} marcados={d.equipe} mudar={(ids) => mudar({ equipe: ids })} />
          <Campo id="pr-externa" rotulo="Equipe de fora (se houver)" value={d.equipeExterna ?? ''} onChange={(e) => mudar({ equipeExterna: e.target.value })} placeholder="Ex.: Brigada contratada Resgate Sul, (11) 99999-0000" />

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Equipamentos de resgate no local</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {[...sugeridos, ...extras].map((x) => (
                <label key={x} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={d.equipamentos.includes(x)}
                    onChange={(e) => mudar({ equipamentos: e.target.checked ? [...d.equipamentos, x] : d.equipamentos.filter((y) => y !== x) })} />
                  {x}
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input aria-label="Outro equipamento" className={caixa} value={outroEquip} onChange={(e) => setOutroEquip(e.target.value)} placeholder="Outro equipamento" />
              <Botao type="button" variante="secundario" onClick={() => { const t = outroEquip.trim(); if (t && !d.equipamentos.includes(t)) mudar({ equipamentos: [...d.equipamentos, t] }); setOutroEquip(''); }}>Incluir</Botao>
            </div>
          </fieldset>

          <div>
            <label htmlFor="pr-proc" className="mb-1 block text-sm font-semibold">Passo a passo do resgate</label>
            <textarea id="pr-proc" rows={9} className={caixa} required value={d.procedimento} onChange={(e) => mudar({ procedimento: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pr-ps" className="mb-1 block text-sm font-semibold">Primeiros socorros</label>
            <textarea id="pr-ps" rows={3} className={caixa} value={d.primeirosSocorros ?? ''} onChange={(e) => mudar({ primeirosSocorros: e.target.value })} />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Telefones de emergência</legend>
            <div className="space-y-2">
              {d.telefones.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_auto] gap-2">
                  <input aria-label="Quem" className={caixa} value={t.nome} placeholder="Quem" onChange={(e) => mudar({ telefones: d.telefones.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} />
                  <input aria-label="Número" className={caixa} value={t.numero} placeholder="Número" onChange={(e) => mudar({ telefones: d.telefones.map((x, j) => (j === i ? { ...x, numero: e.target.value } : x)) })} />
                  <button type="button" className="text-sm text-danger" onClick={() => mudar({ telefones: d.telefones.filter((_, j) => j !== i) })}>Tirar</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => mudar({ telefones: [...d.telefones, { nome: '', numero: '' }] })}>+ Mais um telefone</button>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Campo id="pr-hospital" rotulo="Hospital mais próximo" value={d.hospital ?? ''} onChange={(e) => mudar({ hospital: e.target.value })} placeholder="Nome, endereço e telefone" /></div>
            <Campo id="pr-simulado" type="date" rotulo="Último simulado" value={d.ultimoSimulado?.slice(0, 10) ?? ''} onChange={(e) => mudar({ ultimoSimulado: e.target.value || undefined })}
              ajuda={{ oQueE: 'Data do último treino do resgate com a equipe. O painel avisa quando passa de um ano.' }} />
          </div>

          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundario" onClick={() => setEditando(null)}>Cancelar</Botao>
            <Botao type="submit">Salvar plano</Botao>
          </div>
        </form>
      )}

      {planos.length === 0 ? <p className="text-sm text-text/60">Nenhum plano de resgate ainda.</p> : (
        <ul className="divide-y divide-border text-sm">
          {planos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <strong>Nº {p.numero}</strong> · {p.titulo} <span className="text-text/60">· {p.tipo === 'ALTURA' ? 'altura' : 'espaço confinado'}{p.espaco ? ` (${p.espaco.codigo})` : ''} · simulado: {data(p.ultimoSimulado)}</span>
                {p.simuladoVencido && <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-[#c2410c]">Simulado pendente</span>}
              </span>
              <span className="flex items-center gap-3">
                <Botao variante="secundario" onClick={() => baixar(p)}>Baixar PDF</Botao>
                <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setEditando({
                  id: p.id,
                  dados: {
                    tipo: p.tipo, titulo: p.titulo, local: p.local, espacoId: p.espacoId ?? undefined, cenarios: p.cenarios, equipe: p.equipe, equipeExterna: p.equipeExterna ?? undefined,
                    equipamentos: p.equipamentos, procedimento: p.procedimento, primeirosSocorros: p.primeirosSocorros ?? undefined, telefones: p.telefones, hospital: p.hospital ?? undefined,
                    ultimoSimulado: p.ultimoSimulado?.slice(0, 10),
                  },
                })}>Editar</button>
                <button type="button" className="text-danger hover:underline" onClick={async () => {
                  if (!confirm(`Excluir o plano nº ${p.numero}?`)) return;
                  try { await planosResgate.excluir(empresaId, p.id); avisar('ok', 'Plano excluído.'); await recarregar(); } catch (e) { avisar('erro', (e as Error).message); }
                }}>Excluir</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
