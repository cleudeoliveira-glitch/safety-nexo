'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { buscarEmpresa, Empresa, LinkPortal, portal } from '@/lib/api';

// Links do espaço do trabalhador: cada um vê os próprios exames, EPIs, treinamentos e o que falta assinar.
export default function EspacoTrabalhadorPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lista, setLista] = useState<LinkPortal[] | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  useEffect(() => {
    buscarEmpresa(empresaId).then(setEmpresa).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
    portal.links(empresaId).then(setLista).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
  }, [empresaId]);

  async function agir(f: () => Promise<unknown>, ok: string) {
    try { await f(); setLista(await portal.links(empresaId)); setAviso({ tipo: 'ok', texto: ok }); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  const semLink = (lista ?? []).filter((c) => !c.link).length;
  const semCpf = (lista ?? []).filter((c) => !c.temCpf).length;
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-10">
      <div>
        <p className="text-sm text-text/60">{empresa?.razaoSocial}</p>
        <h1 className="text-2xl font-bold text-primary">Espaço do trabalhador</h1>
        <p className="mt-1 text-sm text-text/70">Cada funcionário recebe um link pessoal. Ele entra com o CPF e vê os próprios ASOs, EPIs recebidos, treinamentos com certificado, o que falta assinar e a votação da CIPA. Não aparece prontuário nem dado de outra pessoa.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <Cartao titulo="Links dos funcionários" acao={semLink > 0 ? <Botao onClick={() => agir(() => portal.gerar(empresaId), 'Links criados.')}>Criar links para {semLink} funcionário(s)</Botao> : undefined}>
        {semCpf > 0 && <p className="mb-3 rounded-card bg-background px-3 py-2 text-sm">{semCpf} funcionário(s) estão sem CPF no cadastro e não conseguem entrar. Complete em <Link className="text-primary underline" href={`/empresas/${empresaId}#colaboradores`}>Colaboradores</Link>.</p>}
        {lista === null ? <p className="text-sm text-text/60">Carregando…</p> : lista.length === 0 ? <p className="text-sm text-text/60">Cadastre os colaboradores primeiro.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>{c.nome} <span className="text-text/60">· {c.cargo}</span>{!c.temCpf && <span className="ml-2 text-xs text-danger">sem CPF</span>}</span>
                {c.link ? (
                  <span className="flex flex-wrap gap-3 text-xs">
                    <a className="font-semibold text-primary underline" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Este é o seu espaço na ${empresa?.razaoSocial ?? 'empresa'}: exames, EPIs e treinamentos. Entre com o seu CPF: ${c.link}`)}`}>WhatsApp</a>
                    <button className="font-semibold text-primary underline" onClick={() => navigator.clipboard?.writeText(c.link!).then(() => setAviso({ tipo: 'ok', texto: `Link de ${c.nome} copiado.` }))}>Copiar</button>
                    <button className="text-text/60 underline" onClick={() => { if (window.confirm('Criar um link novo? O antigo para de funcionar.')) agir(() => portal.novo(empresaId, c.id), 'Link novo criado.'); }}>Trocar link</button>
                  </span>
                ) : <span className="text-xs text-text/60">sem link</span>}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
