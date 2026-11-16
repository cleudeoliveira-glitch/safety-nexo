'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Aviso } from '@/components/ui';
import { empresasDaConta, escolherFoco } from '@/lib/empresaFoco';
import { lerToken } from '@/lib/sessao';

// Atalho: /colaboradores abre a página de colaboradores da empresa em foco.
export default function AtalhoColaboradores() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!lerToken()) { router.replace('/entrar'); return; }
    empresasDaConta()
      .then((lista) => {
        const id = escolherFoco(lista);
        router.replace(id ? `/empresas/${id}/colaboradores` : '/empresas/nova');
      })
      .catch((e) => setErro((e as Error).message));
  }, [router]);
  return <main className="p-10">{erro ? <Aviso tipo="erro">{erro}</Aviso> : 'Abrindo colaboradores…'}</main>;
}
