'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { admin } from '@/lib/api';
import { DoutorNexo } from './DoutorNexo';

// Abas do Painel ADM: consultorias, pedidos dos clientes, avisos de normas e o Diagnóstico (premium).
export function AbasAdm() {
  const caminho = usePathname();
  const [semResposta, setSemResposta] = useState(0);
  useEffect(() => { admin.suporte().then((l) => setSemResposta(l.filter((p) => p.status === 'ABERTO').length)).catch(() => undefined); }, [caminho]);
  const aba = (href: string, conteudo: React.ReactNode) => {
    const ativa = caminho === href;
    return (
      <Link href={href} className={`-mb-px flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-2.5 text-sm transition sm:px-4 ${ativa ? 'border-primary font-bold text-primary' : 'border-transparent text-text/60 hover:text-primary'}`}>
        {conteudo}
      </Link>
    );
  };
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {aba('/admin', 'Consultorias')}
      {aba('/admin/suporte', <>
        Pedidos dos clientes
        {semResposta > 0 && <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{semResposta}</span>}
      </>)}
      {aba('/admin/normas', 'Avisos de normas')}
      {aba('/admin/diagnostico', <>
        <DoutorNexo tamanho={24} /> Diagnóstico
        <span className="rounded-full bg-gradient-to-r from-[#d4a017] to-[#f5d36b] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#4a3500]">PREMIUM</span>
      </>)}
    </nav>
  );
}
