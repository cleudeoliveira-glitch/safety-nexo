import { z } from 'zod';

// O que a IA devolve. Tudo que não estiver escrito no documento fica vazio: nada é inventado.
export const RiscoLido = z.object({
  tipo: z.enum(['FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'ACIDENTE']),
  agente: z.string(),
  fonteGeradora: z.string().nullable(),
  medidasControle: z.string().nullable(),
  severidade: z.enum(['BAIXA', 'MEDIA', 'ALTA']).nullable(),
  intensidade: z.string().nullable(),
  limiteTolerancia: z.string().nullable(),
  pagina: z.number().int().nullable(),
});
export const GheLido = z.object({
  nome: z.string(),
  descricao: z.string().nullable(),
  cargos: z.array(z.string()),
  trabalhadores: z.number().int().nullable(),
  riscos: z.array(RiscoLido),
});
export const DocumentoLido = z.object({
  tipoDocumento: z.string().nullable(),
  empresa: z.string().nullable(),
  cnpj: z.string().nullable(),
  dataElaboracao: z.string().nullable(),
  responsavelTecnico: z.string().nullable(),
  ghes: z.array(GheLido),
  avisos: z.array(z.string()),
});
export type DocumentoLido = z.infer<typeof DocumentoLido>;

export const INSTRUCOES = `Você lê documentos brasileiros de Segurança e Saúde no Trabalho (PGR, PPRA antigo, LTCAT, laudos, inventários de riscos) para importar os dados para um sistema.

Extraia os grupos homogêneos de exposição (GHE), ou os setores/funções quando o documento não usar GHE, com os riscos de cada um.

Regras:
- Copie só o que está escrito no documento. Não invente, não complete e não deduza valores. Quando um campo não aparecer, deixe null (ou lista vazia).
- tipo do risco: FISICO (ruído, calor, vibração, radiação, frio, umidade, pressão), QUIMICO (poeiras, fumos, névoas, gases, vapores, produtos), BIOLOGICO (vírus, bactérias, fungos, parasitas), ERGONOMICO (postura, repetição, levantamento de peso, ritmo, fatores psicossociais) e ACIDENTE (máquinas, eletricidade, queda, quedas de altura, incêndio, animais, ferramentas, arranjo físico, ou o que o documento chamar de mecânico/acidente).
- agente: o nome do perigo como aparece (ex.: "Ruído contínuo", "Poeira de farinha").
- fonteGeradora: a máquina, atividade ou local que gera o risco, se estiver escrito.
- medidasControle: as medidas e EPIs citados para esse risco, juntos num texto curto.
- severidade: só preencha quando o documento classificar o risco. Converta para BAIXA, MEDIA ou ALTA (ex.: "leve/baixo/1" vira BAIXA; "moderado/médio/2" vira MEDIA; "alto/grave/crítico/3 ou mais" vira ALTA). Se o documento não classificar, null.
- intensidade e limiteTolerancia: só os números medidos e os limites escritos, com a unidade (ex.: "88,2 dB(A)", "85 dB(A)").
- pagina: o número da página do PDF onde está o risco, se der para saber.
- cargos: as funções/cargos do GHE. trabalhadores: o número de pessoas, se escrito.
- avisos: anote em português simples o que ficou confuso, ilegível ou incompleto, para a consultora conferir.
- Se o arquivo não for um documento de SST, devolva ghes vazio e explique em avisos.`;
