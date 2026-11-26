// Última barreira para nenhum aviso aparecer em inglês na tela.
// O motor já responde em português (ver apps/api/src/common/erros-pt.ts). Aqui pegamos o que sobra:
// mensagens do navegador ("Failed to fetch", "Load failed"), erros de código ("Cannot read properties of undefined")
// e qualquer resposta antiga do motor que ainda venha em inglês.

const PADRAO = 'Algo deu errado. Tente de novo em alguns minutos. Se continuar, use "Relatar problema" no menu.';
const SEM_INTERNET = 'Não conseguimos falar com o sistema agora. Confira a internet e tente de novo em alguns segundos.';

const TROCAS: [RegExp, string][] = [
  [/failed to fetch|load failed|networkerror|network error|network request failed|err_(internet|network|connection)/i, SEM_INTERNET],
  [/internal server error/i, 'Algo deu errado do nosso lado e a equipe já foi avisada. Tente de novo em alguns minutos. Se continuar, use "Relatar problema" no menu.'],
  [/^Cannot (GET|POST|PUT|PATCH|DELETE) |^not found$/i, 'Não encontramos o que você procurou. Pode ter sido apagado ou o endereço está errado. Volte e tente pelo menu.'],
  [/file too large|payload too large|request entity too large/i, 'O arquivo é grande demais. Envie um arquivo menor (até 20 MB) ou divida o documento em partes.'],
  [/^unauthorized$/i, 'Entre no sistema para continuar.'],
  [/^forbidden( resource)?$/i, 'Você não tem acesso a esta parte do sistema.'],
  [/too many requests/i, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'],
  [/bad gateway|service unavailable|gateway timeout/i, 'O sistema está reiniciando. Espere um minuto e tente de novo.'],
  [/timeout|timed out|aborted|the operation was aborted/i, 'O sistema demorou demais para responder. Tente de novo em alguns minutos.'],
  [/quotaexceeded|quota exceeded|storage is full/i, 'O espaço do navegador está cheio. Apague dados antigos do site ou use outro navegador.'],
  [/permission|notallowederror|denied/i, 'O navegador não deu permissão. Libere o acesso nas configurações do navegador e tente de novo.'],
];

const PORTUGUES = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(não|nao|você|voce|para|com|sem|seu|sua|campo|empresa|confira|envie|escolha|informe|digite|tente|entre|ou|de|do|da|dos|das|um|uma)\b/i;
const INGLES = /\b(the|is|are|must|should|be|cannot|can't|invalid|error|failed|failure|required|expected|unexpected|found|file|request|server|field|value|property|exist|allowed|missing|unknown|undefined|null|of|to|an|was|has|does|reading|properties|function|object|please|try|again)\b/i;

export function emPortugues(mensagem: string | null | undefined): string {
  const t = (mensagem ?? '').trim();
  if (!t) return PADRAO;
  if (PORTUGUES.test(t)) return t;
  for (const [re, troca] of TROCAS) if (re.test(t)) return troca;
  return INGLES.test(t) ? PADRAO : t;
}
