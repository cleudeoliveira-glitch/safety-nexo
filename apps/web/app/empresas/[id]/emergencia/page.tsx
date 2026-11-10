'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  buscarEmergencia,
  buscarEmpresa,
  buscarTabelaIt17,
  criarControleEmergencia,
  DivisaoIt17,
  Empresa,
  gerarPlanoEmergencia,
  removerControleEmergencia,
  salvarArquivo,
  salvarEmergencia,
  SituacaoEmergencia,
} from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const RISCO = { BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto' } as const;
const TIPOS = [
  ['AVCB', 'AVCB (Auto de Vistoria do Corpo de Bombeiros)'],
  ['CLCB', 'CLCB (Certificado de Licença do Corpo de Bombeiros)'],
  ['EXTINTOR', 'Extintor'],
  ['HIDRANTE', 'Hidrante e mangueiras'],
  ['ILUMINACAO', 'Iluminação de emergência'],
  ['ALARME', 'Alarme de incêndio'],
  ['SPDA', 'SPDA (para-raios)'],
  ['OUTRO', 'Outro'],
] as const;
const nomeTipo = (t: string) => TIPOS.find(([v]) => v === t)?.[1].split(' (')[0] ?? t;

export default function EmergenciaPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [cliente, setCliente] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [divisoes, setDivisoes] = useState<DivisaoIt17[]>([]);
  const [sit, setSit] = useState<SituacaoEmergencia | null>(null);
  const [linha, setLinha] = useState('');
  const [pavimentos, setPavimentos] = useState<string[]>(['']);
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, t, s] = await Promise.all([buscarEmpresa(empresaId), buscarTabelaIt17(), buscarEmergencia(empresaId)]);
      setEmpresa(e); setDivisoes(t.divisoes); setSit(s);
      if (s.config) {
        setLinha(`${s.config.divisao}|${s.config.risco}`);
        setPavimentos(s.config.populacaoPorPavimento.map(String));
      }
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
    setCliente(ehEmpresa());
    recarregar();
  }, [recarregar]);

  async function agir(acao: () => Promise<unknown>, sucesso: string) {
    try {
      await acao();
      setAviso({ tipo: 'ok', texto: sucesso });
      await recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  if (!empresa || !sit) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  const total = sit.calculo?.total ?? null;
  const faltam = total !== null ? Math.max(0, total - sit.brigadistas.length) : null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Emergência</h1>
        <p className="text-text/60">{empresa.razaoSocial}</p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Cartao titulo="Brigada de incêndio" acao={sit.config && <Botao onClick={async () => {
        try { salvarArquivo(await gerarPlanoEmergencia(empresaId), `Plano-de-emergencia-${empresa.razaoSocial}.pdf`); }
        catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
      }}>Baixar plano de emergência</Botao>}>
        <p className="mb-4 text-sm text-text/60">
          Cálculo pela IT 17/2025 do Corpo de Bombeiros de São Paulo (Tabela A.1). Em outros estados, confira com a instrução técnica local.
        </p>

        {sit.calculo && (
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="card-total rounded-card p-4">
              <p className="text-sm text-text/60">Brigadistas por turno</p>
              <p className="text-3xl font-semibold text-primary">{total ?? '—'}</p>
              {sit.calculo.porPavimento.length > 1 && <p className="text-xs text-text/60">{sit.calculo.porPavimento.map((n, i) => `pav. ${i + 1}: ${n}`).join(' · ')}</p>}
            </div>
            <div className={`${faltam ? 'card-nao' : 'card-ok'} rounded-card p-4`}>
              <p className="text-sm text-text/60">Treinados e em dia</p>
              <p className={`text-3xl font-semibold ${faltam ? 'text-danger' : 'text-success'}`}>{sit.brigadistas.length}</p>
              {faltam ? <p className="text-xs text-danger">Faltam {faltam}</p> : null}
            </div>
            <div className="rounded-card border border-border p-4">
              <p className="text-sm text-text/60">Nível de treinamento</p>
              <p className="font-semibold">{sit.calculo.nivelTexto}</p>
            </div>
            {sit.calculo.observacao && <p className="text-sm text-warning md:col-span-3">{sit.calculo.observacao}</p>}
          </div>
        )}

        {!cliente && (
          <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
            ev.preventDefault();
            const d = new FormData(ev.currentTarget);
            const t = (c: string) => String(d.get(c) ?? '').trim();
            const [divisao, risco] = linha.split('|');
            agir(() => salvarEmergencia(empresaId, {
              divisao, risco: risco as 'BAIXO' | 'MEDIO' | 'ALTO',
              populacaoPorPavimento: pavimentos.map((p) => Number(p) || 0),
              pontoEncontro: t('pontoEncontro'), rotasFuga: t('rotasFuga'), contatos: t('contatos'), coordenador: t('coordenador'),
            }), 'Dados da brigada salvos.');
          }}>
            <Selecao id="em-divisao" rotulo="Ocupação e risco de incêndio" value={linha} onChange={(e) => setLinha(e.target.value)} required className="md:col-span-3">
              <option value="">Escolha</option>
              {divisoes.map((d) => <option key={`${d.divisao}|${d.risco}`} value={`${d.divisao}|${d.risco}`}>{d.divisao} · {d.descricao} · risco {RISCO[d.risco].toLowerCase()}</option>)}
            </Selecao>
            <div className="md:col-span-3">
              <p className="mb-1.5 text-sm font-semibold">População fixa por pavimento, no turno mais cheio</p>
              <div className="flex flex-wrap items-center gap-2">
                {pavimentos.map((p, i) => (
                  <input key={i} aria-label={`Pavimento ${i + 1}`} type="number" min={0} value={p} placeholder={`Pav. ${i + 1}`}
                    onChange={(e) => setPavimentos((x) => x.map((v, j) => (j === i ? e.target.value : v)))}
                    className="w-24 rounded-card border border-border bg-background px-3 py-2 text-sm" />
                ))}
                <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setPavimentos((x) => [...x, ''])}>+ pavimento</button>
                {pavimentos.length > 1 && <button type="button" className="text-sm text-danger hover:underline" onClick={() => setPavimentos((x) => x.slice(0, -1))}>tirar o último</button>}
              </div>
              <p className="mt-1 text-xs text-text/60">Conte quem trabalha no local (funcionários e terceiros fixos), não o público.</p>
            </div>
            <Campo id="em-coord" name="coordenador" rotulo="Coordenador(a) da emergência" defaultValue={sit.config?.coordenador ?? ''} />
            <Campo id="em-ponto" name="pontoEncontro" rotulo="Ponto de encontro" defaultValue={sit.config?.pontoEncontro ?? ''} placeholder="Ex.: calçada em frente à loja" className="md:col-span-2" />
            <Campo id="em-rotas" name="rotasFuga" rotulo="Rotas de fuga" defaultValue={sit.config?.rotasFuga ?? ''} placeholder="Ex.: produção sai pela porta lateral; loja pela porta principal" className="md:col-span-2" />
            <Campo id="em-contatos" name="contatos" rotulo="Outros telefones" defaultValue={sit.config?.contatos ?? ''} placeholder="Ex.: Gerente (11) 99999-0000" />
            <div className="flex justify-end md:col-span-3"><Botao type="submit">Calcular e salvar</Botao></div>
          </form>
        )}

        <h3 className="mt-6 text-sm font-semibold">Brigadistas com treinamento válido</h3>
        {sit.brigadistas.length === 0 ? (
          <p className="mt-1 text-sm text-text/60">Ninguém ainda. Crie uma turma de brigada em <Link href={`/empresas/${empresaId}/treinamentos`} className="text-primary hover:underline">Pessoas e Cultura</Link>, usando o modelo &quot;Brigada de incêndio&quot;.</p>
        ) : (
          <ul className="mt-1 divide-y divide-border text-sm">
            {sit.brigadistas.map((b) => (
              <li key={b.nome} className="flex flex-wrap justify-between gap-2 py-2">
                <span><strong>{b.nome}</strong> · {b.cargo}</span>
                <span className="text-text/60">{b.nivel}{b.validade ? ` · até ${data(b.validade)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="AVCB, extintores e equipamentos">
        <p className="mb-4 text-sm text-text/60">O painel avisa 90 dias antes do AVCB ou CLCB vencer, e 30 dias antes dos demais itens.</p>
        <form key={`c${chave}`} className="grid gap-4 md:grid-cols-4" onSubmit={(ev) => {
          ev.preventDefault();
          const d = new FormData(ev.currentTarget);
          const t = (c: string) => String(d.get(c) ?? '').trim();
          agir(async () => {
            await criarControleEmergencia(empresaId, {
              tipo: t('tipo'), descricao: t('descricao'),
              ...(t('local') ? { local: t('local') } : {}), ...(t('numero') ? { numero: t('numero') } : {}), ...(t('validade') ? { validade: t('validade') } : {}),
            });
            setChave((k) => k + 1);
          }, 'Item incluído.');
        }}>
          <Selecao id="ct-tipo" name="tipo" rotulo="Tipo" required>
            {TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <Campo id="ct-desc" name="descricao" rotulo="Descrição" required placeholder="Ex.: Extintor PQS 4 kg" />
          <Campo id="ct-local" name="local" rotulo="Local" placeholder="Ex.: ao lado do forno" />
          <Campo id="ct-numero" name="numero" rotulo="Número" placeholder="Nº do AVCB ou do selo" />
          <Campo id="ct-validade" name="validade" type="date" rotulo="Validade" />
          <div className="flex items-end justify-end md:col-span-3"><Botao type="submit" variante="secundario">Incluir</Botao></div>
        </form>
        {sit.controles.length > 0 && (
          <ul className="mt-5 divide-y divide-border text-sm">
            {sit.controles.map((c) => {
              const dias = c.validade ? Math.ceil((new Date(c.validade).getTime() - Date.now()) / 86400000) : null;
              const limite = c.tipo === 'AVCB' || c.tipo === 'CLCB' ? 90 : 30;
              const cor = dias === null ? 'text-text/60' : dias < 0 ? 'text-danger' : dias <= limite ? 'text-warning' : 'text-success';
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span><strong>{nomeTipo(c.tipo)}</strong> · {c.descricao}{c.local ? ` · ${c.local}` : ''}{c.numero ? ` · nº ${c.numero}` : ''}</span>
                  <span className="flex items-center gap-3">
                    <span className={`font-semibold ${cor}`}>{c.validade ? (dias! < 0 ? `Vencido em ${data(c.validade)}` : `Válido até ${data(c.validade)}`) : 'Sem validade'}</span>
                    <button className="text-xs text-danger hover:underline" onClick={() => agir(() => removerControleEmergencia(empresaId, c.id), 'Item removido.')}>Remover</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
