'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { buscarCertificado, CertificadoEsocial, DiagnosticoEsocial, esocialGeral, Faixa, ResultadoEmpresas, ResumoEsocialEmpresa } from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const faixa = (f: Faixa) => (f.maximo ? `${reais(f.minimo)} a ${reais(f.maximo)}` : '—');

// eSocial de todas as empresas: diagnóstico com multa estimada e envio de uma vez, com o certificado da consultoria.
export default function EsocialGeralPage() {
  const [diag, setDiag] = useState<DiagnosticoEsocial | null>(null);
  const [resumo, setResumo] = useState<ResumoEsocialEmpresa[]>([]);
  const [cert, setCert] = useState<CertificadoEsocial | null>(null);
  const [resultado, setResultado] = useState<ResultadoEmpresas | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok' | 'info'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [d, r, c] = await Promise.all([esocialGeral.diagnostico(), esocialGeral.resumo(), buscarCertificado()]);
      setDiag(d); setResumo(r); setCert(c);
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, []);

  useEffect(() => {
    if (ehEmpresa()) { setAviso({ tipo: 'info', texto: 'O eSocial é feito pela sua consultoria.' }); return; }
    recarregar();
  }, [recarregar]);

  async function agir(acao: () => Promise<ResultadoEmpresas>, ok: string) {
    setOcupado(true); setResultado(null);
    try { const r = await acao(); setResultado(r); setAviso({ tipo: r.every((x) => x.ok) ? 'ok' : 'info', texto: ok }); await recarregar(); }
    catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
    finally { setOcupado(false); }
  }

  const pendentes = resumo.reduce((s, e) => s + e.pendentes + e.erros, 0);
  const aguardando = resumo.reduce((s, e) => s + e.enviados, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">eSocial de todas as empresas</h1>
        <p className="text-text/60">O que falta enviar, quanto isso pode custar em multa e o envio de todas as empresas de uma vez.</p>
      </div>

      {aviso && <div className="sticky top-2 z-10 shadow-sm"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}

      {diag && (
        <Cartao titulo="Diagnóstico: o que falta e a multa que pode vir">
          <div className="mb-4 rounded-card bg-danger/5 p-4">
            <p className="text-sm text-text/70">Multa estimada somando todas as empresas</p>
            <p className="text-2xl font-semibold text-danger">{diag.total.maximo ? faixa(diag.total) : 'Nada pendente. Tudo em dia!'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text/60">
                  <th className="py-2">Empresa</th>
                  <th className="py-2 text-right" title="Trabalhadores sem o evento de riscos aceito">Sem S-2240</th>
                  <th className="py-2 text-right" title="ASOs desde 2023 sem o evento aceito">ASO sem S-2220</th>
                  <th className="py-2 text-right" title="CATs sem o evento aceito">CAT sem S-2210</th>
                  <th className="py-2 text-right" title="Afastamentos por doença ou acidente sem o evento aceito">Afast. sem S-2230</th>
                  <th className="py-2 text-right" title="Trabalhadores sem CPF ou sem matrícula do eSocial">Cadastro incompleto</th>
                  <th className="py-2 text-right">Multa estimada</th>
                </tr>
              </thead>
              <tbody>
                {diag.empresas.map((e) => {
                  const n = (v: number) => <td className={`py-2 text-right ${v ? 'font-semibold text-danger' : 'text-text/40'}`}>{v}</td>;
                  return (
                    <tr key={e.empresaId} className="border-b border-border">
                      <td className="py-2 pr-2"><Link href={`/empresas/${e.empresaId}/esocial`} className="text-primary underline">{e.razaoSocial}</Link><span className="block text-xs text-text/50">{e.trabalhadores} trabalhador(es){e.faltas.erros ? ` · ${e.faltas.erros} recusado(s)` : ''}</span></td>
                      {n(e.faltas.s2240)}{n(e.faltas.s2220)}{n(e.faltas.s2210)}{n(e.faltas.s2230)}{n(e.faltas.cadastros)}
                      <td className="py-2 text-right font-semibold">{faixa(e.multa)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-text/50">
            Valores por item: ASO sem S-2220 {faixa(diag.valores.s2220)}; trabalhador sem S-2240 {faixa(diag.valores.s2240)}; CAT sem S-2210 {faixa(diag.valores.s2210)}. {diag.nota}
            {' '}O diagnóstico olha o que está cadastrado no Safety Nexo; ele não consulta a base do governo.
          </p>
        </Cartao>
      )}

      <Cartao titulo="Enviar de todas as empresas" acao={
        <div className="flex flex-wrap gap-2">
          <Botao disabled={ocupado || !pendentes || !cert} onClick={() => agir(esocialGeral.enviarTodas, 'Envio terminado. Veja o resultado de cada empresa abaixo.')}>Enviar pendentes de todas ({pendentes})</Botao>
          <Botao variante="secundario" disabled={ocupado || !aguardando || !cert} onClick={() => agir(esocialGeral.consultarTodas, 'Respostas do governo atualizadas.')}>Ver respostas do governo ({aguardando})</Botao>
        </div>}>
        <p className="mb-4 text-sm text-text/60">
          {cert ? `Usa o certificado de ${cert.titular} para todas as empresas.` : 'Cadastre o certificado digital da consultoria na tela de eSocial de qualquer empresa.'}
          {' '}Os eventos são gerados em cada empresa; aqui você manda todos de uma vez.
        </p>
        {resultado && (
          <ul className="mb-4 divide-y divide-border rounded-card border border-border text-sm">
            {resultado.map((r) => (
              <li key={r.empresa} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                <span className="font-semibold">{r.empresa}</span>
                <span className={r.ok ? 'text-success' : 'text-danger'}>
                  {r.ok ? (r.eventos !== undefined ? `${r.eventos} evento(s) enviado(s)` : `${r.atualizados} com resposta`) : r.mensagem}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-border text-left text-text/60"><th className="py-2">Empresa</th><th className="py-2 text-right">Na fila</th><th className="py-2 text-right">Aguardando governo</th><th className="py-2 text-right">Aceitos</th><th className="py-2 text-right">Recusados</th><th className="py-2">Ambiente</th></tr></thead>
            <tbody>
              {resumo.map((e) => (
                <tr key={e.id} className="border-b border-border">
                  <td className="py-2"><Link href={`/empresas/${e.id}/esocial`} className="text-primary underline">{e.razaoSocial}</Link></td>
                  <td className="py-2 text-right">{e.pendentes}</td><td className="py-2 text-right">{e.enviados}</td>
                  <td className="py-2 text-right text-success">{e.aceitos}</td><td className={`py-2 text-right ${e.erros ? 'text-danger' : ''}`}>{e.erros}</td>
                  <td className="py-2 text-xs text-text/60">{e.esocialAmbiente === 'PRODUCAO' ? 'Produção' : 'Testes'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </main>
  );
}
