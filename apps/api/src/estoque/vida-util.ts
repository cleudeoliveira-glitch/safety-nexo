// Vida útil de referência por tipo de EPI, em dias de uso. É um ponto de partida: o certo é seguir o manual
// do fabricante e o desgaste real, e a consultoria pode mudar o prazo em cada item ou entrega.
// 0 = descartável: a reposição segue o consumo, sem data de troca.
const REFERENCIA: [RegExp, number, string][] = [
  [/plug.*descart|descart.*plug|espuma/i, 0, 'protetor auricular descartável: reposição pelo consumo'],
  [/plug|auricular.*inser|silicone/i, 90, 'protetor auricular de inserção reutilizável'],
  [/concha|abafador/i, 365, 'protetor auricular tipo concha (almofadas a cada 6 meses)'],
  [/pff|descart.*respira|respira.*descart/i, 0, 'respirador descartável: reposição pelo consumo'],
  [/filtro|cartucho/i, 30, 'filtro de respirador (troca antes, se sentir cheiro do produto)'],
  [/semifacial|facial inteira|respirador/i, 365, 'peça facial reutilizável'],
  [/luva.*(latex|látex|nitr|vinil|descart)/i, 0, 'luva descartável: reposição pelo consumo'],
  [/luva/i, 30, 'luva de proteção'],
  [/capacete/i, 1095, 'capacete (casco), ou conforme o fabricante'],
  [/jugular|carneira/i, 365, 'carneira ou jugular do capacete'],
  [/[oó]culos|viseira|protetor facial/i, 180, 'óculos ou protetor facial'],
  [/botina|bota|cal[cç]ado|sapato/i, 180, 'calçado de segurança'],
  [/cinto|talabarte|trava.?queda/i, 1825, 'cinto e talabarte (inspeção antes de cada uso)'],
  [/avental|mangote|perneira/i, 180, 'avental, mangote ou perneira'],
  [/uniforme|cal[cç]a|camisa|jaleco|vestimenta|roupa/i, 180, 'vestimenta de trabalho'],
  [/creme|protetor solar/i, 30, 'creme de proteção'],
];

export function vidaUtilSugerida(epi: string): { dias: number; base: string } | null {
  const r = REFERENCIA.find(([re]) => re.test(epi));
  return r ? { dias: r[1], base: r[2] } : null;
}

export const trocaPrevista = (dataEntrega: Date, vidaUtilDias: number | null | undefined) =>
  vidaUtilDias ? new Date(dataEntrega.getTime() + vidaUtilDias * 86_400_000) : null;
