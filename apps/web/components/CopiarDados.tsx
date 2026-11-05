'use client';

import { useEffect, useState } from 'react';
import { Botao, Selecao } from '@/components/ui';
import { copiarDadosDe, Empresa, Ghe, listarEmpresas, listarGhes } from '@/lib/api';

// Copiar GHEs, riscos e exames de uma empresa parecida (ex.: outra padaria), para não digitar tudo de novo.
export function CopiarDados({ empresaId, aoCopiar }: { empresaId: string; aoCopiar: (texto: string, erro?: boolean) => void }) {
  const [aberto, setAberto] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [origem, setOrigem] = useState('');
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [responsaveis, setResponsaveis] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { if (aberto && !empresas.length) listarEmpresas().then((l) => setEmpresas(l.filter((e) => e.id !== empresaId))).catch(() => undefined); }, [aberto, empresas.length, empresaId]);
  useEffect(() => {
    setGhes([]); setMarcados([]);
    if (origem) listarGhes(origem).then((g) => { setGhes(g); setMarcados(g.map((x) => x.id)); }).catch(() => undefined);
  }, [origem]);

  if (!aberto) return <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setAberto(true)}>Copiar de outra empresa</button>;

  async function copiar() {
    setOcupado(true);
    try {
      const r = await copiarDadosDe(empresaId, { origemId: origem, gheIds: marcados, responsaveis });
      const partes = [r.copiados.length ? `${r.copiados.length} GHE(s) copiado(s) com riscos e exames` : 'Nenhum GHE copiado'];
      if (r.pulados.length) partes.push(`já existiam aqui: ${r.pulados.join(', ')}`);
      if (r.responsaveis) partes.push('médico do PCMSO e responsável técnico copiados');
      aoCopiar(`${partes.join('; ')}. Confira as medições: cada empresa tem as suas.`);
      setAberto(false); setOrigem('');
    } catch (e) { aoCopiar((e as Error).message, true); } finally { setOcupado(false); }
  }

  return (
    <div className="mt-4 space-y-3 rounded-card border border-primary/40 bg-background p-4">
      <p className="text-sm font-semibold">Copiar de outra empresa</p>
      <p className="text-xs text-text/60">Traz os GHEs com riscos, avaliações e exames. GHE com o mesmo nome que já existe aqui não é copiado de novo.</p>
      <Selecao id="cp-origem" rotulo="Empresa de onde copiar" value={origem} onChange={(e) => setOrigem(e.target.value)}>
        <option value="">Escolha</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
      </Selecao>
      {origem && (ghes.length ? (
        <fieldset className="space-y-1 text-sm">
          <legend className="mb-1 font-medium">GHEs</legend>
          {ghes.map((g) => (
            <label key={g.id} className="flex items-center gap-2">
              <input type="checkbox" checked={marcados.includes(g.id)} onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, g.id] : m.filter((x) => x !== g.id)))} />
              {g.nome} <span className="text-text/50">· {g.riscos.length} risco(s), {g.exames.length} exame(s)</span>
            </label>
          ))}
        </fieldset>
      ) : <p className="text-sm text-text/60">Essa empresa não tem GHE cadastrado.</p>)}
      {origem && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={responsaveis} onChange={(e) => setResponsaveis(e.target.checked)} /> Copiar também o médico do PCMSO e o responsável técnico
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>Fechar</Botao>
        <Botao type="button" disabled={ocupado || !origem || (!marcados.length && !responsaveis)} onClick={copiar}>{ocupado ? 'Copiando…' : 'Copiar'}</Botao>
      </div>
    </div>
  );
}
