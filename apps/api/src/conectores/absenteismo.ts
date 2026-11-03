// Cálculo do absenteísmo: horas perdidas por atestado ÷ horas previstas de trabalho × 100.
// Conta só os dias de segunda a sexta (feriados não entram) e a jornada diária cadastrada na empresa.

const DIA = 86_400_000;
export const TIPOS_ATESTADO: Record<string, string> = {
  DOENCA: 'Doença',
  ACIDENTE_TRABALHO: 'Acidente de trabalho',
  ACOMPANHAMENTO: 'Acompanhar familiar',
  ODONTOLOGICO: 'Dentista',
  OUTRO: 'Outro',
};

type AtestadoCalc = { colaboradorId: string; inicio: Date; dias: number; horas: number | null; tipo: string; cid: string | null };
type ColabCalc = { id: string; nome: string; dataAdmissao: Date | null; ghe?: { nome: string } | null };

const utc = (a: number, m: number, d: number) => Date.UTC(a, m, d);
const diaUtil = (t: number) => { const s = new Date(t).getUTCDay(); return s !== 0 && s !== 6; };
const inicioDia = (d: Date) => utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export function fimAtestado(a: { inicio: Date; dias: number }) {
  return new Date(inicioDia(a.inicio) + Math.max(a.dias - 1, 0) * DIA);
}

// Dias úteis do atestado que caem entre [de, ate] (inclusive).
function diasUteisNoPeriodo(a: { inicio: Date; dias: number }, de: number, ate: number) {
  if (a.dias <= 0) return 0;
  const ini = Math.max(inicioDia(a.inicio), de); const fim = Math.min(inicioDia(fimAtestado(a)), ate);
  let n = 0; for (let t = ini; t <= fim; t += DIA) if (diaUtil(t)) n++;
  return n;
}

// Só conta até o mês atual, para os meses que ainda não chegaram não baixarem o índice do ano.
export function indicadores(ano: number, jornada: number, colaboradores: ColabCalc[], atestados: AtestadoCalc[], hoje = new Date()) {
  const ultimoMes = ano < hoje.getUTCFullYear() ? 12 : ano > hoje.getUTCFullYear() ? 0 : hoje.getUTCMonth() + 1;
  const porGhe = new Map<string, number>(); const porTipo = new Map<string, number>(); const porCid = new Map<string, number>();
  const porPessoa = new Map<string, number>();
  const meses = Array.from({ length: ultimoMes }, (_, m) => {
    const de = utc(ano, m, 1); const ate = utc(ano, m + 1, 0);
    let uteis = 0; for (let t = de; t <= ate; t += DIA) if (diaUtil(t)) uteis++;
    const ativos = colaboradores.filter((c) => !c.dataAdmissao || inicioDia(c.dataAdmissao) <= ate).length;
    const previstas = ativos * uteis * jornada;
    let perdidas = 0; let qtd = 0;
    for (const a of atestados) {
      const dias = diasUteisNoPeriodo(a, de, ate);
      const doDia = inicioDia(a.inicio) >= de && inicioDia(a.inicio) <= ate;
      const horas = dias * jornada + (doDia && a.dias === 0 ? a.horas ?? 0 : 0);
      if (!horas && !doDia) continue;
      if (doDia) qtd++;
      perdidas += horas;
      const col = colaboradores.find((c) => c.id === a.colaboradorId);
      const ghe = col?.ghe?.nome ?? 'Sem GHE';
      porGhe.set(ghe, (porGhe.get(ghe) ?? 0) + horas);
      porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + horas);
      if (a.cid) porCid.set(a.cid.toUpperCase(), (porCid.get(a.cid.toUpperCase()) ?? 0) + horas);
      porPessoa.set(a.colaboradorId, (porPessoa.get(a.colaboradorId) ?? 0) + horas);
    }
    return { mes: m + 1, colaboradores: ativos, diasUteis: uteis, horasPrevistas: previstas, horasPerdidas: perdidas, atestados: qtd, taxa: previstas ? Math.round((perdidas / previstas) * 10000) / 100 : 0 };
  });
  const previstas = meses.reduce((s, m) => s + m.horasPrevistas, 0); const perdidas = meses.reduce((s, m) => s + m.horasPerdidas, 0);
  const ordenar = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([nome, horas]) => ({ nome, horas }));
  return {
    ano, jornada, meses,
    total: { horasPrevistas: previstas, horasPerdidas: perdidas, atestados: meses.reduce((s, m) => s + m.atestados, 0), taxa: previstas ? Math.round((perdidas / previstas) * 10000) / 100 : 0 },
    porGhe: ordenar(porGhe),
    porTipo: ordenar(porTipo).map((x) => ({ ...x, nome: TIPOS_ATESTADO[x.nome] ?? x.nome })),
    porCid: ordenar(porCid).slice(0, 10),
    quemMaisFaltou: ordenar(porPessoa).slice(0, 10).map((x) => ({ ...x, nome: colaboradores.find((c) => c.id === x.nome)?.nome ?? '—' })),
  };
}

// Regra do INSS: a empresa paga os primeiros 15 dias (Lei 8.213/91, art. 60, § 3º). Atestados pela mesma doença
// dentro de 60 dias se somam (Decreto 3.048/99, art. 75). Passou de 15 dias somados: encaminhar ao INSS.
export function alertasInss(colaboradores: ColabCalc[], atestados: (AtestadoCalc & { id: string })[]) {
  const alertas: { colaboradorId: string; nome: string; cid: string | null; dias: number; desde: Date; atestados: string[] }[] = [];
  const doencas = atestados.filter((a) => (a.tipo === 'DOENCA' || a.tipo === 'ACIDENTE_TRABALHO') && a.dias > 0).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const grupos = new Map<string, typeof doencas>();
  for (const a of doencas) {
    const chave = `${a.colaboradorId}|${a.cid ? a.cid.toUpperCase().slice(0, 3) : `sem-cid-${a.id}`}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), a]);
  }
  for (const lista of grupos.values()) {
    let cadeia: typeof lista = [];
    const fechar = () => {
      const dias = cadeia.reduce((s, a) => s + a.dias, 0);
      if (dias > 15) {
        const col = colaboradores.find((c) => c.id === cadeia[0].colaboradorId);
        alertas.push({ colaboradorId: cadeia[0].colaboradorId, nome: col?.nome ?? '—', cid: cadeia[0].cid, dias, desde: cadeia[0].inicio, atestados: cadeia.map((a) => a.id) });
      }
    };
    for (const a of lista) {
      const ultimo = cadeia[cadeia.length - 1];
      if (ultimo && inicioDia(a.inicio) - inicioDia(fimAtestado(ultimo)) > 60 * DIA) { fechar(); cadeia = []; }
      cadeia.push(a);
    }
    if (cadeia.length) fechar();
  }
  return alertas;
}
