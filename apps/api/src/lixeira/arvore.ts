import { Prisma } from '@prisma/client';

// Lixeira: antes de apagar, guarda a linha e tudo o que o banco apagaria junto (as "filhas" com exclusão em
// cascata), lendo o desenho do banco (DMMF do Prisma). Assim um colaborador volta com ASOs, EPI e treinamentos.
// Também anota quem apontava para a linha e ficaria solto (ex.: colaborador que perde o GHE), para religar na volta.

export type Arvore = {
  m: string; // modelo (ex.: "Colaborador")
  r: Record<string, unknown>; // a linha, só com os campos simples
  f: Arvore[]; // filhas apagadas junto
  n: { m: string; id: string; campo: string }[]; // linhas que só perderam a ligação (SetNull)
};

// O que nunca entra na Lixeira: registros do próprio sistema, dados de acesso, biometria (LGPD: rosto apagado sai de vez).
export const NAO_GUARDA = new Set([
  'Lixeira', 'Historico', 'FalhaSistema', 'ConfigPlataforma', 'AvisoCelular', 'Usuario', 'Consultoria', 'Empresa',
  'PagamentoPlano', 'CertificadoDigital', 'RostoColaborador', 'PresencaFacial', 'CnaeGrauRisco', 'DocumentoEmitido',
  'AvisoNorma', 'AvisoNormaLido', 'PedidoSuporte',
]);

type Campo = Prisma.DMMF.Field;
const MODELOS = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
export const delegado = (modelo: string) => modelo.charAt(0).toLowerCase() + modelo.slice(1);
export const campoId = (modelo: string) => MODELOS.get(modelo)?.fields.find((f) => f.isId)?.name;

// Relações que apontam para o modelo: [modelo filho, campo do filho que guarda o id, regra ao apagar].
function quemAponta(modelo: string): { m: string; fk: string; regra: string }[] {
  const out: { m: string; fk: string; regra: string }[] = [];
  for (const m of MODELOS.values()) {
    for (const f of m.fields as Campo[]) {
      if (f.kind !== 'object' || f.type !== modelo || !f.relationFromFields?.length) continue;
      out.push({ m: m.name, fk: f.relationFromFields[0], regra: String(f.relationOnDelete ?? (f.isRequired ? 'Restrict' : 'SetNull')) });
    }
  }
  return out;
}

// Só os campos simples (sem relações), prontos para virar JSON.
function simples(modelo: string, linha: Record<string, unknown>) {
  const campos = MODELOS.get(modelo)!.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum');
  return Object.fromEntries(campos.map((f) => [f.name, linha[f.name]]));
}

type Leitor = Record<string, { findMany: (a: unknown) => Promise<Record<string, unknown>[]> }>;

export async function capturar(db: unknown, modelo: string, where: unknown, profundidade = 0): Promise<Arvore[]> {
  const id = campoId(modelo);
  if (!id || NAO_GUARDA.has(modelo) || profundidade > 5) return [];
  const linhas = await (db as Leitor)[delegado(modelo)].findMany({ where });
  const arvores: Arvore[] = [];
  for (const linha of linhas) {
    const a: Arvore = { m: modelo, r: simples(modelo, linha), f: [], n: [] };
    for (const rel of quemAponta(modelo)) {
      if (rel.regra === 'Cascade') a.f.push(...(await capturar(db, rel.m, { [rel.fk]: linha[id] }, profundidade + 1)));
      else if (rel.regra === 'SetNull' && campoId(rel.m)) {
        const soltas = await (db as Leitor)[delegado(rel.m)].findMany({ where: { [rel.fk]: linha[id] } });
        for (const s of soltas) a.n.push({ m: rel.m, id: String(s[campoId(rel.m)!]), campo: rel.fk });
      }
    }
    arvores.push(a);
  }
  return arvores;
}

// Nome de cada tipo de registro, como aparece na Lixeira.
const NOMES: Record<string, string> = {
  Colaborador: 'Colaborador', Aso: 'ASO', EntregaEpi: 'Entrega de EPI', Documento: 'Versão emitida', Ghe: 'GHE', GheRisco: 'Risco',
  ExameGhe: 'Exame do GHE', Apr: 'APR', PermissaoTrabalho: 'Permissão de trabalho', Dds: 'DDS', Turma: 'Treinamento', Participacao: 'Participação em treinamento',
  Aet: 'AET', Cat: 'CAT', Inspecao: 'Inspeção', Afastamento: 'Afastamento', Atestado: 'Atestado', AcaoCorretiva: 'Ação do plano',
  Investigacao: 'Investigação', Relato: 'Relato', CipaEleicao: 'Eleição da CIPA', CipaMembro: 'Membro da CIPA', CipaReuniao: 'Reunião da CIPA',
  EspacoConfinado: 'Espaço confinado', PlanoResgate: 'Plano de resgate', ControleEmergencia: 'Controle de emergência', EstoqueEpi: 'Item do almoxarifado',
  Sipat: 'SIPAT', SipatAtividade: 'Atividade da SIPAT', Auditoria5s: 'Auditoria 5S', ImportacaoPdf: 'PGR antigo', Arquivo: 'Arquivo',
  Terceiro: 'Terceirizada', TerceiroDocumento: 'Documento da terceirizada', TerceiroTrabalhador: 'Trabalhador terceirizado', Toxicologico: 'Exame toxicológico',
  AvaliacaoPsicossocial: 'Avaliação psicossocial', Proposta: 'Proposta', Contrato: 'Contrato', Servico: 'Ordem de serviço', Cobranca: 'Cobrança',
  RegistroSaude: 'Registro do prontuário', CalculoSalvo: 'Cálculo salvo', FotoColaborador: 'Foto do colaborador',
};
export const nomeDoTipo = (modelo: string) => NOMES[modelo] ?? 'Registro';

// Nome curto do que foi apagado, para a lista da Lixeira.
export function rotulo(a: Arvore): string {
  const r = a.r;
  const nome = [r.nome, r.titulo, r.descricao, r.razaoSocial, r.epi, r.tema, r.local, r.tipo].find((v) => typeof v === 'string' && v.trim()) as string | undefined;
  return nome ? nome.slice(0, 80) : '';
}

export const contar = (as: Arvore[]): number => as.reduce((t, a) => t + 1 + contar(a.f), 0);

type Escritor = Record<string, {
  findUnique: (a: unknown) => Promise<unknown>;
  create: (a: unknown) => Promise<unknown>;
  updateMany: (a: unknown) => Promise<unknown>;
}>;

// Devolve ao banco: primeiro a linha, depois as filhas; o que já existe (restaurado antes) fica como está.
export async function devolver(tx: unknown, a: Arvore): Promise<void> {
  const db = tx as Escritor;
  const id = campoId(a.m)!;
  const existe = await db[delegado(a.m)].findUnique({ where: { [id]: a.r[id] } });
  if (!existe) {
    const json = new Set(MODELOS.get(a.m)!.fields.filter((f) => f.type === 'Json').map((f) => f.name));
    const dados = Object.fromEntries(Object.entries(a.r).filter(([k, v]) => !(v === null && json.has(k))));
    await db[delegado(a.m)].create({ data: dados });
  }
  for (const f of a.f) await devolver(tx, f);
  for (const s of a.n) {
    await db[delegado(s.m)].updateMany({ where: { [campoId(s.m)!]: s.id, [s.campo]: null }, data: { [s.campo]: a.r[id] } });
  }
}
