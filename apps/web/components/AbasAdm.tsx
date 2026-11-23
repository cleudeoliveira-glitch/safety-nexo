'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DoutorNexo } from './DoutorNexo';

// Abas do Painel ADM: consultorias, avisos de normas e o Diagnóstico (premium).
export function AbasAdm() {
  const caminho = usePathname();
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
      {aba('/admin/normas', 'Avisos de normas')}
      {aba('/admin/diagnostico', <>
        <DoutorNexo tamanho={24} /> Diagnóstico
        <span className="rounded-full bg-gradient-to-r from-[#d4a017] to-[#f5d36b] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#4a3500]">PREMIUM</span>
      </>)}
    </nav>
  );
}
