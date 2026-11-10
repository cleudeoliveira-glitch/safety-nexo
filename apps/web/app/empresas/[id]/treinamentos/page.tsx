'use client';

import { materialDa } from '@/lib/materiais';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CameraRosto } from '@/components/CameraRosto';
import { guardarCaptura } from '@/lib/rosto-offline';
import { EscolherPessoas } from '@/components/EscolherPessoas';
import { TreinamentosSugeridos } from '@/components/TreinamentosSugeridos';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  adicionarParticipantes,
  rosto,
  buscarCatalogoTreinamentos,
  buscarEmpresa,
  Colaborador,
  criarTurma,
  Empresa,
  gerarPdfTurma,
  listarColaboradores,
  listarTurmas,
  ModeloTreinamento,
  removerParticipante,
  salvarArquivo,
  Turma,
} from '@/lib/api';

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const vazio: ModeloTreinamento = { nome: '', norma: null, cargaHoraria: null, validadeMeses: null, conteudo: [] };

export default function TreinamentosPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [catalogo, setCatalogo] = useState<ModeloTreinamento[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [modelo, setModelo] = useState<ModeloTreinamento>(vazio);
  const [chaveForm, setChaveForm] = useState(0);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [camera, setCamera] = useState<Turma | null>(null);
  const [rostoTurma, setRostoTurma] = useState(false);
  useEffect(() => { rosto.config().then((c) => setRostoTurma(c.ativo && c.usos.TREINAMENTO)).catch(() => setRostoTurma(false)); }, []);

  const recarregar = useCallback(async () => {
    try {
      const [e, ct, c, t] = await Promise.all([buscarEmpresa(empresaId), buscarCatalogoTreinamentos(), listarColaboradores(empresaId), listarTurmas(empresaId)]);
      setEmpresa(e); setCatalogo(ct); setColaboradores(c); setTurmas(t);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Trocar o modelo remonta o formulário com os valores prontos do catálogo.
  function escolherModelo(nome: string) {
    setModelo(catalogo.find((m) => m.nome === nome) ?? vazio);
    setChaveForm((k) => k + 1);
  }

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const texto = (campo: string) => String(d.get(campo) ?? '').trim();
    try {
      const turma = await criarTurma(empresaId, {
        nome: texto('nome'),
        norma: texto('norma') || null,
        cargaHoraria: Number(texto('cargaHoraria')),
        ...(texto('validadeMeses') ? { validadeMeses: Number(texto('validadeMeses')) } : {}),
        conteudo: texto('conteudo').split('\n').map((c) => c.trim()).filter(Boolean),
        inicio: texto('inicio'),
        fim: texto('fim'),
        local: texto('local'),
        instrutor: texto('instrutor'),
        qualificacao: texto('qualificacao'),
        responsavelTecnico: texto('responsavelTecnico'),
      });
      if (participantes.length) await adicionarParticipantes(empresaId, turma.id, participantes);
      setModelo(vazio);
      setParticipantes([]);
      setChaveForm((k) => k + 1);
      setAviso({ tipo: 'ok', texto: 'Turma criada. Baixe a lista de presença e, depois do treinamento, os certificados.' });
      await recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  async function baixar(turma: Turma, documento: 'lista' | 'certificados') {
    try {
      const nome = documento === 'lista' ? 'Lista-presenca' : 'Certificados';
      salvarArquivo(await gerarPdfTurma(empresaId, turma.id, documento), `${nome}-${turma.nome}-${turma.inicio.slice(0, 10)}.pdf`);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  async function agir(acao: () => Promise<unknown>, sucesso: string) {
    try {
      await acao();
      setAviso({ tipo: 'ok', texto: sucesso });
      await recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  const situacao = (t: Turma) => {
    if (!t.validade) return ['Sem validade fixa', 'text-text/60'];
    const dias = Math.ceil((new Date(t.validade).getTime() - Date.now()) / 86400000);
    if (dias < 0) return [`Vencido em ${data(t.validade)}`, 'text-danger'];
    if (dias <= 30) return [`Vence em ${dias} dia(s)`, 'text-warning'];
    return [`Válido até ${data(t.validade)}`, 'text-success'];
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Pessoas e cultura</h1>
        <p className="text-text/60">
          {empresa.razaoSocial} · <Link href={`/empresas/${empresaId}#cipa`} className="text-primary hover:underline">CIPA e eleição →</Link> · <Link href={`/empresas/${empresaId}/cultura`} className="text-primary hover:underline">SIPAT e 5S →</Link>
        </p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <TreinamentosSugeridos empresaId={empresaId} versao={turmas.length} usar={(nome, pessoas) => {
        escolherModelo(nome); setParticipantes(pessoas);
        document.getElementById('tr-modelo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }} />

      <Cartao titulo="Nova turma de treinamento">
        <Selecao id="tr-modelo" rotulo="Começar de um modelo" value={modelo.nome} onChange={(e) => escolherModelo(e.target.value)} className="mb-4"
          ajuda={{ oQueE: `${catalogo.length} modelos de ${new Set(catalogo.map((m) => m.norma).filter(Boolean)).size} NRs. Preenche nome, norma, carga horária, validade e conteúdo. Você pode ajustar tudo antes de salvar.` }}>
          <option value="">Treinamento livre (preencher do zero)</option>
          {[...new Set(catalogo.map((m) => m.norma ?? 'Outros'))].sort().map((norma) => (
            <optgroup key={norma} label={norma}>
              {catalogo.filter((m) => (m.norma ?? 'Outros') === norma).map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
            </optgroup>
          ))}
        </Selecao>
        {modelo.nome && modelo.cargaHoraria === null && (
          <p className="-mt-2 mb-4 text-sm text-warning">Esta norma não fixa carga horária nem reciclagem: defina conforme o seu programa de capacitação (NR-01, item 1.7).</p>
        )}

        <form key={chaveForm} className="space-y-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-3">
            <Campo id="tr-nome" name="nome" rotulo="Treinamento" required defaultValue={modelo.nome} className="md:col-span-2" />
            <Campo id="tr-norma" name="norma" rotulo="Norma" defaultValue={modelo.norma ?? ''} placeholder="Ex.: NR-35" />
            <Campo id="tr-carga" name="cargaHoraria" type="number" min={1} rotulo="Carga horária (horas)" required defaultValue={modelo.cargaHoraria ?? ''} />
            <Campo id="tr-validade" name="validadeMeses" type="number" min={1} rotulo="Validade (meses)" defaultValue={modelo.validadeMeses ?? ''} />
            <Campo id="tr-local" name="local" rotulo="Local" required placeholder="Ex.: Sala de treinamento" />
            <Campo id="tr-inicio" name="inicio" type="date" rotulo="Início" required defaultValue={hoje()} />
            <Campo id="tr-fim" name="fim" type="date" rotulo="Fim" required defaultValue={hoje()} />
            <Campo id="tr-instrutor" name="instrutor" rotulo="Instrutor(a)" required placeholder="Ex.: Cleude Oliveira" />
            <Campo id="tr-qualificacao" name="qualificacao" rotulo="Qualificação do instrutor" required placeholder="Ex.: Engenheira de Segurança do Trabalho"
              className="md:col-span-2" />
            <Campo id="tr-rt" name="responsavelTecnico" rotulo="Responsável técnico" required placeholder="Quem assina pelo treinamento" />
          </div>
          <div>
            <label htmlFor="tr-conteudo" className="mb-1.5 block text-sm font-semibold">Conteúdo programático (um item por linha)</label>
            <textarea id="tr-conteudo" name="conteudo" rows={6} required defaultValue={modelo.conteudo.join('\n')}
              className="w-full rounded-card border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <EscolherPessoas titulo="Participantes" colaboradores={colaboradores} marcados={participantes} mudar={setParticipantes} />
          <div className="flex justify-end"><Botao type="submit">Criar turma</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="Turmas">
        {turmas.length === 0 ? <p className="text-sm text-text/60">Nenhuma turma ainda.</p> : (
          <div className="space-y-4">
            {turmas.map((t) => {
              const [rotulo, cor] = situacao(t);
              const fora = colaboradores.filter((c) => !t.participantes.some((p) => p.colaboradorId === c.id));
              return (
                <div key={t.id} className="rounded-card border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.norma ? `${t.norma} · ` : ''}{t.nome}
                        {materialDa(t.norma) && <a href={`/material#${materialDa(t.norma)!.codigo}`} className="ml-2 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success hover:bg-success/25">Material: slides e prova</a>}
                      </p>
                      <p className="text-sm text-text/60">
                        {data(t.inicio)}{t.fim !== t.inicio ? ` a ${data(t.fim)}` : ''} · {t.cargaHoraria} h · {t.participantes.length} participante(s) ·{' '}
                        <span className={`font-semibold ${cor}`}>{rotulo}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/empresas/${empresaId}/lista/turmas/${t.id}`} className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white">Lista para assinar</Link>
                      {rostoTurma && <Botao variante="secundario" onClick={() => setCamera(t)}>Presença pelo rosto</Botao>}
                      <Botao variante="secundario" onClick={() => baixar(t, 'lista')}>Lista de presença</Botao>
                      <Botao variante="secundario" onClick={() => baixar(t, 'certificados')} disabled={!t.participantes.length}>Certificados</Botao>
                    </div>
                  </div>
                  {t.participantes.length > 0 && (
                    <ul className="mt-3 divide-y divide-border text-sm">
                      {t.participantes.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                          <span>{p.nome} <span className="text-text/50">· {p.cargo}</span></span>
                          <span className="flex items-center gap-3">
                            <Link href={`/validar/${p.codigo}`} target="_blank" className="font-mono text-xs text-primary hover:underline">{p.codigo}</Link>
                            <button className="text-xs text-danger hover:underline" onClick={() => agir(() => removerParticipante(empresaId, t.id, p.id), 'Participante removido.')}>Remover</button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {fora.length > 0 && (
                    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(ev) => {
                      ev.preventDefault();
                      const id = String(new FormData(ev.currentTarget).get('colaboradorId') ?? '');
                      if (id) agir(() => adicionarParticipantes(empresaId, t.id, [id]), 'Participante incluído.');
                    }}>
                      <Selecao id={`incluir-${t.id}`} name="colaboradorId" rotulo="Incluir participante" className="min-w-64 flex-1">
                        <option value="">Escolha um colaborador</option>
                        {fora.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.cargo}</option>)}
                      </Selecao>
                      <Botao type="submit" variante="secundario">Incluir</Botao>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Cartao>
      {camera && (
        <CameraRosto titulo={`Presença no treinamento: ${camera.nome}`} modo="continuo" onFechar={() => { setCamera(null); recarregar(); }}
          guardarOffline={async (c) => { await guardarCaptura({ tipo: 'TREINAMENTO', empresaId, refId: camera.id, titulo: camera.nome, dados: { descritor: c.descritor, foto: c.foto, latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida } }); return 'Sem internet: guardado no aparelho. Será conferido e enviado quando a internet voltar.'; }}
          onCaptura={async (c) => { const r = await rosto.presencaTurma(empresaId, camera.id, { descritor: c.descritor, foto: c.foto, latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida }); return r.repetido ? `${r.nome} já estava na turma` : `${r.nome}: presença registrada`; }} />
      )}
    </main>
  );
}
