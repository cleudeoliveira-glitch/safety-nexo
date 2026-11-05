'use client';

import { useEffect, useState } from 'react';
import { EscolhaTabela } from '@/components/EscolhaTabela';
import { Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  atualizarEmpresa,
  buscarTabelasEsocial,
  TabelasEsocial,
  gerarEventoEsocial,
  OrigensEsocial,
  registrarToxicologico,
  removerToxicologico,
  salvarEsocialCat,
  salvarEsocialColaborador,
  SituacaoEvento,
  UFS,
} from '@/lib/api';

type Agir = (acao: () => Promise<string>) => void;
const texto = (d: FormData, k: string) => String(d.get(k) ?? '').trim();
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const TIPO_ASO: Record<string, string> = { ADMISSIONAL: 'Admissional', PERIODICO: 'Periódico', RETORNO_TRABALHO: 'Retorno ao trabalho', MUDANCA_RISCO: 'Mudança de risco', DEMISSIONAL: 'Demissional' };

function Situacao({ s }: { s: SituacaoEvento }) {
  if (!s) return <span className="text-xs text-text/50">Ainda não gerado</span>;
  const nome = { PENDENTE: 'Na fila', ENVIADO: 'Enviado', PROCESSADO: 'Aceito', ERRO: 'Recusado', EXCLUIDO: 'Excluído' }[s.status];
  const cor = { PENDENTE: 'text-warning', ENVIADO: 'text-primary', PROCESSADO: 'text-success', ERRO: 'text-danger', EXCLUIDO: 'text-text/50' }[s.status];
  return <span className={`text-xs font-semibold ${cor}`}>{nome}</span>;
}

// Botão "gerar" e, quando já aceito, "corrigir" (retificação).
function BotoesEvento({ s, gerar }: { s: SituacaoEvento; gerar: (retificar: boolean) => void }) {
  return (
    <span className="flex items-center gap-3">
      <Situacao s={s} />
      {s?.status === 'PROCESSADO'
        ? <button className="text-sm text-primary underline" onClick={() => gerar(true)}>Corrigir</button>
        : <button className="text-sm font-semibold text-primary underline" disabled={s?.status === 'ENVIADO'} onClick={() => gerar(false)}>{s ? 'Gerar de novo' : 'Gerar'}</button>}
    </span>
  );
}

export function DadosEmpresaEsocial({ empresaId, o, agir }: { empresaId: string; o: OrigensEsocial['empresa']; agir: Agir }) {
  return (
    <Cartao titulo="Dados da empresa para o eSocial">
      <form className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
        ev.preventDefault();
        const d = new FormData(ev.currentTarget);
        const op = (k: string) => texto(d, k) || undefined;
        agir(async () => {
          await atualizarEmpresa(empresaId, {
            esocialAmbiente: texto(d, 'ambiente'), medicoPcmsoCpf: op('medCpf'), medicoPcmsoUf: op('medUf'),
            responsavelTecnicoCpf: op('rtCpf'), responsavelTecnicoConselho: op('rtConselho'), responsavelTecnicoUf: op('rtUf'),
          });
          return 'Dados do eSocial salvos.';
        });
      }}>
        <Selecao id="es-amb" name="ambiente" rotulo="Para onde enviar" defaultValue={o.esocialAmbiente} className="md:col-span-3"
          ajuda={{ oQueE: 'Comece pelo ambiente de testes. Ele não vale para o governo e serve para conferir se está tudo certo. Depois troque para "valendo".' }}>
          <option value="PRODUCAO_RESTRITA">Ambiente de testes do eSocial (não vale para o governo)</option>
          <option value="PRODUCAO">Valendo (produção)</option>
        </Selecao>
        <p className="text-sm font-semibold md:col-span-3">Médico do PCMSO: {o.medicoPcmsoNome ?? <span className="text-warning">cadastre no painel da empresa</span>}{o.medicoPcmsoCrm ? ` · CRM ${o.medicoPcmsoCrm}` : ''}</p>
        <Campo id="es-med-cpf" name="medCpf" rotulo="CPF do médico do PCMSO (opcional)" defaultValue={o.medicoPcmsoCpf ?? ''} placeholder="000.000.000-00" />
        <Selecao id="es-med-uf" name="medUf" rotulo="UF do CRM" defaultValue={o.medicoPcmsoUf ?? ''}>
          <option value="">Escolha</option>{UFS.map((u) => <option key={u}>{u}</option>)}
        </Selecao>
        <div />
        <p className="text-sm font-semibold md:col-span-3">Responsável pelos registros ambientais: {o.responsavelTecnicoNome ?? <span className="text-warning">cadastre no painel da empresa</span>}{o.responsavelTecnicoRegistro ? ` · ${o.responsavelTecnicoRegistro}` : ''}</p>
        <Campo id="es-rt-cpf" name="rtCpf" rotulo="CPF do responsável" defaultValue={o.responsavelTecnicoCpf ?? ''} placeholder="000.000.000-00" />
        <Selecao id="es-rt-conselho" name="rtConselho" rotulo="Conselho de classe" defaultValue={o.responsavelTecnicoConselho ?? ''}>
          <option value="">Escolha</option><option value="CREA">CREA</option><option value="CRM">CRM</option><option value="OUTRO">Outro</option>
        </Selecao>
        <Selecao id="es-rt-uf" name="rtUf" rotulo="UF do registro" defaultValue={o.responsavelTecnicoUf ?? ''}>
          <option value="">Escolha</option>{UFS.map((u) => <option key={u}>{u}</option>)}
        </Selecao>
        <div className="flex justify-end md:col-span-3"><Botao type="submit">Salvar</Botao></div>
      </form>
    </Cartao>
  );
}

export function EventosColaboradores({ empresaId, o, agir }: { empresaId: string; o: OrigensEsocial; agir: Agir }) {
  const gerar = (tipo: 's2220' | 's2240', ref: string, corpo: { inicio?: string; retificar?: boolean }) =>
    agir(async () => { const ev = await gerarEventoEsocial(empresaId, tipo, ref, corpo); return `${ev.descricao}: evento assinado e colocado na fila.`; });
  return (
    <Cartao titulo="Exames (S-2220) e riscos (S-2240) por colaborador">
      <p className="mb-4 text-sm text-text/60">
        Confira o CPF e a matrícula de cada pessoa. A matrícula é a mesma que o RH usou no eSocial (evento de admissão).
        Se faltar alguma informação, o sistema avisa o que falta antes de gerar.
      </p>
      <ul className="space-y-3">
        {o.colaboradores.map((c) => (
          <li key={c.id} className="rounded-card border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{c.nome} <span className="font-normal text-text/60">· {c.cargo}{c.ghe ? ` · ${c.ghe}` : ''}</span></p>
            </div>
            <form className="mt-3 grid items-end gap-3 md:grid-cols-[1fr_1fr_8rem_auto]" onSubmit={(ev) => {
              ev.preventDefault();
              const d = new FormData(ev.currentTarget);
              agir(async () => { await salvarEsocialColaborador(empresaId, c.id, { cpf: texto(d, 'cpf'), matricula: texto(d, 'matricula'), codCateg: texto(d, 'codCateg') }); return `Dados de ${c.nome} salvos.`; });
            }}>
              <Campo id={`cpf-${c.id}`} name="cpf" rotulo="CPF" defaultValue={c.cpf ?? ''} placeholder="000.000.000-00" />
              <Campo id={`mat-${c.id}`} name="matricula" rotulo="Matrícula no eSocial" defaultValue={c.matricula ?? ''} />
              <Campo id={`cat-${c.id}`} name="codCateg" rotulo="Categoria" defaultValue={c.codCateg ?? ''} placeholder="Só sem matrícula"
                ajuda={{ oQueE: 'Preencha só para quem não tem matrícula, como estagiário (901) ou diretor sem vínculo. Código da Tabela 01 do eSocial.' }} />
              <Botao type="submit" variante="secundario">Salvar</Botao>
            </form>
            <div className="mt-3 divide-y divide-border text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>Riscos do ambiente de trabalho (S-2240)</span>
                <span className="flex flex-wrap items-center gap-3">
                  <input type="date" id={`ini-${c.id}`} aria-label="Início nessas condições" className="rounded-card border border-border px-2 py-1 text-sm"
                    defaultValue={c.dataAdmissao?.slice(0, 10) ?? ''} title="Data em que começou nessas condições" />
                  <BotoesEvento s={c.s2240} gerar={(retificar) => gerar('s2240', c.id, {
                    retificar, inicio: (document.getElementById(`ini-${c.id}`) as HTMLInputElement | null)?.value || undefined,
                  })} />
                </span>
              </div>
              {c.asos.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>ASO {TIPO_ASO[a.tipo]?.toLowerCase() ?? a.tipo} de {data(a.dataExame)} (S-2220)</span>
                  <BotoesEvento s={a.s2220} gerar={(retificar) => gerar('s2220', a.id, { retificar })} />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

const TP_LOCAL: [number, string][] = [[1, 'Na própria empresa'], [3, 'Em empresa onde presta serviço'], [4, 'Via pública'], [5, 'Área rural'], [6, 'Embarcação'], [9, 'Outros']];

export function EventosCat({ empresaId, o, agir }: { empresaId: string; o: OrigensEsocial; agir: Agir }) {
  const [tab, setTab] = useState<TabelasEsocial | null>(null);
  useEffect(() => { buscarTabelasEsocial().then(setTab).catch(() => setTab(null)); }, []);
  if (!o.cats.length) return null;
  return (
    <Cartao titulo="Acidentes de trabalho (S-2210)">
      <p className="mb-4 text-sm text-text/60">
        Complete os dados do eSocial de cada CAT. Nas listas, digite uma palavra para achar mais rápido (ex.: "mão", "queda", "corte").
      </p>
      <ul className="space-y-3">
        {o.cats.map((c) => {
          const e = c.esocial ?? {};
          return (
            <li key={c.id} className="rounded-card border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{c.colaborador} <span className="font-normal text-text/60">· {new Date(c.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
                <BotoesEvento s={c.s2210} gerar={(retificar) => agir(async () => { const ev = await gerarEventoEsocial(empresaId, 's2210', c.id, { retificar }); return `${ev.descricao}: evento assinado e colocado na fila.`; })} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-primary">Dados para o eSocial</summary>
                <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={(ev) => {
                  ev.preventDefault();
                  const d = new FormData(ev.currentTarget);
                  const op = (k: string) => texto(d, k) || undefined;
                  const num = (k: string) => (texto(d, k) ? Number(texto(d, k)) : undefined);
                  const at = texto(d, 'atendimento');
                  agir(async () => {
                    await salvarEsocialCat(empresaId, c.id, {
                      codSitGeradora: op('sit'), codParteAting: op('parte'), lateralidade: num('lado'), codAgntCausador: op('agente'), codLesao: op('lesao'),
                      tpLocal: num('tpLocal'), logradouro: op('logradouro'), numero: op('numero'), bairro: op('bairro'), cep: op('cep'), codMunic: op('codMunic'), uf: op('uf'),
                      cnpjLocal: op('cnpjLocal'), ultDiaTrab: op('ultDia'), internacao: d.has('internacao'), medicoConselho: num('conselho'), medicoUf: op('medUf'),
                      reciboCatOrigem: op('reciboOrigem'), horasTrabalhadas: op('horas'), atendimentoData: at ? `${at}:00-03:00` : undefined,
                      medicoNome: op('medNome'), medicoCrm: op('medCrm'), cid: op('cid'), diasTratamento: num('dias'),
                    });
                    return 'Dados da CAT salvos.';
                  });
                }}>
                  <EscolhaTabela id={`sit-${c.id}`} name="sit" rotulo="Como aconteceu (situação geradora)" itens={tab?.t15 ?? []} valor={e.codSitGeradora} busca="queda" className="md:col-span-2" />
                  <EscolhaTabela id={`parte-${c.id}`} name="parte" rotulo="Parte do corpo atingida" itens={tab?.t13 ?? []} valor={e.codParteAting} busca="mão" />
                  <Selecao id={`lado-${c.id}`} name="lado" rotulo="Lado" defaultValue={e.lateralidade ?? 0}>
                    <option value={0}>Não se aplica</option><option value={1}>Esquerdo</option><option value={2}>Direito</option><option value={3}>Ambos</option>
                  </Selecao>
                  <EscolhaTabela id={`ag-${c.id}`} name="agente" rotulo="O que causou (agente causador)" itens={c.tipoAcidente === 'DOENCA' ? [...(tab?.t14 ?? []), ...(tab?.t15 ?? [])] : (tab?.t14 ?? [])} valor={e.codAgntCausador} busca="forno" className="md:col-span-2" />
                  <EscolhaTabela id={`les-${c.id}`} name="lesao" rotulo="Tipo de lesão" itens={tab?.t17 ?? []} valor={e.codLesao} busca="queimadura" />
                  <Campo id={`horas-${c.id}`} name="horas" rotulo="Horas trabalhadas antes" defaultValue={c.horasTrabalhadas ?? ''} placeholder="Ex.: 03:30" />
                  <Selecao id={`loc-${c.id}`} name="tpLocal" rotulo="Onde aconteceu" defaultValue={e.tpLocal ?? 1}>
                    {TP_LOCAL.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                  </Selecao>
                  <Campo id={`logr-${c.id}`} name="logradouro" rotulo="Endereço" defaultValue={e.logradouro ?? ''} placeholder="Ex.: Rua das Flores" />
                  <Campo id={`num-${c.id}`} name="numero" rotulo="Número" defaultValue={e.numero ?? ''} placeholder="Ou S/N" />
                  <Campo id={`bai-${c.id}`} name="bairro" rotulo="Bairro" defaultValue={e.bairro ?? ''} />
                  <Campo id={`cep-${c.id}`} name="cep" rotulo="CEP" defaultValue={e.cep ?? ''} placeholder="00000-000" />
                  <Campo id={`mun-${c.id}`} name="codMunic" rotulo="Código IBGE do município" defaultValue={e.codMunic ?? ''} maxLength={7}
                    ajuda={{ oQueE: 'Código de 7 dígitos do município.', ondeAcho: 'No site do IBGE (cidades.ibge.gov.br), ao abrir a cidade.' }} />
                  <Selecao id={`uf-${c.id}`} name="uf" rotulo="UF" defaultValue={e.uf ?? ''}>
                    <option value="">Escolha</option>{UFS.map((u) => <option key={u}>{u}</option>)}
                  </Selecao>
                  <Campo id={`cnpjl-${c.id}`} name="cnpjLocal" rotulo="CNPJ do local (se em outra empresa)" defaultValue={e.cnpjLocal ?? ''} />
                  <Campo id={`ult-${c.id}`} name="ultDia" type="date" rotulo="Último dia trabalhado" defaultValue={e.ultDiaTrab?.slice(0, 10) ?? ''} />
                  <Campo id={`at-${c.id}`} name="atendimento" type="datetime-local" rotulo="Atendimento médico" defaultValue={c.atendimentoData ? new Date(new Date(c.atendimentoData).getTime() - 3 * 3600_000).toISOString().slice(0, 16) : ''} />
                  <Campo id={`mn-${c.id}`} name="medNome" rotulo="Médico ou dentista" defaultValue={c.medicoNome ?? ''} />
                  <Selecao id={`cons-${c.id}`} name="conselho" rotulo="Conselho" defaultValue={e.medicoConselho ?? 1}>
                    <option value={1}>CRM</option><option value={2}>CRO</option><option value={3}>RMS</option>
                  </Selecao>
                  <Campo id={`mc-${c.id}`} name="medCrm" rotulo="Número do registro" defaultValue={c.medicoCrm ?? ''} />
                  <Selecao id={`muf-${c.id}`} name="medUf" rotulo="UF do registro" defaultValue={e.medicoUf ?? ''}>
                    <option value="">Escolha</option>{UFS.map((u) => <option key={u}>{u}</option>)}
                  </Selecao>
                  <Campo id={`cid-${c.id}`} name="cid" rotulo="CID" defaultValue={c.cid ?? ''} placeholder="Ex.: S61.0" />
                  <Campo id={`dias-${c.id}`} name="dias" type="number" min={0} rotulo="Dias de tratamento" defaultValue={c.diasTratamento ?? ''} />
                  {c.tipoCat !== 'INICIAL' && <Campo id={`rec-${c.id}`} name="reciboOrigem" rotulo="Recibo da CAT anterior" defaultValue={e.reciboCatOrigem ?? ''} placeholder="1.1.0000000000000000000" />}
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internacao" defaultChecked={!!e.internacao} /> Houve internação</label>
                  <div className="flex justify-end md:col-span-3"><Botao type="submit" variante="secundario">Salvar dados da CAT</Botao></div>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}

export function EventosAfastamento({ empresaId, o, agir }: { empresaId: string; o: OrigensEsocial; agir: Agir }) {
  if (!o.afastamentos.length) return null;
  const gerar = (id: string, retificar: boolean) =>
    agir(async () => { const ev = await gerarEventoEsocial(empresaId, 's2230', id, { retificar }); return `${ev.descricao}: evento assinado e colocado na fila.`; });
  return (
    <Cartao titulo="Afastamentos (S-2230)">
      <p className="mb-4 text-sm text-text/60">
        Os afastamentos são registrados em Saúde Ocupacional. Se a volta já estiver registrada, o início e a volta vão juntos.
        Se o início já foi aceito, gere de novo depois de registrar a volta para enviar o término.
      </p>
      <ul className="divide-y divide-border text-sm">
        {o.afastamentos.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>{a.colaborador} · motivo {a.motivo} · {data(a.inicio)} {a.fim ? `a ${data(a.fim)}` : '(ainda afastado)'}</span>
            <span className="flex items-center gap-4">
              {a.inicioEvento?.status === 'PROCESSADO'
                ? <><span className="text-xs text-success">Início aceito</span>{a.fim && <BotoesEvento s={a.fimEvento} gerar={() => gerar(a.id, false)} />}</>
                : <BotoesEvento s={a.inicioEvento} gerar={(r) => gerar(a.id, r)} />}
            </span>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

// Exame toxicológico do motorista profissional (categorias C, D e E): admissão, a cada 2 anos e 6 meses, e desligamento.
export function EventosToxicologico({ empresaId, o, agir }: { empresaId: string; o: OrigensEsocial; agir: Agir }) {
  const [aberto, setAberto] = useState(o.toxicologicos.length > 0);
  const [chave, setChave] = useState(0);
  const gerar = (id: string, retificar: boolean) =>
    agir(async () => { const ev = await gerarEventoEsocial(empresaId, 's2221', id, { retificar }); return `${ev.descricao}: evento assinado e colocado na fila.`; });
  return (
    <Cartao titulo="Exame toxicológico de motoristas (S-2221)" acao={!aberto ? <Botao variante="secundario" onClick={() => setAberto(true)}>Registrar exame</Botao> : undefined}>
      <p className="mb-4 text-sm text-text/60">
        Para motoristas profissionais com CNH C, D ou E: exame na admissão, a cada 2 anos e 6 meses e no desligamento. Os dados estão no laudo do laboratório.
      </p>
      {aberto && (
        <form key={chave} className="mb-4 grid gap-3 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            await registrarToxicologico(empresaId, {
              colaboradorId: texto(d, 'colaborador'), dataExame: texto(d, 'data'), cnpjLaboratorio: texto(d, 'cnpj'), codigoExame: texto(d, 'codigo'),
              medicoNome: texto(d, 'medico'), medicoCrm: texto(d, 'crm') || undefined, medicoUf: texto(d, 'uf') || undefined,
            });
            setChave((k) => k + 1); return 'Exame registrado. Agora gere o evento.';
          });
        }}>
          <Selecao id="tx-col" name="colaborador" rotulo="Motorista" required className="md:col-span-2">
            <option value="">Escolha</option>{o.colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.cargo}</option>)}
          </Selecao>
          <Campo id="tx-data" name="data" type="date" rotulo="Data da coleta" required />
          <Campo id="tx-cnpj" name="cnpj" rotulo="CNPJ do laboratório" required placeholder="00.000.000/0000-00" />
          <Campo id="tx-cod" name="codigo" rotulo="Código do exame" required placeholder="AB123456789"
            ajuda={{ oQueE: 'Número do exame que vem no laudo: 2 letras e 9 números.', ondeAcho: 'No laudo do exame toxicológico, emitido pelo laboratório.' }} />
          <Campo id="tx-med" name="medico" rotulo="Médico que assinou o laudo" required />
          <Campo id="tx-crm" name="crm" rotulo="CRM do médico" placeholder="Ex.: 12345" />
          <Selecao id="tx-uf" name="uf" rotulo="UF do CRM"><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</Selecao>
          <div className="flex items-end justify-end"><Botao type="submit">Salvar exame</Botao></div>
        </form>
      )}
      {o.toxicologicos.length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {o.toxicologicos.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{t.colaborador} · {data(t.dataExame)} · exame {t.codigoExame}</span>
              <span className="flex items-center gap-4">
                <BotoesEvento s={t.s2221} gerar={(r) => gerar(t.id, r)} />
                {(!t.s2221 || t.s2221.status === 'PENDENTE' || t.s2221.status === 'ERRO') && (
                  <button className="text-sm text-danger underline" onClick={() => confirm('Apagar este exame?') && agir(async () => { await removerToxicologico(empresaId, t.id); return 'Exame apagado.'; })}>Apagar</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
