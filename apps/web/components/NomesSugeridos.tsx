'use client';

import { useEffect, useState } from 'react';
import { nomesLembrados } from '@/lib/lembrar';
import { lerUsuario } from '@/lib/sessao';

// Lista de sugestões para os campos de nome (id "nomes-pessoas"): quem está logado,
// os nomes já usados neste aparelho e, se vier, os funcionários da empresa.
export function NomesSugeridos({ pessoas = [] }: { pessoas?: string[] }) {
  const [nomes, setNomes] = useState<string[]>([]);
  useEffect(() => {
    const eu = lerUsuario()?.nome;
    setNomes([...new Set([...(eu ? [eu] : []), ...nomesLembrados(), ...pessoas].filter(Boolean))]);
  }, [pessoas]);
  return <datalist id="nomes-pessoas">{nomes.map((n) => <option key={n} value={n} />)}</datalist>;
}
