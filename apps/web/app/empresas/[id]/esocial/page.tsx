'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import {
  baixarXmlEsocial,
  buscarCertificado,
  buscarEmpresa,
  CertificadoEsocial,
  consultarEsocial,
  Empresa,
  enviarCertificado,
  EventoEsocial,
  listarEventosEsocial,
  removerCertificado,
  transmitirEsocial,
} from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const STATUS: Record<EventoEsocial['status'], { nome: string; cor: string }> = {
  PENDENTE: { nome: 'Aguardando envio', cor: 'bg-warning/15 text-warning' },
  ENVIADO: { nome: 'Enviado, aguardando o governo', cor: 'bg-primary/10 text-primary' },
  PROCESSADO: { nome: 'Aceito', cor: 'bg-success/15 text-success' },
  ERRO: { nome: 'Recusado', cor: 'bg-danger/15 text-danger' },
};
const TIPOS: Record<string, string> = {
  'S-2210': 'Comunicação de acidente (CAT)',
  'S-2220': 'Exame ocupacional (ASO)',
  'S-2240': 'Condições ambientais (riscos)',
};

export default function EsocialPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cert, setCert] = useState<CertificadoEsocial | null | undefined>(undefined);
  const [eventos, setEventos] = useState<EventoEsocial[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [chave, setChave] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok' | 'info'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, c, ev] = await Promise.all([buscarEmpresa(empresaId), buscarCertificado(), listarEventosEsocial(empresaId)]);
      setEmpresa(e); setCert(c); setEventos(ev);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
    if (ehEmpresa()) { setAviso({ tipo: 'info', texto: 'O envio ao eSocial é feito pela sua consultoria.' }); return; }
    recarregar();
  }, [recarregar]);

  async function agir(acao: () => Promise<string>) {
    setOcupado(true);
    try {
      const texto = await acao();
      setAviso({ tipo: 'ok', texto });
      await recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  if (!empresa || cert === undefined) return <main className="p-10">{aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  const venceEm = cert ? Math.ceil((new Date(cert.validoAte).getTime() - Date.now()) / 86_400_000) : null;
  const pendentes = eventos.filter((e) => (e.status === 'PENDENTE' || e.status === 'ERRO') && !e.protocolo).length;
  const aguardando = eventos.filter((e) => e.status === 'ENVIADO').length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">eSocial</h1>
        <p className="text-text/60">{empresa.razaoSocial}</p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Cartao titulo="Certificado digital da consultoria">
        <p className="mb-4 text-sm text-text/60">
          Um único certificado A1 (arquivo .pfx ou .p12) da sua consultoria serve para enviar os eventos de todas as empresas clientes.
          O arquivo e a senha ficam guardados de forma cifrada e nunca são mostrados de novo.
        </p>
        {cert ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border p-4">
            <div>
              <p className="font-semibold">{cert.titular}</p>
              <p className="text-sm text-text/60">{cert.tipoDocumento} {cert.documento} · válido até {data(cert.validoAte)}</p>
              {venceEm !== null && venceEm <= 30 && <p className="text-sm text-danger">Vence em {venceEm} dia(s). Renove e envie o novo arquivo.</p>}
            </div>
            <Botao variante="secundario" disabled={ocupado} onClick={() => {
              if (confirm('Remover o certificado? Os envios ficam parados até cadastrar outro.')) agir(async () => { await removerCertificado(); return 'Certificado removido.'; });
            }}>Remover</Botao>
          </div>
        ) : null}
        <form key={chave} className="mt-4 grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(ev) => {
          ev.preventDefault();
          if (!arquivo) { setAviso({ tipo: 'erro', texto: 'Escolha o arquivo do certificado.' }); return; }
          agir(async () => {
            const c = await enviarCertificado(arquivo, senha);
            setArquivo(null); setSenha(''); setChave((k) => k + 1);
            return `Certificado de ${c.titular} cadastrado.`;
          });
        }}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{cert ? 'Trocar por outro certificado' : 'Arquivo do certificado A1'}</span>
            <input type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
          <Campo id="senha-cert" rotulo="Senha do certificado" type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <Botao type="submit" disabled={ocupado}>Salvar certificado</Botao>
        </form>
      </Cartao>

      <Cartao titulo="Eventos de SST" acao={
        <div className="flex flex-wrap gap-2">
          <Botao disabled={ocupado || !pendentes || !cert} onClick={() => agir(async () => {
            const r = await transmitirEsocial(empresaId);
            const total = r.reduce((s, l) => s + l.eventos, 0);
            return `${total} evento(s) enviado(s). ${r.map((l) => l.descResposta).filter(Boolean).join(' ')}`.trim();
          })}>Enviar pendentes ({pendentes})</Botao>
          <Botao variante="secundario" disabled={ocupado || !aguardando} onClick={() => agir(async () => {
            const r = await consultarEsocial(empresaId);
            return r.atualizados ? `${r.atualizados} evento(s) com resposta do governo.` : 'O governo ainda não respondeu. Tente de novo em alguns minutos.';
          })}>Ver resposta do governo ({aguardando})</Botao>
        </div>
      }>
        <p className="mb-4 text-sm text-text/60">
          Aqui ficam os eventos de CAT (S-2210), exames (S-2220) e riscos (S-2240) desta empresa. Envie os pendentes e, depois de alguns minutos, veja a resposta do governo.
        </p>
        {!eventos.length ? (
          <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-text/60">Nenhum evento na fila desta empresa.</p>
        ) : (
          <ul className="divide-y divide-border">
            {eventos.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{ev.tipo} · {TIPOS[ev.tipo] ?? ''}</p>
                  <p className="text-sm text-text/70">{ev.descricao}</p>
                  <p className="text-xs text-text/50">
                    Criado em {dataHora(ev.createdAt)}{ev.ambiente === 'PRODUCAO_RESTRITA' ? ' · ambiente de testes' : ''}
                    {ev.protocolo ? ` · protocolo ${ev.protocolo}` : ''}{ev.recibo ? ` · recibo ${ev.recibo}` : ''}
                  </p>
                  {ev.status === 'ERRO' && ev.mensagens?.map((m, i) => (
                    <p key={i} className="text-sm text-danger">{m.codigo ? `${m.codigo}: ` : ''}{m.descricao}</p>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[ev.status].cor}`}>{STATUS[ev.status].nome}</span>
                  <button className="text-sm text-primary underline" onClick={() => baixarXmlEsocial(empresaId, ev).catch((e) => setAviso({ tipo: 'erro', texto: e.message }))}>XML</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
