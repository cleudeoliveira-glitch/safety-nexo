'use client';

import { useEffect, useState } from 'react';
import { nomesLembrados } from '@/lib/lembrar';
import { lerUsuario } from '@/lib/sessao';

const NINGUEM: string[] = [];

// Lista de sugestões para os campos de nome (id "nomes-pessoas"): quem está logado,
// os nomes já usados neste aparelho e, se vier, os funcionários da empresa.
// Cuidado: a tela costuma mandar uma lista nova a cada desenho. Por isso a lista só é refeita
// quando os NOMES mudam; antes ela se refazia sem parar e travava a tela (no celular, nem o "Voltar" respondia).
export function NomesSugeridos({ pessoas = NINGUEM }: { pessoas?: string[] }) {
  const [nomes, setNomes] = useState<string[]>([]);
  const chave = pessoas.join('\n');
  useEffect(() => {
    const eu = lerUsuario()?.nome;
    const daTela = chave ? chave.split('\n') : [];
    setNomes([...new Set([...(eu ? [eu] : []), ...nomesLembrados(), ...daTela].filter(Boolean))]);
  }, [chave]);
  return <datalist id="nomes-pessoas">{nomes.map((n) => <option key={n} value={n} />)}</datalist>;
}
