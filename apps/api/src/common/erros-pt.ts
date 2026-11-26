// Toda resposta de erro do motor sai em português.
// As mensagens que nós escrevemos já são em português. As que vêm prontas do Nest, do Express ou do envio de
// arquivos (ex.: "Internal server error", "Cannot POST /x", "File too large") são trocadas aqui por um texto
// simples que diz o que fazer em seguida.

export const ERRO_INTERNO =
  'Algo deu errado do nosso lado e a equipe já foi avisada. Tente de novo em alguns minutos. Se continuar, use "Relatar problema" no menu.';

// Nome curto do erro (campo "error" da resposta), também em português.
const ROTULO: Record<number, string> = {
  400: 'Dados com problema', 401: 'Entrada necessária', 402: 'Pagamento pendente', 403: 'Sem acesso', 404: 'Não encontrado',
  405: 'Ação não permitida', 406: 'Formato não aceito', 408: 'Demorou demais', 409: 'Conflito', 410: 'Não existe mais',
  413: 'Arquivo grande demais', 415: 'Tipo de arquivo não aceito', 422: 'Dados com problema', 429: 'Muitas tentativas',
  500: 'Erro no sistema', 501: 'Ainda não disponível', 502: 'Sistema fora do ar', 503: 'Sistema indisponível', 504: 'Sistema demorou',
};
export const rotuloDoErro = (status: number) => ROTULO[status] ?? (status >= 500 ? 'Erro no sistema' : 'Não foi possível concluir');

// Texto padrão por código, para quando a mensagem original não serve.
const PADRAO: Record<number, string> = {
  400: 'Alguma informação veio com problema. Confira os campos e tente de novo.',
  401: 'Entre no sistema para continuar.',
  402: 'Este recurso depende de um plano ativo. Veja em Planos.',
  403: 'Você não tem acesso a esta parte do sistema.',
  404: 'Não encontramos o que você procurou. Pode ter sido apagado ou o endereço está errado. Volte e tente pelo menu.',
  405: 'Esta ação não é permitida aqui. Recarregue a página e tente de novo.',
  406: 'O sistema não conseguiu responder nesse formato. Recarregue a página e tente de novo.',
  408: 'O sistema demorou para responder. Tente de novo.',
  409: 'Já existe um registro igual a este. Confira a lista antes de cadastrar de novo.',
  410: 'Isto não existe mais no sistema.',
  413: 'O arquivo é grande demais. Envie um arquivo menor (até 20 MB) ou divida o documento em partes.',
  415: 'Este tipo de arquivo não é aceito. Envie em PDF, PNG ou JPG.',
  422: 'Alguma informação veio com problema. Confira os campos e tente de novo.',
  429: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  502: 'O sistema está reiniciando. Espere um minuto e tente de novo.',
  503: 'O sistema está indisponível agora. Espere um minuto e tente de novo.',
  504: 'O sistema demorou demais para responder. Tente de novo em alguns minutos.',
};
export const mensagemPadrao = (status: number) => PADRAO[status] ?? (status >= 500 ? ERRO_INTERNO : 'Não foi possível concluir. Confira os dados e tente de novo.');

// Mensagens prontas em inglês que chegam ao cliente, com a troca certa.
const TROCAS: [RegExp, string | ((status: number) => string)][] = [
  [/^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /i, PADRAO[404]],
  [/file too large|request entity too large|payload too large|too many (files|parts|fields)|field value too long/i, PADRAO[413]],
  [/unexpected field/i, 'O arquivo foi enviado do jeito errado. Recarregue a página e tente de novo.'],
  [/unexpected end of form|multipart|boundary|request aborted|aborted/i, 'O envio foi interrompido no meio do caminho. Confira a internet e tente de novo.'],
  [/json|unexpected token|unexpected end of input/i, 'Os dados chegaram com defeito. Recarregue a página e tente de novo.'],
  [/validation failed|numeric string is expected|uuid is expected|boolean string is expected|\benum\b/i, PADRAO[400]],
  [/too many requests|throttl/i, PADRAO[429]],
  [/timeout|timed out/i, PADRAO[504]],
  [/^(bad request|unauthorized|forbidden( resource)?|not found|method not allowed|not acceptable|request timeout|conflict|gone|unsupported media type|unprocessable entity|internal server error|not implemented|bad gateway|service unavailable|gateway timeout|payment required|precondition failed|i'?m a teapot|misdirected|http exception)\.?$/i, mensagemPadrao],
];

// Só troca frase que tem cara de inglês e nenhum sinal de português (acento, cedilha ou palavra nossa).
const PARECE_INGLES = /\b(the|is|are|must|should|be|cannot|can't|invalid|error|failed|failure|required|expected|unexpected|found|file|request|server|field|value|property|exist|exists|allowed|missing|unknown|undefined|null|of|to|an|was|has|does|please|try|again|connection|network)\b/i;
const PARECE_PORTUGUES = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(não|nao|você|voce|para|com|sem|seu|sua|está|esta|campo|empresa|confira|envie|escolha|informe|digite|tente|entre|já|ja|ou|de|do|da|dos|das|um|uma|é)\b/i;

export function mensagemEmPortugues(status: number, mensagem: unknown): string | string[] {
  if (Array.isArray(mensagem)) {
    const lista = mensagem.map((m) => mensagemEmPortugues(status, m)).flat();
    return [...new Set(lista)];
  }
  const texto = typeof mensagem === 'string' ? mensagem.trim() : '';
  if (!texto) return mensagemPadrao(status);
  if (PARECE_PORTUGUES.test(texto)) return texto;
  for (const [re, troca] of TROCAS) if (re.test(texto)) return typeof troca === 'string' ? troca : troca(status);
  // Frase em inglês que não conhecemos: melhor um texto claro do que inglês na tela.
  if (PARECE_INGLES.test(texto)) return mensagemPadrao(status);
  return texto;
}
