'use client';

import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import { buscarCipa, Cipa, gerarCipa, salvarArquivo, salvarCipa } from '@/lib/api';

const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// Explica o resultado do Quadro I da NR-05 em linguagem simples.
function ResumoCipa({ cipa }: { cipa: Cipa }) {
  const d = cipa.dimensionamento;
  if (d.situacao === 'SEM_GRAU') {
    return <Aviso tipo="info">Informe o CNAE ou o grau de risco nos dados da empresa para o sistema calcular a CIPA.</Aviso>;
  }
  if (d.situacao === 'REPRESENTANTE') {
    return (
      <p className="text-sm">
        Com {cipa.numFuncionarios} funcionário(s) no grau de risco {cipa.grauRisco}, a empresa <strong>não precisa de CIPA</strong> (passa a precisar a
        partir de {d.minimoParaCipa}).{' '}
        {cipa.atendidaSesmt
          ? 'Como é atendida por SESMT, ele cumpre esse papel.'
          : 'Ela deve nomear um representante entre os funcionários para ajudar na prevenção.'}
      </p>
    );
  }
  const c = cipa.calendario;
  return (
    <div className="space-y-3 text-sm">
      <p>
        Com {cipa.numFuncionarios} funcionário(s) no grau de risco {cipa.grauRisco}, a CIPA precisa de{' '}
        <strong>{d.efetivos} efetivo(s) e {d.suplentes} suplente(s) eleitos pelos funcionários</strong>, e o mesmo número indicado pela empresa.
      </p>
      {c && (
        <ul className="grid gap-2 md:grid-cols-4">
          {[
            ['Fim do mandato', c.fimMandato],
            ['Publicar edital até', c.convocacaoAte],
            ['Eleição até', c.eleicaoAte],
            ['Posse da nova gestão', c.posse],
          ].map(([rotulo, data]) => (
            <li key={rotulo} className="rounded-card border border-border bg-background px-3 py-2">
              <span className="block text-xs text-text/60">{rotulo}</span>
              <strong>{dataBr(data)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Dimensionamento da CIPA (NR-05): quantas pessoas, calendário do mandato e o PDF.
// Fica na tela da CIPA (consultoria) e no cadastro que a empresa cliente vê.
export function DimensionamentoCipa({ empresaId, nomeEmpresa, cliente, irParaEleicao }: {
  empresaId: string; nomeEmpresa: string; cliente: boolean; irParaEleicao?: () => void;
}) {
  const [cipa, setCipa] = useState<Cipa | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const carregar = useCallback(() => buscarCipa(empresaId).then(setCipa).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message })), [empresaId]);
  useEffect(() => { carregar(); }, [carregar]);

  if (!cipa) return aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : null;
  const texto = (d: FormData, campo: string) => String(d.get(campo) ?? '').trim();

  async function baixar() {
    try { salvarArquivo(await gerarCipa(empresaId), `CIPA-${nomeEmpresa}.pdf`); setAviso({ tipo: 'ok', texto: 'Dimensionamento da CIPA gerado.' }); }
    catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  return (
    <Cartao
      titulo="Dimensionamento da CIPA"
      id="cipa"
      acao={cipa.dimensionamento.situacao !== 'SEM_GRAU' && (
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" onClick={baixar}>Baixar dimensionamento</Botao>
          {cipa.dimensionamento.situacao === 'CIPA' && !cliente && irParaEleicao && <Botao onClick={irParaEleicao}>Organizar eleição →</Botao>}
        </div>
      )}
    >
      {aviso && <div className="mb-3"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      <ResumoCipa cipa={cipa} />
      {cipa.dimensionamento.situacao !== 'SEM_GRAU' && !cliente && (
        <form
          className="mt-4 grid gap-4 md:grid-cols-3"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const d = new FormData(ev.currentTarget);
            try {
              await salvarCipa(empresaId, {
                atendidaSesmt: d.get('atendidaSesmt') === 'on',
                ...(texto(d, 'inicioMandato') ? { inicioMandato: texto(d, 'inicioMandato') } : {}),
                ...(d.has('representante') ? { representante: texto(d, 'representante') } : {}),
              });
              setAviso({ tipo: 'ok', texto: 'CIPA salva.' });
              await carregar();
            } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
          }}
        >
          <Campo id="cipa-inicio" name="inicioMandato" type="date" rotulo="Início do mandato atual"
            defaultValue={cipa.calendario?.inicioMandato.slice(0, 10) ?? ''} />
          {cipa.dimensionamento.situacao === 'REPRESENTANTE' && (
            <Campo id="cipa-representante" name="representante" rotulo="Representante nomeado" placeholder="Ex.: João Lima"
              defaultValue={cipa.representante ?? ''} />
          )}
          <label className="flex min-h-[44px] items-center gap-2 self-end pb-1 text-sm">
            <input type="checkbox" name="atendidaSesmt" defaultChecked={cipa.atendidaSesmt} className="h-5 w-5 accent-primary" />
            Empresa atendida por SESMT
          </label>
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Salvar CIPA</Botao></div>
        </form>
      )}
    </Cartao>
  );
}
