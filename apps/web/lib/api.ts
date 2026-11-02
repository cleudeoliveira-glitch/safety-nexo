import { lerToken, sair } from './sessao';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

function cabecalhos(): Record<string, string> {
  const token = lerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Sem sessão válida, volta para a tela de entrar.
function verificarSessao(res: Response) {
  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/entrar')) sair();
}

export type Empresa = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  cnae: string | null;
  grauRisco: number | null;
  numFuncionarios: number;
  logoPath: string | null;
  medicoPcmsoNome: string | null;
  medicoPcmsoCrm: string | null;
};
export type Risco = { id: string; tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; severidade: string };
export type Exame = {
  id: string;
  nome: string;
  tipo: string;
  admissional: boolean;
  periodico: boolean;
  retornoTrabalho: boolean;
  mudancaRisco: boolean;
  demissional: boolean;
  periodicidadeMeses: number | null;
};
export type Ghe = { id: string; nome: string; descricao: string | null; riscos: Risco[]; exames: Exame[]; _count: { colaboradores: number } };
export type Colaborador = { id: string; nome: string; cpf?: string | null; cargo: string; cbo: string | null; gheId: string | null };
export type Aso = {
  id: string; tipo: string; dataExame: string; resultado: 'APTO' | 'INAPTO';
  medicoExaminadorNome: string; medicoExaminadorCrm: string; exames: string[]; riscos: string[]; proximoExame: string | null;
};
export type EntregaEpi = { id: string; epi: string; ca: string; validadeCa: string | null; quantidade: number; motivo: string; dataEntrega: string };
export type ColaboradorDetalhe = Colaborador & { ghe: Ghe | null; asos: Aso[]; entregasEpi: EntregaEpi[] };
export type Pendencia = { titulo: string; detalhe: string; nivel: 'vencido' | 'pendente' | 'em-dia' };
export type Vencimento = { tipo: string; versao: number; vencimento: string; dias: number };
export type Painel = { empresa: Pick<Empresa, 'id' | 'razaoSocial' | 'cnpj'>; percentual: number; pendencias: Pendencia[]; vencimentos: Vencimento[] };
export type Cipa = {
  grauRisco: number | null;
  numFuncionarios: number;
  atendidaSesmt: boolean;
  representante: string | null;
  dimensionamento:
    | { situacao: 'SEM_GRAU' }
    | { situacao: 'REPRESENTANTE'; minimoParaCipa: number }
    | { situacao: 'CIPA'; efetivos: number; suplentes: number };
  calendario: { inicioMandato: string; fimMandato: string; convocacaoAte: string; eleicaoAte: string; posse: string } | null;
};
export type CnaeInfo = { classe: string; denominacao: string; grauRisco: number };

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const headers = cabecalhos();
  let body: BodyInit | undefined;
  if (corpo instanceof FormData) body = corpo;
  else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }
  const res = await fetch(`${API_URL}${caminho}`, { method: metodo, headers, body });
  verificarSessao(res);
  if (!res.ok) {
    const erro = await res.json().catch(() => null);
    const mensagem = Array.isArray(erro?.message) ? erro.message.join('; ') : erro?.message;
    throw new Error(mensagem ?? `Não foi possível concluir a operação (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

export const listarEmpresas = () => chamar<Empresa[]>('GET', '/empresas');
export const buscarEmpresa = (id: string) => chamar<Empresa>('GET', `/empresas/${id}`);
export const criarEmpresa = (dados: Partial<Empresa>) => chamar<Empresa>('POST', '/empresas', dados);
export const atualizarEmpresa = (id: string, dados: Partial<Empresa>) => chamar<Empresa>('PATCH', `/empresas/${id}`, dados);
export const carregarPainel = (empresaId: string) => chamar<Painel>('GET', `/empresas/${empresaId}/painel`);
export const buscarCnae = (codigo: string) => chamar<CnaeInfo>('GET', `/cnae/${encodeURIComponent(codigo)}`);

export const listarGhes = (empresaId: string) => chamar<Ghe[]>('GET', `/empresas/${empresaId}/ghes`);
export const criarGhe = (empresaId: string, dados: { nome: string; descricao?: string }) =>
  chamar<Ghe>('POST', `/empresas/${empresaId}/ghes`, dados);
export const criarRisco = (empresaId: string, gheId: string, dados: Omit<Risco, 'id'>) =>
  chamar<Risco>('POST', `/empresas/${empresaId}/ghes/${gheId}/riscos`, dados);
export const criarExame = (empresaId: string, gheId: string, dados: Omit<Exame, 'id'>) =>
  chamar<Exame>('POST', `/empresas/${empresaId}/ghes/${gheId}/exames`, dados);

export const listarColaboradores = (empresaId: string) => chamar<Colaborador[]>('GET', `/empresas/${empresaId}/colaboradores`);
export const criarColaborador = (empresaId: string, dados: Omit<Colaborador, 'id'>) =>
  chamar<Colaborador>('POST', `/empresas/${empresaId}/colaboradores`, dados);

export const definirMedico = (empresaId: string, dados: { nome: string; crm: string }) =>
  chamar<Empresa>('PUT', `/empresas/${empresaId}/pcmso/medico`, dados);

export function enviarLogoEmpresa(empresaId: string, arquivo: File) {
  const form = new FormData();
  form.append('arquivo', arquivo);
  return chamar<Empresa>('PUT', `/empresas/${empresaId}/logo`, form);
}

// Pede um PDF à API e devolve o arquivo para baixar.
async function baixarPdf(caminho: string, nome: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${caminho}`, { method: 'POST', headers: cabecalhos() });
  verificarSessao(res);
  if (!res.ok) throw new Error(`Não foi possível gerar o ${nome} (${res.status}).`);
  return res.blob();
}

export const gerarDocumento = (empresaId: string, tipo: 'pgr' | 'pcmso') =>
  baixarPdf(`/empresas/${empresaId}/documentos/${tipo}`, tipo.toUpperCase());

export const buscarCipa = (empresaId: string) => chamar<Cipa>('GET', `/empresas/${empresaId}/cipa`);
export const salvarCipa = (empresaId: string, dados: { atendidaSesmt?: boolean; inicioMandato?: string; representante?: string }) =>
  chamar<Cipa>('PUT', `/empresas/${empresaId}/cipa`, dados);
export const gerarCipa = (empresaId: string) => baixarPdf(`/empresas/${empresaId}/cipa/pdf`, 'dimensionamento da CIPA');

const rotaColaborador = (empresaId: string, colaboradorId: string) => `/empresas/${empresaId}/colaboradores/${colaboradorId}`;
export const buscarColaborador = (empresaId: string, colaboradorId: string) =>
  chamar<ColaboradorDetalhe>('GET', rotaColaborador(empresaId, colaboradorId));
export const registrarAso = (empresaId: string, colaboradorId: string, dados: Record<string, string>) =>
  chamar<Aso>('POST', `${rotaColaborador(empresaId, colaboradorId)}/asos`, dados);
export const registrarEpi = (empresaId: string, colaboradorId: string, dados: Record<string, string | number>) =>
  chamar<EntregaEpi>('POST', `${rotaColaborador(empresaId, colaboradorId)}/epis`, dados);
export const gerarAso = (empresaId: string, colaboradorId: string, asoId: string) =>
  baixarPdf(`${rotaColaborador(empresaId, colaboradorId)}/asos/${asoId}/pdf`, 'ASO');
export const gerarFichaEpi = (empresaId: string, colaboradorId: string) =>
  baixarPdf(`${rotaColaborador(empresaId, colaboradorId)}/ficha-epi`, 'ficha de EPI');

// Faz o navegador baixar um PDF já gerado.
export function salvarArquivo(pdf: Blob, nome: string) {
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  link.href = url;
  // Sem acentos: alguns navegadores trocam nomes acentuados por "download".
  link.download = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Libera o arquivo só depois que o navegador começou a baixar.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type Acesso = { token: string; usuario: { nome: string } };
export const entrar = (dados: { email: string; senha: string }) => chamar<Acesso>('POST', '/auth/entrar', dados);
export const cadastrar = (dados: { nomeConsultoria: string; nome: string; email: string; senha: string }) =>
  chamar<Acesso>('POST', '/auth/cadastro', dados);
