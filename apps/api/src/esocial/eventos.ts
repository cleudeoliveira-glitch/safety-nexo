import { CODIGOS } from './codigos';
import { Afastamento, Aso, Cat, Colaborador, Empresa, ExameGhe, Ghe, GheRisco } from '@prisma/client';

// Montagem dos eventos de SST conforme os Esquemas XSD v. S-1.3 (NT 07/2026 rev. 20/10/2026):
// evtCAT (S-2210), evtMonit (S-2220) e evtExpRisco (S-2240).
export const VERSAO_LEIAUTE = 'v_S_01_03_00';
export const VERSAO_APLICATIVO = 'SafetyNexo-1.0';
const NS = (evento: string) => `http://www.esocial.gov.br/schema/evt/${evento}/${VERSAO_LEIAUTE}`;

// ---------- utilitários ----------
type No = string | number | null | undefined | false | No[];
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function el(nome: string, ...filhos: No[]): string {
  const corpo = filhos.flat(Infinity as 1).filter((f) => f !== null && f !== undefined && f !== false && f !== '').map(String).join('');
  return corpo ? `<${nome}>${corpo}</${nome}>` : '';
}
// Campo simples: só aparece quando tem valor.
const c = (nome: string, valor: string | number | null | undefined) =>
  valor === null || valor === undefined || valor === '' ? '' : `<${nome}>${esc(String(valor))}</${nome}>`;

export const soDocumento = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const digitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');
const dia = (d: Date) => d.toISOString().slice(0, 10); // campos só de data, gravados em UTC
const dataIso = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10); // dia em Brasília
const horaHHMM = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(11, 16).replace(':', '');
const sn = (b: boolean | null | undefined) => (b ? 'S' : 'N');
const corta = (s: string | null | undefined, n: number) => (s ?? '').trim().slice(0, n) || null;
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// Número em texto ("88,5 dB(A)") para decimal do eSocial (até 4 casas).
export function numero(texto: string | null | undefined): string | null {
  const m = (texto ?? '').match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) ? String(Math.round(n * 10_000) / 10_000) : null;
}

export function cpfValido(cpf: string | null | undefined) {
  const d = digitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

// Junta o que falta para o evento e devolve tudo de uma vez, em português.
export class Pendencias {
  itens: string[] = [];
  exigir(ok: unknown, mensagem: string) { if (!ok) this.itens.push(mensagem); }
  get vazio() { return this.itens.length === 0; }
}

export type Identificacao = { idEvento: string; tpAmb: 1 | 2; retificaRecibo?: string | null };

function ideEvento(id: Identificacao) {
  return el('ideEvento', c('indRetif', id.retificaRecibo ? 2 : 1), c('nrRecibo', id.retificaRecibo), c('tpAmb', id.tpAmb), c('procEmi', 1), c('verProc', VERSAO_APLICATIVO));
}
const ideEmpregador = (e: Empresa) => el('ideEmpregador', c('tpInsc', 1), c('nrInsc', soDocumento(e.cnpj).slice(0, 8)));
function ideVinculo(col: Colaborador, p: Pendencias) {
  p.exigir(cpfValido(col.cpf), `CPF válido de ${col.nome}`);
  p.exigir(col.matricula || col.codCateg, `matrícula do eSocial de ${col.nome} (ou a categoria, para quem não tem matrícula)`);
  return el('ideVinculo', c('cpfTrab', digitos(col.cpf)), c('matricula', col.matricula), col.matricula ? '' : c('codCateg', col.codCateg));
}
function raiz(evento: string, id: Identificacao, corpo: string) {
  return `<eSocial xmlns="${NS(evento)}"><${evento} Id="${id.idEvento}">${corpo}</${evento}></eSocial>`;
}

// ---------- S-2220: monitoramento da saúde (ASO) ----------
const TP_EXAME: Record<string, number> = { ADMISSIONAL: 0, PERIODICO: 1, RETORNO_TRABALHO: 2, MUDANCA_RISCO: 3, DEMISSIONAL: 9 };
// Códigos da Tabela 27 que exigem observação (regra do campo obsProc).
const PROC_COM_OBS = ['0583', '0998', '0999', '1128', '1230', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '9999'];
// UF e número a partir de "CRM 12345/SP", "12345-SP", "CRM-SP 12345"...
export function separarCrm(crm: string | null | undefined, ufInformada?: string | null) {
  const t = (crm ?? '').toUpperCase();
  const uf = (ufInformada ?? '').toUpperCase() || UFS.find((u) => new RegExp(`(^|[^A-Z])${u}([^A-Z]|$)`).test(t.replace(/CRM|CREA|CRO/g, ''))) || null;
  return { numero: digitos(t).slice(0, 10) || null, uf: uf && UFS.includes(uf) ? uf : null };
}

export function montarS2220(id: Identificacao, empresa: Empresa, col: Colaborador, aso: Aso, examesDoGhe: ExameGhe[]) {
  const p = new Pendencias();
  const vinculo = ideVinculo(col, p);
  const exames = aso.exames.length ? aso.exames : ['Exame clínico'];
  const crm = separarCrm(aso.medicoExaminadorCrm, aso.medicoExaminadorUf);
  p.exigir(crm.numero, 'número do CRM do médico que assinou o ASO');
  p.exigir(crm.uf, 'UF do CRM do médico que assinou o ASO');
  const itens = exames.map((nome) => {
    const cad = examesDoGhe.find((x) => x.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const cod = digitos(cad?.codigoEsocial);
    p.exigir(CODIGOS.t27.has(cod), `código do eSocial (Tabela 27) do exame "${nome}" no cadastro do GHE`);
    return el('exame', c('dtExm', dia(aso.dataExame)), c('procRealizado', cod), PROC_COM_OBS.includes(cod) ? c('obsProc', corta(nome, 999)) : '');
  });
  const coord = separarCrm(empresa.medicoPcmsoCrm, empresa.medicoPcmsoUf);
  const respMonit = empresa.medicoPcmsoNome && coord.numero && coord.uf
    ? el('respMonit', cpfValido(empresa.medicoPcmsoCpf) ? c('cpfResp', digitos(empresa.medicoPcmsoCpf)) : '', c('nmResp', corta(empresa.medicoPcmsoNome, 70)), c('nrCRM', coord.numero), c('ufCRM', coord.uf))
    : '';
  const corpo = ideEvento(id) + ideEmpregador(empresa) + vinculo + el('exMedOcup',
    c('tpExameOcup', TP_EXAME[aso.tipo] ?? 4),
    el('aso', c('dtAso', dia(aso.dataExame)), c('resAso', aso.resultado === 'APTO' ? 1 : 2), itens,
      el('medico', c('nmMed', corta(aso.medicoExaminadorNome, 70)), c('nrCRM', crm.numero), c('ufCRM', crm.uf))),
    respMonit);
  return { xml: raiz('evtMonit', id, corpo), pendencias: p.itens };
}

// ---------- S-2240: condições ambientais (riscos do GHE) ----------
export type EsocialRisco = {
  codAgNoc?: string; unMed?: number; utilizEPC?: 0 | 1 | 2; utilizEPI?: 0 | 1 | 2;
  epiCompl?: { medProtecao: boolean; condFuncto: boolean; usoInint: boolean; przValid: boolean; periodicTroca: boolean; higienizacao: boolean };
};
export const AUSENCIA_AGENTE = '09.01.001';
// Códigos genéricos ("outros") em que a descrição do agente é obrigatória.
const AGENTE_COM_DESCRICAO = ['01.01.001', '01.02.001', '01.03.001', '01.04.001', '01.05.001', '01.06.001', '01.07.001', '01.08.001', '01.09.001', '01.10.001', '01.12.001', '01.13.001', '01.14.001', '01.15.001', '01.16.001', '01.17.001', '01.18.001', '05.01.001'];

export function montarS2240(id: Identificacao, empresa: Empresa, col: Colaborador & { ghe: (Ghe & { riscos: GheRisco[] }) | null }, inicio: Date) {
  const p = new Pendencias();
  const vinculo = ideVinculo(col, p);
  p.exigir(col.ghe, `GHE de ${col.nome}`);
  const ghe = col.ghe;
  // Só agentes físicos, químicos e biológicos entram no S-2240; sem nenhum, informa "ausência de agente nocivo".
  const nocivos = (ghe?.riscos ?? []).filter((r) => ['FISICO', 'QUIMICO', 'BIOLOGICO'].includes(r.tipo) && (r.esocial as EsocialRisco | null)?.codAgNoc !== AUSENCIA_AGENTE);
  const agentes = nocivos.length ? nocivos.map((r) => {
    const e = (r.esocial ?? {}) as EsocialRisco;
    const cod = e.codAgNoc ?? '';
    p.exigir(CODIGOS.t24.has(cod), `código da Tabela 24 do agente "${r.agente}" (${ghe?.nome})`);
    const quant = r.tipoAvaliacao === 'QUANTITATIVA';
    p.exigir(r.tipoAvaliacao, `tipo de avaliação do agente "${r.agente}"`);
    if (quant) {
      p.exigir(numero(r.intensidade), `resultado medido do agente "${r.agente}"`);
      p.exigir(e.unMed, `unidade de medida do agente "${r.agente}"`);
      p.exigir(r.tecnicaMedicao, `técnica de medição do agente "${r.agente}"`);
    }
    p.exigir(e.utilizEPC !== undefined && e.utilizEPI !== undefined, `uso de EPC e EPI para o agente "${r.agente}"`);
    const epis = (r.epiCa ?? '').split(/[,;/]/).map((s) => s.trim()).filter(Boolean);
    if (e.utilizEPI === 2) p.exigir(epis.length, `número do CA do EPI usado contra "${r.agente}"`);
    const req = e.epiCompl;
    return el('agNoc',
      c('codAgNoc', cod),
      AGENTE_COM_DESCRICAO.includes(cod) ? c('dscAgNoc', corta(r.agente, 100)) : '',
      c('tpAval', quant ? 1 : 2),
      quant ? [c('intConc', numero(r.intensidade)), c('limTol', numero(r.limiteTolerancia)), c('unMed', e.unMed), c('tecMedicao', corta(r.tecnicaMedicao, 40))] : '',
      el('epcEpi',
        c('utilizEPC', e.utilizEPC), e.utilizEPC === 2 ? c('eficEpc', sn(r.epcEficaz)) : '',
        c('utilizEPI', e.utilizEPI), e.utilizEPI === 2 ? c('eficEpi', sn(r.epiEficaz)) : '',
        e.utilizEPI === 2 ? epis.slice(0, 50).map((ca) => el('epi', c('docAval', corta(ca, 255)))) : '',
        e.utilizEPI === 2 ? el('epiCompl', c('medProtecao', sn(req?.medProtecao)), c('condFuncto', sn(req?.condFuncto)), c('usoInint', sn(req?.usoInint)),
          c('przValid', sn(req?.przValid)), c('periodicTroca', sn(req?.periodicTroca)), c('higienizacao', sn(req?.higienizacao))) : ''));
  }) : [el('agNoc', c('codAgNoc', AUSENCIA_AGENTE))];

  p.exigir(cpfValido(empresa.responsavelTecnicoCpf), 'CPF do responsável pelos registros ambientais (dados da empresa)');
  const conselho = empresa.responsavelTecnicoConselho;
  const ideOC = conselho === 'CRM' ? 1 : conselho === 'CREA' ? 4 : conselho ? 9 : null;
  const temAgente = nocivos.length > 0;
  if (temAgente) {
    p.exigir(ideOC, 'conselho de classe do responsável pelos registros ambientais (CREA, CRM ou outro)');
    p.exigir(digitos(empresa.responsavelTecnicoRegistro), 'número do registro do responsável pelos registros ambientais');
    p.exigir(empresa.responsavelTecnicoUf, 'UF do registro do responsável pelos registros ambientais');
  }
  const atividades = [col.cargo, ghe?.descricao].filter(Boolean).join('. ');
  const corpo = ideEvento(id) + ideEmpregador(empresa) + vinculo + el('infoExpRisco',
    c('dtIniCondicao', dataIso(inicio)),
    el('infoAmb', c('localAmb', 1), c('dscSetor', corta(ghe?.nome, 100)), c('tpInsc', 1), c('nrInsc', soDocumento(empresa.cnpj))),
    el('infoAtiv', c('dscAtivDes', corta(atividades, 999))),
    agentes,
    el('respReg', c('cpfResp', digitos(empresa.responsavelTecnicoCpf)),
      ideOC ? [c('ideOC', ideOC), ideOC === 9 ? c('dscOC', corta(conselho, 20)) : '', c('nrOC', digitos(empresa.responsavelTecnicoRegistro).slice(0, 14) || null), c('ufOC', empresa.responsavelTecnicoUf)] : ''));
  return { xml: raiz('evtExpRisco', id, corpo), pendencias: p.itens };
}

// ---------- S-2210: comunicação de acidente de trabalho ----------
export type EsocialCat = {
  codSitGeradora?: string; codParteAting?: string; lateralidade?: 0 | 1 | 2 | 3; codAgntCausador?: string; codLesao?: string;
  iniciatCAT?: 1 | 2 | 3; tpLocal?: 1 | 3 | 4 | 5 | 6 | 9; dtObito?: string; logradouro?: string; numero?: string; bairro?: string;
  cep?: string; codMunic?: string; uf?: string; cnpjLocal?: string; ultDiaTrab?: string; internacao?: boolean;
  medicoConselho?: 1 | 2 | 3; medicoUf?: string; reciboCatOrigem?: string;
};
const TP_ACID: Record<string, number> = { TIPICO: 1, DOENCA: 2, TRAJETO: 3 };
const TP_CAT: Record<string, number> = { INICIAL: 1, REABERTURA: 2, OBITO: 3 };

export function montarS2210(id: Identificacao, empresa: Empresa, col: Colaborador, cat: Cat) {
  const p = new Pendencias();
  const vinculo = ideVinculo(col, p);
  const e = (cat.esocial ?? {}) as EsocialCat;
  const tpAcid = TP_ACID[cat.tipoAcidente];
  const tpCat = TP_CAT[cat.tipoCat];
  const tpLocal: number = e.tpLocal ?? 1; // acidente no exterior (2) não é atendido aqui
  const nove = (v: string | undefined, validos: Set<string>[], rotulo: string) => { const d = digitos(v); p.exigir(validos.some((t) => t.has(d)), rotulo); return d; };
  const sit = nove(e.codSitGeradora, [CODIGOS.t15], 'situação geradora do acidente (Tabela 15)');
  const parte = nove(e.codParteAting, [CODIGOS.t13], 'parte do corpo atingida (Tabela 13)');
  // Acidente típico ou de trajeto: só Tabela 14. Doença: Tabela 14 ou 15.
  const agente = nove(e.codAgntCausador, tpAcid === 2 ? [CODIGOS.t14, CODIGOS.t15] : [CODIGOS.t14], 'agente causador (Tabela 14)');
  const lesao = nove(e.codLesao, [CODIGOS.t17], 'natureza da lesão (Tabela 17)');
  p.exigir(cat.atendimentoData, 'data e hora do atendimento médico');
  if (cat.atendimentoData) p.exigir(dataIso(cat.atendimentoData) >= dataIso(cat.dataHora), 'data do atendimento igual ou depois da data do acidente');
  if (e.ultDiaTrab && col.dataAdmissao) p.exigir(e.ultDiaTrab.slice(0, 10) >= dia(col.dataAdmissao), 'último dia trabalhado igual ou depois da admissão');
  p.exigir(cat.medicoNome, 'nome do médico ou dentista que fez o atendimento');
  p.exigir(digitos(cat.medicoCrm), 'número do registro do médico ou dentista');
  const conselho = e.medicoConselho ?? 1;
  const ufMed = e.medicoUf || separarCrm(cat.medicoCrm).uf;
  if (conselho !== 3) p.exigir(ufMed, 'UF do registro do médico ou dentista');
  p.exigir(cat.cid && /^[A-Z]\d{2,3}$/i.test(cat.cid.replace(/[.\s]/g, '')), 'CID do atestado (ex.: S61.0)');
  p.exigir(cat.diasTratamento !== null && cat.diasTratamento !== undefined, 'duração provável do tratamento, em dias');
  p.exigir(e.logradouro, 'endereço do local do acidente');
  p.exigir(e.numero, 'número do endereço do local do acidente (use "S/N" se não houver)');
  if ([1, 3, 5].includes(tpLocal)) p.exigir(digitos(e.cep).length === 8, 'CEP do local do acidente');
  if (tpLocal !== 2) { p.exigir(digitos(e.codMunic).length === 7, 'código IBGE do município do acidente'); p.exigir(e.uf, 'UF do local do acidente'); }
  if (tpCat !== 1) p.exigir(e.reciboCatOrigem, 'recibo da CAT anterior (reabertura ou óbito)');
  p.exigir(e.ultDiaTrab, 'último dia trabalhado');
  const comHora = tpAcid !== 2;
  const horas = digitos(cat.horasTrabalhadas).padStart(4, '0').slice(-4);
  if (comHora) p.exigir(cat.horasTrabalhadas, 'horas trabalhadas antes do acidente');
  const localInsc = tpLocal === 1 ? soDocumento(empresa.cnpj) : tpLocal === 3 ? soDocumento(e.cnpjLocal) : '';
  if (tpLocal === 3) p.exigir(localInsc.length === 14, 'CNPJ da empresa onde aconteceu o acidente');
  const obito = tpCat === 3 || cat.houveObito;

  const corpo = ideEvento(id) + ideEmpregador(empresa) + vinculo + el('cat',
    c('dtAcid', dataIso(cat.dataHora)), c('tpAcid', tpAcid),
    comHora ? c('hrAcid', horaHHMM(cat.dataHora)) : '', comHora ? c('hrsTrabAntesAcid', horas) : '',
    c('tpCat', tpCat), c('indCatObito', tpCat === 2 ? 'N' : sn(obito)), obito && tpCat !== 2 ? c('dtObito', e.dtObito ?? dataIso(cat.dataHora)) : '',
    c('indComunPolicia', sn(cat.registroPolicial)), c('codSitGeradora', sit), c('iniciatCAT', e.iniciatCAT ?? 1),
    c('obsCAT', corta(cat.descricao, 999)), c('ultDiaTrab', e.ultDiaTrab?.slice(0, 10)), c('houveAfast', sn(cat.houveAfastamento)),
    el('localAcidente', c('tpLocal', tpLocal), c('dscLocal', corta(cat.local, 255)), 
      c('dscLograd', corta(e.logradouro, 100)), c('nrLograd', corta(e.numero, 10)), c('bairro', corta(e.bairro, 90)),
      tpLocal !== 2 ? c('cep', digitos(e.cep) || null) : '',
      tpLocal !== 2 ? [c('codMunic', digitos(e.codMunic)), c('uf', e.uf)] : '',
      localInsc ? el('ideLocalAcid', c('tpInsc', 1), c('nrInsc', localInsc)) : ''),
    el('parteAtingida', c('codParteAting', parte), c('lateralidade', e.lateralidade ?? 0)),
    el('agenteCausador', c('codAgntCausador', agente)),
    cat.atendimentoData ? el('atestado',
      c('dtAtendimento', dataIso(cat.atendimentoData)), c('hrAtendimento', horaHHMM(cat.atendimentoData)),
      c('indInternacao', sn(e.internacao)), c('durTrat', cat.diasTratamento ?? 0), c('indAfast', obito ? 'N' : sn(cat.houveAfastamento)),
      c('dscLesao', lesao), c('diagProvavel', corta(cat.naturezaLesao, 100)), c('codCID', (cat.cid ?? '').toUpperCase().replace(/[.\s]/g, '')),
      el('emitente', c('nmEmit', corta(cat.medicoNome, 70)), c('ideOC', conselho), c('nrOC', digitos(cat.medicoCrm).slice(0, 14)), conselho !== 3 ? c('ufOC', ufMed) : '')) : '',
    tpCat !== 1 ? el('catOrigem', c('nrRecCatOrig', e.reciboCatOrigem)) : '');
  return { xml: raiz('evtCAT', id, corpo), pendencias: p.itens };
}

// ---------- S-2230: afastamento temporário ----------
// fase "inicio" leva o início (e o fim, se já houver); fase "fim" leva só o término de um início já aceito.
export function montarS2230(id: Identificacao, empresa: Empresa, col: Colaborador, a: Afastamento, fase: 'inicio' | 'fim', anteriores: Afastamento[]) {
  const p = new Pendencias();
  const vinculo = ideVinculo(col, p);
  const saude = ['01', '03'].includes(a.motivo);
  if (a.motivo === '21') p.exigir(a.observacao, 'observação do afastamento (obrigatória para este motivo)');
  if (fase === 'fim') p.exigir(a.fim, 'data da volta do afastamento');
  if (saude && a.mesmoMotivo) {
    const limite = a.inicio.getTime() - 60 * 86_400_000;
    p.exigir(anteriores.some((x) => x.id !== a.id && x.motivo === a.motivo && x.fim && x.fim.getTime() >= limite && x.fim < a.inicio),
      'afastamento anterior pelo mesmo motivo nos últimos 60 dias (marcado "mesma doença", mas não há outro registrado)');
  }
  const ini = fase === 'inicio' ? el('iniAfastamento',
    c('dtIniAfast', dia(a.inicio)), c('codMotAfast', a.motivo),
    saude && a.mesmoMotivo !== null && a.mesmoMotivo !== undefined && dia(a.inicio) >= '2026-10-26' ? c('infoMesmoMtv', sn(a.mesmoMotivo)) : '',
    saude ? c('tpAcidTransito', a.acidenteTransito) : '',
    c('observacao', corta(a.observacao, 255))) : '';
  const fim = a.fim ? el('fimAfastamento', c('dtTermAfast', dia(a.fim))) : '';
  const corpo = ideEvento(id) + ideEmpregador(empresa) + vinculo + el('infoAfastamento', ini, fim);
  return { xml: raiz('evtAfastTemp', id, corpo), pendencias: p.itens };
}
