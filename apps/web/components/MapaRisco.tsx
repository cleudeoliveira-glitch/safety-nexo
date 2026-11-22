'use client';

import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { gerarDocumento, Ghe, listarGhes, salvarArquivo } from '@/lib/api';
import { GRUPOS_MAPA, montarSetores, ORDEM_GRUPOS, SetorMapa, TAMANHOS_MAPA, Tamanho } from '@/lib/mapaRisco';

// Desenho de um setor: os círculos em fileiras, que se ajustam à largura da tela (celular também).
function DesenhoSetor({ setor }: { setor: SetorMapa }) {
  return (
    <figure className="overflow-hidden rounded-card border-2 border-primary bg-background">
      <figcaption className="flex flex-wrap items-center justify-between gap-1 bg-primary px-3 py-1.5 text-sm font-semibold text-white">
        <span className="min-w-0 break-words">{setor.nome}</span>
        <span className="text-xs font-normal">{setor.trabalhadores} trabalhador(es)</span>
      </figcaption>
      {setor.circulos.length === 0 ? (
        <p className="p-4 text-sm text-text/60">Nenhum risco cadastrado neste setor. Cadastre os riscos no GHE.</p>
      ) : (
        <ul className="flex flex-wrap items-start gap-x-2 gap-y-3 p-3">
          {setor.circulos.map((c) => {
            const g = GRUPOS_MAPA[c.grupo];
            const d = TAMANHOS_MAPA[c.tamanho].raio * 2;
            return (
              <li key={c.numero} className="flex w-[84px] flex-col items-center text-center" title={`${g.nome} · ${TAMANHOS_MAPA[c.tamanho].nome} · ${c.fontes.join('; ')}`}>
                <span className="flex h-[60px] items-center justify-center">
                  <span className="flex items-center justify-center rounded-full border border-text/70 text-xs font-bold"
                    style={{ width: d, height: d, background: g.cor, color: g.texto }}>{c.numero}</span>
                </span>
                <span className="mt-1 line-clamp-2 break-words text-[11px] leading-tight text-text/80">{c.agente}</span>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}

function Legenda() {
  return (
    <div className="grid gap-3 rounded-card border border-border p-3 text-xs sm:grid-cols-2">
      <div className="space-y-1">
        <p className="font-semibold text-primary">Cor = tipo de risco</p>
        {ORDEM_GRUPOS.map((k) => (
          <p key={k} className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-text/60" style={{ background: GRUPOS_MAPA[k].cor }} />
            <strong>{GRUPOS_MAPA[k].nome}</strong> <span className="text-text/60">{GRUPOS_MAPA[k].exemplos}</span>
          </p>
        ))}
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-primary">Tamanho = intensidade</p>
        {(Object.keys(TAMANHOS_MAPA) as Tamanho[]).map((k) => (
          <p key={k} className="flex items-center gap-2">
            <span className="inline-block shrink-0 rounded-full border border-text/60 bg-text/30" style={{ width: TAMANHOS_MAPA[k].raio, height: TAMANHOS_MAPA[k].raio }} />
            <strong>{TAMANHOS_MAPA[k].nome}</strong> <span className="text-text/60">{TAMANHOS_MAPA[k].explica}</span>
          </p>
        ))}
        <p className="pt-1 text-text/60">O tamanho sai sozinho do nível do risco no GHE (severidade x probabilidade).</p>
      </div>
    </div>
  );
}

// Mapa de risco da empresa, montado com os riscos dos GHEs. Fica na parte da CIPA.
export function MapaRisco({ empresaId, nomeEmpresa }: { empresaId: string; nomeEmpresa: string }) {
  const [ghes, setGhes] = useState<Ghe[] | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    try { setGhes(await listarGhes(empresaId)); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => { carregar(); }, [carregar]);

  async function baixar() {
    try {
      salvarArquivo(await gerarDocumento(empresaId, 'mapa-risco'), `Mapa-de-risco-${nomeEmpresa}.pdf`);
      setAviso({ tipo: 'ok', texto: 'Mapa de risco gerado: uma folha por setor, deitada, para afixar.' });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  const setores = ghes ? montarSetores(ghes) : [];
  const semRisco = ghes !== null && !ghes.some((g) => g.riscos.length);

  return (
    <Cartao titulo="Mapa de risco" id="mapa" acao={ghes?.length ? <Botao onClick={baixar}>Baixar PDF para afixar</Botao> : undefined}>
      <p className="mb-4 text-sm text-text/60">
        O desenho que fica na parede de cada setor, mostrando os riscos do lugar. Ele é montado sozinho com os riscos que você já cadastrou nos GHEs:
        a cor diz o tipo de risco e o tamanho do círculo diz a intensidade. O PDF sai com uma folha por setor e a tabela de cada risco, de onde vem e como se proteger.
      </p>
      {aviso && <div className="mb-4"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      {ghes === null && <p className="text-sm text-text/60">Carregando…</p>}
      {ghes?.length === 0 && (
        <Aviso tipo="info">Esta empresa ainda não tem GHE. Cadastre os GHEs e os riscos em <a className="font-semibold underline" href={`/empresas/${empresaId}#ghes`}>GHEs, riscos e exames</a> e o mapa aparece aqui.</Aviso>
      )}
      {semRisco && <div className="mb-4"><Aviso tipo="info">Os GHEs ainda não têm riscos. Cadastre os riscos e o mapa se monta sozinho.</Aviso></div>}
      {setores.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {setores.map((s) => <DesenhoSetor key={s.nome} setor={s} />)}
          </div>
          <Legenda />
          <p className="text-xs text-text/60">
            Mostre o desenho aos trabalhadores de cada setor antes de afixar e ajuste o GHE se eles apontarem algo que faltou. Quando mudar máquina,
            processo ou layout, gere o mapa de novo.
          </p>
        </div>
      )}
    </Cartao>
  );
}
