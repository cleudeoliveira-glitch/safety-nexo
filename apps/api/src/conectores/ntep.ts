// Alerta de nexo: o INSS aplica o NTEP (Nexo Técnico Epidemiológico, Lei 8.213/91, art. 21-A) quando o CID
// do afastamento aparece cruzado com o CNAE da empresa na Lista C do Anexo II do Decreto 3.048/99.
// Aí o benefício vira acidentário (B91) sem CAT: conta no FAP, gera estabilidade de 12 meses e depósito de FGTS.
// O sistema não tem a Lista C inteira: avisa pelos grupos de CID que mais geram nexo e pelo risco do GHE da pessoa,
// para a consultoria conferir com o médico e, se for o caso, contestar a tempo.

type GrupoNexo = { id: string; nome: string; cid: RegExp; riscos: (r: { tipo: string; agente: string }) => boolean; frequente: boolean };

const GRUPOS: GrupoNexo[] = [
  { id: 'osteomuscular', nome: 'doença osteomuscular (coluna, ombro, punho, tendões)', cid: /^(M(4[0-9]|5[0-4]|6[0-9]|7[0-9])|G56)/, riscos: (r) => r.tipo === 'ERGONOMICO' || /vibra/i.test(r.agente), frequente: true },
  { id: 'mental', nome: 'transtorno mental (depressão, ansiedade, estresse)', cid: /^F(3[0-9]|4[0-8])/, riscos: (r) => /psicossoc|estresse|assedio|assédio|jornada|metas|violên|violen/i.test(r.agente), frequente: true },
  { id: 'lesao', nome: 'lesão ou trauma', cid: /^(S\d|T0\d|T1[0-4])/, riscos: (r) => r.tipo === 'ACIDENTE', frequente: true },
  { id: 'audicao', nome: 'perda auditiva', cid: /^(H83\.?3|H9[01])/, riscos: (r) => /ru[ií]do/i.test(r.agente), frequente: false },
  { id: 'respiratorio', nome: 'doença respiratória', cid: /^J(4[0-7]|6[0-8])/, riscos: (r) => r.tipo === 'QUIMICO' || r.tipo === 'BIOLOGICO', frequente: false },
  { id: 'pele', nome: 'dermatite de contato', cid: /^L2[3-5]/, riscos: (r) => r.tipo === 'QUIMICO' || r.tipo === 'BIOLOGICO', frequente: false },
  { id: 'intoxicacao', nome: 'intoxicação', cid: /^T(5[1-9]|6[0-5])/, riscos: (r) => r.tipo === 'QUIMICO', frequente: false },
  { id: 'varizes', nome: 'varizes dos membros inferiores', cid: /^I83/, riscos: (r) => r.tipo === 'ERGONOMICO', frequente: false },
];

export type AlertaNexo = { grupo: string; nome: string; riscoRelacionado: string | null; forte: boolean; texto: string };

export function alertaNexo(cid: string | null | undefined, tipoAtestado: string, riscos: { tipo: string; agente: string }[], cnae: string | null): AlertaNexo | null {
  if (!cid || !['DOENCA', 'OUTRO'].includes(tipoAtestado)) return null;
  const c = cid.toUpperCase().replace(/\s/g, '');
  const g = GRUPOS.find((x) => x.cid.test(c));
  if (!g) return null;
  const risco = riscos.find(g.riscos) ?? null;
  if (!risco && !g.frequente) return null;
  const base = `CID ${c}: ${g.nome}.`;
  const motivo = risco ? ` O GHE da pessoa tem o risco "${risco.agente}", que tem relação com esse tipo de doença.` : ' Esse grupo de doenças está entre os que mais geram nexo automático no INSS.';
  const lesao = g.id === 'lesao' ? ' Se foi acidente no trabalho ou no trajeto, falta a CAT.' : '';
  return {
    grupo: g.id, nome: g.nome, riscoRelacionado: risco?.agente ?? null, forte: !!risco || g.id === 'lesao',
    texto: `${base}${motivo}${lesao} Se o afastamento passar de 15 dias, o INSS pode reconhecer como doença do trabalho pelo NTEP${cnae ? ` (CNAE ${cnae})` : ''}, mesmo sem CAT. Avalie com o médico do PCMSO; se não houver relação com o trabalho, guarde as provas (PGR, ASO, EPI, treinamentos) para contestar no INSS no prazo.`,
  };
}
