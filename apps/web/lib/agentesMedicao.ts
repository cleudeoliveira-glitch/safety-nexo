// Sugestão de como avaliar cada agente: unidade, limite, metodologia e anexo da NR-15.
// Serve de ponto de partida quando a consultora abre a avaliação do risco: os campos vazios
// já vêm preenchidos e ela confere. O que já estava escrito nunca é trocado.
export type SugestaoAgente = {
  nome: string;               // como o agente aparece na dica
  avaliacao: 'QUANTITATIVA' | 'QUALITATIVA';
  unidade?: string;           // unidade do resultado, para o exemplo do campo
  unMed?: number;             // código da unidade no eSocial (S-2240)
  limite?: string;            // limite de tolerância quando é um número fixo
  tecnica: string;            // metodologia
  anexoNr15?: string;
  obs?: string;               // o que a consultora precisa lembrar
};

// A ordem importa: o mais específico vem antes (ruído de impacto antes de ruído, benzeno antes de solvente).
const CATALOGO: [RegExp, SugestaoAgente][] = [
  [/impacto/i, { nome: 'Ruído de impacto', avaliacao: 'QUANTITATIVA', unidade: 'dB(linear)', unMed: 2, limite: '130 dB(linear)', tecnica: 'Medidor de nível de pressão sonora em resposta linear e circuito de impacto, NHO 01 da Fundacentro', anexoNr15: '2', obs: 'Sem medidor em linear, use o circuito rápido (fast): o limite passa a 120 dB(C).' }],
  [/ru[ií]do/i, { nome: 'Ruído', avaliacao: 'QUANTITATIVA', unidade: 'dB(A)', unMed: 4, limite: '85 dB(A)', tecnica: 'Dosimetria de ruído na jornada, NHO 01 da Fundacentro', anexoNr15: '1', obs: 'O limite de 85 dB(A) vale para 8 horas. Pela NHO 01 o fator de troca é 3 e o nível de ação é 82 dB(A).' }],
  [/calor|ibutg|t[eé]rmic/i, { nome: 'Calor', avaliacao: 'QUANTITATIVA', unidade: '°C (IBUTG)', unMed: 10, tecnica: 'Medição do IBUTG com termômetros de globo, bulbo úmido natural e bulbo seco, NHO 06 da Fundacentro', anexoNr15: '3', obs: 'O limite depende da taxa metabólica da atividade (NR-15, Anexo 3, Quadro 1). Anote a atividade observada.' }],
  [/vibra.*(m[aã]o|bra[cç]o)|\bvmb\b|localizada/i, { nome: 'Vibração de mãos e braços', avaliacao: 'QUANTITATIVA', unidade: 'm/s² (aren)', unMed: 5, limite: '5 m/s² (aren)', tecnica: 'Acelerômetro na ferramenta, NHO 10 da Fundacentro', anexoNr15: '8', obs: 'Nível de ação: 2,5 m/s².' }],
  [/vibra/i, { nome: 'Vibração de corpo inteiro', avaliacao: 'QUANTITATIVA', unidade: 'm/s² (aren)', unMed: 5, limite: '1,1 m/s² (aren) ou 21 m/s¹·⁷⁵ (VDVR)', tecnica: 'Acelerômetro triaxial no assento ou no piso, NHO 09 da Fundacentro', anexoNr15: '8', obs: 'Nível de ação: 0,5 m/s² (aren) ou 9,1 m/s¹·⁷⁵ (VDVR).' }],
  [/amianto|asbesto/i, { nome: 'Asbesto (amianto)', avaliacao: 'QUANTITATIVA', unidade: 'f/cm³', unMed: 9, limite: '0,1 f/cm³', tecnica: 'Coleta em filtro de membrana e contagem de fibras (NIOSH 7400)', anexoNr15: '12' }],
  [/s[ií]lica|quartzo|poeira respir|poeira mineral/i, { nome: 'Poeira mineral (sílica)', avaliacao: 'QUANTITATIVA', unidade: 'mg/m³', unMed: 8, tecnica: 'Coleta com bomba, ciclone e filtro, NHO 08 da Fundacentro, e análise do teor de quartzo', anexoNr15: '12', obs: 'O limite sai da fórmula da NR-15, Anexo 12, com o % de quartzo do laboratório.' }],
  [/poeira|particulado|p[oó] de/i, { nome: 'Poeira', avaliacao: 'QUANTITATIVA', unidade: 'mg/m³', unMed: 8, tecnica: 'Coleta com bomba e filtro, NHO 08 da Fundacentro (fração respirável ou total)', obs: 'Poeira mineral vai para o Anexo 12. Poeira vegetal ou orgânica não tem limite na NR-15: use a ACGIH como referência.' }],
  [/fumo/i, { nome: 'Fumos metálicos', avaliacao: 'QUANTITATIVA', unidade: 'mg/m³', unMed: 8, tecnica: 'Coleta em filtro com bomba na zona respiratória e análise dos metais (NIOSH 7300)', anexoNr15: '11', obs: 'Compare cada metal (ferro, manganês, zinco...) com o limite dele.' }],
  [/benzeno/i, { nome: 'Benzeno', avaliacao: 'QUANTITATIVA', unidade: 'ppm', unMed: 7, tecnica: 'Coleta com bomba e tubo de carvão ativo (NIOSH 1501)', anexoNr15: '13-A', obs: 'O benzeno não tem limite seguro: vale o VRT-MPT do Anexo 13-A.' }],
  [/tolueno|xileno|solvente|thinner|vapor|acetona|hexano|am[oô]nia|formol|formalde|mon[oó]xido|(^|\s)g[aá]s(es)?(\s|$)/i, { nome: 'Gases e vapores', avaliacao: 'QUANTITATIVA', unidade: 'ppm', unMed: 7, tecnica: 'Coleta com bomba e tubo adsorvente (métodos NIOSH) ou leitura direta com detector calibrado', anexoNr15: '11', obs: 'Confira na FISPQ do produto qual substância medir e o limite de cada uma no Quadro 1 do Anexo 11.' }],
  [/ioniz|raio.?x|radioativ/i, { nome: 'Radiação ionizante', avaliacao: 'QUANTITATIVA', unidade: 'mSv', unMed: 28, limite: '20 mSv por ano', tecnica: 'Dosimetria individual, conforme a norma CNEN NN 3.01', anexoNr15: '5' }],
  [/radia|ultravioleta|\buv\b|solda el[eé]trica|laser|infravermelh/i, { nome: 'Radiação não ionizante', avaliacao: 'QUALITATIVA', tecnica: 'Inspeção do local de trabalho (NR-15, Anexo 7)', anexoNr15: '7', obs: 'A avaliação é qualitativa: descreva a fonte, o tempo de exposição e a proteção usada.' }],
  [/frio|c[aâ]mara fria|congelad/i, { nome: 'Frio', avaliacao: 'QUALITATIVA', tecnica: 'Inspeção do local de trabalho e medição da temperatura do ambiente (NR-15, Anexo 9)', anexoNr15: '9' }],
  [/umidade|alagad|encharcad/i, { nome: 'Umidade', avaliacao: 'QUALITATIVA', tecnica: 'Inspeção do local de trabalho (NR-15, Anexo 10)', anexoNr15: '10' }],
  [/bact[eé]ri|v[ií]rus|fung|biol[oó]gic|sangue|esgoto|lixo|paciente|material contaminado/i, { nome: 'Agentes biológicos', avaliacao: 'QUALITATIVA', tecnica: 'Inspeção do local de trabalho e da atividade (NR-15, Anexo 14)', anexoNr15: '14' }],
];

export function sugestaoParaAgente(agente: string): SugestaoAgente | null {
  const achado = CATALOGO.find(([re]) => re.test(agente));
  return achado ? achado[1] : null;
}
