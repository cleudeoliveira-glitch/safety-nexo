// Checklist de auditoria 5S do Safety Nexo (modelo próprio, não é norma). Nota de 0 a 4 por item.
export const ESCALA_5S = [
  { valor: 0, rotulo: 'Não atende' }, { valor: 1, rotulo: 'Atende pouco' }, { valor: 2, rotulo: 'Atende em parte' },
  { valor: 3, rotulo: 'Atende quase tudo' }, { valor: 4, rotulo: 'Atende totalmente' },
];

export const SENSOS = [
  { id: 'seiri', nome: 'Seiri · Utilização', itens: [
    'No posto só há o material necessário para o trabalho',
    'Não há máquinas, ferramentas ou móveis quebrados ou sem uso',
    'Papéis e arquivos sem uso foram descartados ou arquivados',
    'Existe um lugar definido para o que vai ser descartado',
  ] },
  { id: 'seiton', nome: 'Seiton · Ordenação', itens: [
    'Cada coisa tem lugar definido e identificado',
    'Ferramentas e materiais estão no lugar certo',
    'Corredores, saídas de emergência e extintores estão livres e sinalizados',
    'Produtos químicos estão identificados e guardados do jeito certo',
  ] },
  { id: 'seiso', nome: 'Seiso · Limpeza', itens: [
    'Piso, paredes e bancadas estão limpos',
    'Máquinas e equipamentos estão limpos',
    'Há lixeiras suficientes e separação do lixo',
    'As causas de sujeira (vazamentos, pó, restos) foram tratadas',
  ] },
  { id: 'seiketsu', nome: 'Seiketsu · Padronização e saúde', itens: [
    'Há sinalização visual (etiquetas, cores, quadros) e ela é seguida',
    'Iluminação, ventilação e conforto estão adequados',
    'Banheiros, vestiários e refeitório estão limpos e em ordem',
    'O resultado da última auditoria está exposto no setor',
  ] },
  { id: 'shitsuke', nome: 'Shitsuke · Disciplina', itens: [
    'As pessoas usam os EPIs exigidos no setor',
    'Os padrões são seguidos sem precisar cobrar',
    'As pendências da auditoria anterior foram resolvidas',
    'A equipe participa das atividades de 5S',
  ] },
];

export const CHAVES_5S = SENSOS.flatMap((s) => s.itens.map((_, i) => `${s.id}-${i + 1}`));

export function notas5s(notas: Record<string, number>) {
  const porSenso = SENSOS.map((s) => {
    const soma = s.itens.reduce((t, _, i) => t + (notas[`${s.id}-${i + 1}`] ?? 0), 0);
    return { id: s.id, nome: s.nome, percentual: Math.round((soma / (s.itens.length * 4)) * 100) };
  });
  const total = Math.round(CHAVES_5S.reduce((t, k) => t + (notas[k] ?? 0), 0) / (CHAVES_5S.length * 4) * 100);
  return { porSenso, total };
}
