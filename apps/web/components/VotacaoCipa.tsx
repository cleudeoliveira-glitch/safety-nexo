'use client';

import { useCallback, useEffect, useState } from 'react';
import { Botao, Cartao } from './ui';
import { salvarArquivo, SituacaoVotacao, votacaoCipa } from '@/lib/api';

const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
// Valor para <input type="datetime-local"> no horário do aparelho.
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const ESTADO: Record<SituacaoVotacao['estado'], [string, string]> = {
  NAO_ABERTA: ['Não aberta', 'bg-background'], AGENDADA: ['Agendada', 'bg-warning text-white'], ABERTA: ['Votação aberta', 'bg-success text-white'],
  ENCERRADA: ['Encerrada: falta apurar', 'bg-warning text-white'], APURADA: ['Apurada', 'bg-primary text-white'],
};

// Votação da CIPA pelo celular: cada funcionário recebe um link pessoal. Voto secreto (NR-05, 5.5.3).
export function VotacaoCelular({ empresaId, eleicaoId, eleicaoEm, consultoria, aoApurar, avisar }: {
  empresaId: string; eleicaoId: string; eleicaoEm: string; consultoria: boolean; aoApurar: () => Promise<void>; avisar: (tipo: 'erro' | 'ok', texto: string) => void;
}) {
  const [s, setS] = useState<SituacaoVotacao | null>(null);
  const [verLista, setVerLista] = useState(false);
  const carregar = useCallback(() => votacaoCipa.situacao(empresaId, eleicaoId).then(setS).catch((e: Error) => avisar('erro', e.message)), [empresaId, eleicaoId, avisar]);
  useEffect(() => { carregar(); }, [carregar]);

  async function agir(f: () => Promise<SituacaoVotacao>, ok: string) {
    try { setS(await f()); avisar('ok', ok); } catch (e) { avisar('erro', (e as Error).message); }
  }

  function abrir(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    agir(() => votacaoCipa.abrir(empresaId, eleicaoId, { inicio: new Date(String(d.get('inicio'))).toISOString(), fim: new Date(String(d.get('fim'))).toISOString() }), 'Votação pronta. Mande o link de cada funcionário ou imprima os códigos.');
  }

  if (!s) return null;
  const dia = new Date(`${eleicaoEm.slice(0, 10)}T08:00`);
  const ate = new Date(`${eleicaoEm.slice(0, 10)}T17:00`);
  return (
    <Cartao titulo="Votação pelo celular" acao={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADO[s.estado][1]}`}>{ESTADO[s.estado][0]}</span>}>
      <div className="space-y-4 text-sm">
        <p className="text-text/70">Cada funcionário recebe um link pessoal (ou um papel com QR code) e vota pelo celular. <strong>O voto é secreto:</strong> o sistema guarda só que a pessoa votou, nunca em quem. Quem tem CPF no cadastro confirma os 3 primeiros números. A NR-05 pede votação em horário de trabalho e apuração acompanhada por representantes da empresa e dos empregados.</p>
        {consultoria && s.estado !== 'APURADA' && (
          <form className="flex flex-wrap items-end gap-3" onSubmit={abrir}>
            <label className="text-sm font-semibold">Início<input name="inicio" type="datetime-local" required defaultValue={s.inicio ? local(new Date(s.inicio)) : local(dia)} className="mt-1 block rounded-card border border-border bg-background px-3 py-2" /></label>
            <label className="text-sm font-semibold">Fim<input name="fim" type="datetime-local" required defaultValue={s.fim ? local(new Date(s.fim)) : local(ate)} className="mt-1 block rounded-card border border-border bg-background px-3 py-2" /></label>
            <Botao type="submit">{s.estado === 'NAO_ABERTA' ? 'Preparar votação' : 'Salvar horário'}</Botao>
          </form>
        )}
        {s.estado !== 'NAO_ABERTA' && (<>
          <p><strong>{s.votaram} de {s.total}</strong> funcionário(s) votaram ({s.total ? Math.round((s.votaram / s.total) * 100) : 0}%) · de {quando(s.inicio)} até {quando(s.fim)}</p>
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" onClick={() => setVerLista(!verLista)}>{verLista ? 'Esconder os links' : 'Ver o link de cada funcionário'}</Botao>
            <Botao variante="secundario" onClick={async () => { try { salvarArquivo(await votacaoCipa.tirinhas(empresaId, eleicaoId), 'Codigos-votacao-CIPA.pdf'); } catch (e) { avisar('erro', (e as Error).message); } }}>Imprimir códigos (papel com QR)</Botao>
            {consultoria && s.estado === 'ABERTA' && <Botao variante="secundario" onClick={() => { if (window.confirm('Encerrar a votação agora? Ninguém mais consegue votar.')) agir(() => votacaoCipa.encerrar(empresaId, eleicaoId), 'Votação encerrada.'); }}>Encerrar agora</Botao>}
            {consultoria && s.estado === 'ENCERRADA' && <Botao onClick={() => agir(async () => { const r = await votacaoCipa.apurar(empresaId, eleicaoId); await aoApurar(); return r; }, 'Votos levados para a tabela de candidatos. Confira e gere a ata de eleição.')}>Apurar e levar os votos</Botao>}
          </div>
          {verLista && (
            <ul className="max-h-80 divide-y divide-border overflow-auto rounded-card border border-border">
              {s.eleitores.map((x) => (
                <li key={x.codigo} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span>{x.nome} <span className="text-text/60">· {x.cargo}</span></span>
                  {x.votou ? <span className="text-xs font-semibold text-success">✓ votou</span> : (
                    <span className="flex gap-3 text-xs">
                      <a className="font-semibold text-primary underline" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Eleição da CIPA: vote pelo seu link pessoal (não repasse): ${x.link}`)}`}>WhatsApp</a>
                      <button className="font-semibold text-primary underline" onClick={() => navigator.clipboard?.writeText(x.link).then(() => avisar('ok', `Link de ${x.nome} copiado.`))}>Copiar</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {s.resultado && (
            <div className="rounded-card bg-background p-3">
              <p className="font-semibold">Resultado</p>
              <ul className="mt-1">{s.resultado.candidatos.map((c) => <li key={c.nome}>{c.nome}: <strong>{c.votos}</strong></li>)}</ul>
              <p className="mt-1 text-text/60">Brancos: {s.resultado.brancos} · Nulos: {s.resultado.nulos}</p>
              {s.estado === 'APURADA' && <p className="mt-1 text-xs text-text/60">Se também houve voto em papel, some na tabela de candidatos acima.</p>}
            </div>
          )}
        </>)}
      </div>
    </Cartao>
  );
}
