'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { buscarEmpresa, Conferencia, conferirDocumentos, Empresa, GravidadeConferencia, ItemConferencia } from '@/lib/api';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const GRAVIDADE: Record<GravidadeConferencia, [string, string]> = {
  ALTA: ['Corrigir primeiro', 'bg-danger text-white'],
  MEDIA: ['Importante', 'bg-warning text-white'],
  BAIXA: ['Ajuste', 'bg-background text-text'],
};
const corNota = (n: number) => (n >= 90 ? '#10B981' : n >= 70 ? '#0E4A5B' : n >= 50 ? '#FF8C69' : '#EF4444');

function Anel({ nota }: { nota: number }) {
  const r = 52; const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 130 130" className="h-32 w-32 shrink-0" role="img" aria-label={`Nota ${nota} de 100`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={corNota(nota)} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(nota / 100) * c} ${c}`} transform="rotate(-90 65 65)" />
      <text x="65" y="72" textAnchor="middle" className="fill-text text-3xl font-semibold">{nota}</text>
    </svg>
  );
}

export default function ConferenciaPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [c, setC] = useState<Conferencia | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const conferir = useCallback(() => {
    setCarregando(true);
    conferirDocumentos(empresaId).then(setC).catch((e: Error) => setErro(e.message)).finally(() => setCarregando(false));
  }, [empresaId]);
  useEffect(() => { buscarEmpresa(empresaId).then(setEmpresa).catch((e: Error) => setErro(e.message)); conferir(); }, [empresaId, conferir]);

  const link = (i: ItemConferencia) => (i.link === '/emitir' ? '/emitir' : i.link.startsWith('#') ? `/empresas/${empresaId}${i.link}` : `/empresas/${empresaId}${i.link}`);
  // A revisão do PGR já tem o próprio quadro: o item só conta na nota.
  const visiveis = c ? c.itens.filter((i) => i.id !== 'revisao') : [];
  const grupos = [...new Set(visiveis.map((i) => i.grupo))];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-2xl font-semibold text-primary sm:text-3xl">Conferência dos documentos</h1>
        <p className="text-text/60">{empresa?.razaoSocial ?? ''}</p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <Cartao titulo="Como está a empresa" acao={<Botao variante="secundario" disabled={carregando} onClick={conferir}>{carregando ? 'Conferindo…' : 'Conferir de novo'}</Botao>}>
        {!c ? <p className="text-sm text-text/60">Conferindo os documentos…</p> : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <Anel nota={c.nota} />
            <div className="space-y-2 text-sm">
              <p className="text-lg font-semibold" style={{ color: corNota(c.nota) }}>{c.faixa}</p>
              <p className="text-text/70">O sistema cruzou o PGR com o PCMSO, o LTCAT, o plano de ação, os treinamentos, as fichas de EPI, os ASOs e o eSocial, e listou abaixo o que não bate. Cada item em vermelho tira 12 pontos, em laranja 6 e os ajustes 2.</p>
              <p className="text-xs text-text/50">É um olhar de auditor para ajudar na revisão. Quem decide é a responsável técnica.</p>
            </div>
          </div>
        )}
      </Cartao>

      {c && c.revisao.ultimoPgr && (
        <Cartao titulo="Revisão do PGR">
          <p className="text-sm text-text/70">Último PGR em <strong>{data(c.revisao.ultimoPgr)}</strong>. Pela NR-01 (1.5.4.4.6), revisar até <strong>{data(c.revisao.venceEm)}</strong> ou antes, se algo mudar.</p>
          {c.revisao.motivos.length === 0 ? <p className="mt-2 text-sm text-success">Nada mudou desde o último PGR. ✓</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {c.revisao.motivos.map((m) => (
                <li key={m.texto} className="rounded-card border border-border p-3">
                  <strong>{m.texto}</strong>
                  <p className="text-text/70">{m.detalhe}</p>
                  <p className="text-xs text-text/50">Motivo da NR-01: {m.base}</p>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      )}

      {c && (visiveis.length === 0 ? (
        <Cartao titulo="O que não bate"><p className="text-sm text-success">{c.semDados ? 'Cadastre os GHEs e os riscos para o sistema poder conferir.' : 'Tudo batendo entre os documentos. ✓'}</p></Cartao>
      ) : grupos.map((g) => (
        <Cartao key={g} titulo={g}>
          <ul className="space-y-3">
            {visiveis.filter((i) => i.grupo === g).map((i) => (
              <li key={i.id} className="rounded-card border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${GRAVIDADE[i.gravidade][1]}`}>{GRAVIDADE[i.gravidade][0]}</span>
                  <strong className="break-words">{i.titulo}</strong>
                </div>
                <p className="mt-1 break-words text-text/70">{i.detalhe}</p>
                <p className="mt-2"><span className="font-semibold">Como corrigir:</span> {i.corrigir}</p>
                <Link href={link(i)} className="mt-2 inline-block font-semibold text-primary underline">Ir para a tela →</Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )))}
    </main>
  );
}
