// Exames do PCMSO puxados dos riscos do GHE (NR-07 e seus anexos).
// É ponto de partida: o médico responsável confere, tira ou acrescenta.

export type ExameSugerido = {
  nome: string;
  tipo: 'CLINICO' | 'COMPLEMENTAR';
  admissional: boolean;
  periodico: boolean;
  retornoTrabalho: boolean;
  mudancaRisco: boolean;
  demissional: boolean;
  periodicidadeMeses: number | null;
  motivo: string; // por que o exame entrou (vai na tela, não no PDF)
};

type RiscoBase = { tipo: string; agente: string; fonteGeradora?: string | null };

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const complementar = (nome: string, meses: number | null, motivo: string, extra: Partial<ExameSugerido> = {}): ExameSugerido => ({
  nome, tipo: 'COMPLEMENTAR', admissional: true, periodico: meses !== null, retornoTrabalho: false, mudancaRisco: true, demissional: false,
  periodicidadeMeses: meses, motivo, ...extra,
});

// Regra: o que procurar no agente ou na fonte, e os exames que isso pede.
const REGRAS: [RegExp, (agente: string) => ExameSugerido[]][] = [
  [/ruido/, (a) => [complementar('Audiometria tonal', 12, `ruído (${a}): NR-07, Anexo II`, { demissional: true })]],
  [/silica|quartzo|asbesto|amianto|poeira mineral|carvao mineral/, (a) => [
    complementar('Radiografia de tórax padrão OIT', 24, `poeira mineral (${a}): NR-07, Anexo III`, { demissional: true }),
    complementar('Espirometria', 24, `poeira mineral (${a}): NR-07, Anexo III`),
  ]],
  [/poeira|fumo|fumos|nevoa|solda/, (a) => [complementar('Espirometria', 24, `poeira ou fumos (${a})`)]],
  [/benzeno/, (a) => [complementar('Hemograma completo com plaquetas', 6, `benzeno (${a}): NR-07 e NR-15, Anexo 13-A`)]],
  [/tolueno/, (a) => [complementar('Ortocresol na urina (fim de jornada)', 6, `tolueno (${a}): NR-07, Anexo I`)]],
  [/xileno/, (a) => [complementar('Ácidos metil-hipúricos na urina (fim de jornada)', 6, `xileno (${a}): NR-07, Anexo I`)]],
  [/hexano/, (a) => [complementar('2,5-hexanodiona na urina (fim de jornada)', 6, `n-hexano (${a}): NR-07, Anexo I`)]],
  [/estireno/, (a) => [complementar('Ácido mandélico na urina (fim de jornada)', 6, `estireno (${a}): NR-07, Anexo I`)]],
  [/metanol/, (a) => [complementar('Metanol na urina (fim de jornada)', 6, `metanol (${a}): NR-07, Anexo I`)]],
  [/chumbo/, (a) => [complementar('Chumbo no sangue', 6, `chumbo (${a}): NR-07, Anexo I`)]],
  [/mercurio/, (a) => [complementar('Mercúrio na urina', 6, `mercúrio (${a}): NR-07, Anexo I`)]],
  [/monoxido de carbono|\bco\b/, (a) => [complementar('Carboxiemoglobina no sangue (fim de jornada)', 6, `monóxido de carbono (${a}): NR-07, Anexo I`)]],
  [/radiacao ionizante|raio-?x|raios x/, (a) => [complementar('Hemograma completo com plaquetas', 6, `radiação ionizante (${a})`)]],
  [/altura|andaime|telhado|escada|plataforma elevat/, (a) => [
    complementar('Eletrocardiograma', 12, `trabalho em altura (${a}): NR-35 pede avaliação da aptidão`),
    complementar('Glicemia em jejum', 12, `trabalho em altura (${a})`),
    complementar('Acuidade visual', 12, `trabalho em altura (${a})`),
  ]],
  [/eletric|choque/, (a) => [complementar('Eletrocardiograma', 12, `eletricidade (${a})`)]],
  [/confinad|tanque|silo|cisterna/, (a) => [
    complementar('Eletrocardiograma', 12, `espaço confinado (${a}): NR-33 pede avaliação da aptidão`),
    complementar('Espirometria', 12, `espaço confinado (${a})`),
    complementar('Acuidade visual', 12, `espaço confinado (${a})`),
  ]],
  [/empilhadeir|veiculo|direcao|motorista|transpalete eletric|ponte rolante|munck|guindaste/, (a) => [complementar('Acuidade visual', 12, `operação de veículo ou equipamento (${a})`)]],
];

// Lista sem repetir: se dois riscos pedem o mesmo exame, fica o menor intervalo.
export function examesPelosRiscos(riscos: RiscoBase[]): ExameSugerido[] {
  const lista: ExameSugerido[] = [{
    nome: 'Exame clínico (anamnese e exame físico)', tipo: 'CLINICO', admissional: true, periodico: true, retornoTrabalho: true, mudancaRisco: true, demissional: true,
    periodicidadeMeses: riscos.length ? 12 : 24, motivo: 'obrigatório para todos (NR-07)',
  }];
  const juntar = (e: ExameSugerido) => {
    const igual = lista.find((x) => semAcento(x.nome) === semAcento(e.nome));
    if (!igual) return lista.push(e);
    if (e.periodicidadeMeses && (!igual.periodicidadeMeses || e.periodicidadeMeses < igual.periodicidadeMeses)) igual.periodicidadeMeses = e.periodicidadeMeses;
    igual.demissional ||= e.demissional;
  };
  for (const r of riscos) {
    const texto = semAcento(`${r.agente} ${r.fonteGeradora ?? ''}`);
    for (const [padrao, exames] of REGRAS) if (padrao.test(texto)) exames(r.agente).forEach(juntar);
    // Risco biológico: comprovar a vacina contra hepatite B (NR-32) só na admissão.
    if (r.tipo === 'BIOLOGICO') {
      juntar(complementar('Anti-HBs (comprova a vacina contra hepatite B)', null, `risco biológico (${r.agente}): NR-32`));
    }
  }
  return lista;
}
