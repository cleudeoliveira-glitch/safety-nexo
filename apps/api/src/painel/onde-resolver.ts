// Botão "Resolver" das pendências do painel: para qual tela cada aviso leva.
// A rota segue o menu do site (apps/web/lib/menu.ts): "/x" fica dentro da empresa em foco,
// "#x" é uma parte do cadastro da empresa e "@/x" é uma tela fora da empresa.
const REGRAS: [RegExp, string][] = [
  [/^Complete os dados/, '#dados'],
  [/^Cadastre os colaboradores|^Vincule os colaboradores/, '/colaboradores'],
  [/^Cadastre ao menos um GHE|^PGR: faltam|^PCMSO: faltam/, '#ghes'],
  [/^Revise o PGR/, '/conferencia'],
  [/^Gere o primeiro/, '@/emitir'],
  [/^Espaço confinado|^Simulado de resgate/, '/confinados'],
  [/^Reunião mensal da CIPA/, '/cipa#reunioes'],
  [/^Mandato da CIPA|^Eleição da CIPA|edital da CIPA|^Edital da CIPA/i, '/cipa#eleicao'],
  [/^Organize a CIPA|representante da NR-05/, '/cipa#dimensionamento'],
  [/^Envie a CAT|^CAT fora do prazo/, '/saude#cat'],
  [/^ASO de retorno| afastado há \d+ dias$/, '/saude#afastamentos'],
  [/: \d+ dias de atestado$/, '/conectores#faltas'],
  [/^Documento vencido da terceirizada/, '/conectores#terceiros'],
  [/^CA vencido no almoxarifado|^Comprar |^Troca de EPI/, '/almoxarifado'],
  [/relato\(s\) novo/, '/prevencao#relatos'],
  [/do plano atrasada/, '/prevencao#acoes'],
  [/^Inspeção atrasada|^Inspecionar de novo/, '/operacao#checklist'],
  [/^Brigada/, '/emergencia'],
  [/^Treinamento/, '/treinamentos'],
  [/^ASO vencido|^ASO vence|^EPI com CA vencido/, '/colaboradores'],
  [/^Vacina ou exame/, '/prontuario'],
];

export function ondeResolver(titulo: string): string | undefined {
  return REGRAS.find(([r]) => r.test(titulo))?.[1];
}
