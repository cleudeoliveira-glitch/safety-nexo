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
  responsavelTecnicoNome?: string | null;
  responsavelTecnicoRegistro?: string | null;
  representanteLegalNome?: string | null;
};
export type AvaliacaoRisco = {
  tipoAvaliacao: 'QUALITATIVA' | 'QUANTITATIVA';
  intensidade?: string | null;
  limiteTolerancia?: string | null;
  tecnicaMedicao?: string | null;
  epcEficaz?: boolean | null;
  epiEficaz?: boolean | null;
  epiCa?: string | null;
  codigoAnexoIv?: string | null;
  aposentadoriaEspecial: boolean;
  anexoNr15?: string | null;
  grauInsalubridade?: 'NAO' | 'MINIMO' | 'MEDIO' | 'MAXIMO' | null;
};
export type Risco = { id: string; tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; severidade: string } & Partial<AvaliacaoRisco>;
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
export type Ghe = { id: string; nome: string; descricao: string | null; periculosidadeAnexo?: string | null; periculosidadeJustificativa?: string | null; riscos: Risco[]; exames: Exame[]; _count: { colaboradores: number } };
export type Colaborador = { id: string; nome: string; cpf?: string | null; dataAdmissao?: string | null; cargo: string; cbo: string | null; gheId: string | null };
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
export const avaliarRisco = (empresaId: string, gheId: string, riscoId: string, dados: AvaliacaoRisco) =>
  chamar<Risco>('PUT', `/empresas/${empresaId}/ghes/${gheId}/riscos/${riscoId}/avaliacao`, dados);
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

export type TipoDocumento = 'pgr' | 'pcmso' | 'ltcat' | 'lip' | 'lpp' | 'pgrtr' | 'os';
export const gerarDocumento = (empresaId: string, tipo: TipoDocumento) =>
  baixarPdf(`/empresas/${empresaId}/documentos/${tipo}`, tipo === 'os' ? 'as ordens de serviço' : tipo.toUpperCase());

export const buscarCipa = (empresaId: string) => chamar<Cipa>('GET', `/empresas/${empresaId}/cipa`);
export const salvarCipa = (empresaId: string, dados: { atendidaSesmt?: boolean; inicioMandato?: string; representante?: string }) =>
  chamar<Cipa>('PUT', `/empresas/${empresaId}/cipa`, dados);
export const gerarCipa = (empresaId: string) => baixarPdf(`/empresas/${empresaId}/cipa/pdf`, 'dimensionamento da CIPA');

export type MembroCipa = { membroId: string; colaboradorId: string; nome: string; cpf: string | null; cargo: string };
export type CandidatoCipa = MembroCipa & { votos: number | null; posicao: number; situacao: 'TITULAR' | 'SUPLENTE' | 'NAO_ELEITO'; vice: boolean };
export type IndicadoCipa = MembroCipa & { titular: boolean; presidente: boolean };
export type EleicaoCipa = {
  id: string; editalEm: string; inscricaoInicio: string; inscricaoFim: string; eleicaoEm: string;
  localVotacao: string; horarioVotacao: string; votantes: number | null; posseEm: string | null;
  treinamentoInicio: string | null; treinamentoFim: string | null; instrutor: string | null;
  vagas: { efetivos: number; suplentes: number }; candidatos: CandidatoCipa[]; indicados: IndicadoCipa[];
  participacao: { votantes: number; empregados: number; percentual: number; valida: boolean } | null;
  cargaHoraria: number | null; fimMandato: string | null; avisos: string[];
};
export type DocumentoEleicao = 'edital' | 'inscricao' | 'inscritos' | 'cedulas' | 'ata-eleicao' | 'ata-posse' | 'certificados';

const rotaEleicoes = (empresaId: string) => `/empresas/${empresaId}/cipa/eleicoes`;
export const listarEleicoes = (empresaId: string) => chamar<EleicaoCipa[]>('GET', rotaEleicoes(empresaId));
export const criarEleicao = (empresaId: string, dados: Record<string, string>) => chamar<EleicaoCipa>('POST', rotaEleicoes(empresaId), dados);
export const atualizarEleicao = (empresaId: string, eleicaoId: string, dados: Record<string, string | number>) =>
  chamar<EleicaoCipa>('PATCH', `${rotaEleicoes(empresaId)}/${eleicaoId}`, dados);
export const adicionarMembroCipa = (empresaId: string, eleicaoId: string, dados: { colaboradorId: string; representacao: 'EMPREGADOS' | 'ORGANIZACAO'; titular?: boolean }) =>
  chamar<EleicaoCipa>('POST', `${rotaEleicoes(empresaId)}/${eleicaoId}/membros`, dados);
export const atualizarMembroCipa = (empresaId: string, eleicaoId: string, membroId: string, dados: { votos?: number; titular?: boolean; presidente?: boolean; vice?: boolean }) =>
  chamar<EleicaoCipa>('PATCH', `${rotaEleicoes(empresaId)}/${eleicaoId}/membros/${membroId}`, dados);
export const removerMembroCipa = (empresaId: string, eleicaoId: string, membroId: string) =>
  chamar<EleicaoCipa>('DELETE', `${rotaEleicoes(empresaId)}/${eleicaoId}/membros/${membroId}`);
export const gerarDocumentoEleicao = (empresaId: string, eleicaoId: string, documento: DocumentoEleicao) =>
  baixarPdf(`${rotaEleicoes(empresaId)}/${eleicaoId}/pdf/${documento}`, 'documento da CIPA');

export type EtapaApr = { etapa: string; riscos: string; medidas: string; epis: string };
export type Apr = { id: string; numero: number; atividade: string; local: string; data: string; responsavel: string; equipe: string[]; etapas: EtapaApr[] };
export type TipoPt = 'ALTURA' | 'ESPACO_CONFINADO' | 'QUENTE' | 'ELETRICIDADE';
export type Permissao = {
  id: string; numero: number; tipo: TipoPt; atividade: string; local: string; inicio: string; fim: string;
  executantes: string[]; emitente: string; checklist: { item: string; ok: boolean }[]; encerradaEm: string | null; apr: { numero: number } | null;
};
export type Dds = { id: string; tema: string; conteudo: string; data: string; duracaoMin: number; ministrante: string; participantes: string[] };
export type ConteudoOperacao = {
  tiposPt: Record<TipoPt, { nome: string; norma: string; checklist: string[] }>;
  temasDds: { categoria: string; tema: string; conteudo: string; pergunta: string }[];
};

export const buscarConteudoOperacao = () => chamar<ConteudoOperacao>('GET', '/operacao/conteudo');
export const listarAprs = (empresaId: string) => chamar<Apr[]>('GET', `/empresas/${empresaId}/aprs`);
export const criarApr = (empresaId: string, dados: Omit<Apr, 'id' | 'numero'>) => chamar<Apr>('POST', `/empresas/${empresaId}/aprs`, dados);
export const listarPermissoes = (empresaId: string) => chamar<Permissao[]>('GET', `/empresas/${empresaId}/permissoes`);
export const criarPermissao = (empresaId: string, dados: Omit<Permissao, 'id' | 'numero' | 'encerradaEm' | 'apr'> & { aprId?: string }) =>
  chamar<Permissao>('POST', `/empresas/${empresaId}/permissoes`, dados);
export const encerrarPermissao = (empresaId: string, id: string) => chamar<Permissao>('POST', `/empresas/${empresaId}/permissoes/${id}/encerrar`);
export const listarDds = (empresaId: string) => chamar<Dds[]>('GET', `/empresas/${empresaId}/dds`);
export const criarDds = (empresaId: string, dados: Omit<Dds, 'id'>) => chamar<Dds>('POST', `/empresas/${empresaId}/dds`, dados);
export const gerarPdfOperacao = (empresaId: string, tipo: 'aprs' | 'permissoes' | 'dds', id: string) =>
  baixarPdf(`/empresas/${empresaId}/${tipo}/${id}/pdf`, 'documento');

export type ModeloTreinamento = { nome: string; norma: string | null; cargaHoraria: number | null; validadeMeses: number | null; conteudo: string[] };
export type Turma = {
  id: string; nome: string; norma: string | null; cargaHoraria: number; validadeMeses: number | null; conteudo: string[];
  inicio: string; fim: string; local: string; instrutor: string; qualificacao: string; responsavelTecnico: string; validade: string | null;
  participantes: { id: string; codigo: string; colaboradorId: string; nome: string; cargo: string }[];
};
export type CertificadoValidado = {
  codigo: string; participante: string; cpf: string | null; treinamento: string; norma: string | null; cargaHoraria: number;
  inicio: string; fim: string; instrutor: string; empresa: string; consultoria: string; validade: string | null; situacao: 'VALIDO' | 'VENCIDO';
};

export const buscarCatalogoTreinamentos = () => chamar<ModeloTreinamento[]>('GET', '/treinamentos/catalogo');
export const listarTurmas = (empresaId: string) => chamar<Turma[]>('GET', `/empresas/${empresaId}/turmas`);
export const criarTurma = (empresaId: string, dados: Omit<Turma, 'id' | 'validade' | 'participantes' | 'validadeMeses'> & { validadeMeses?: number }) =>
  chamar<Turma>('POST', `/empresas/${empresaId}/turmas`, dados);
export const adicionarParticipantes = (empresaId: string, turmaId: string, colaboradorIds: string[]) =>
  chamar<Turma>('POST', `/empresas/${empresaId}/turmas/${turmaId}/participantes`, { colaboradorIds });
export const removerParticipante = (empresaId: string, turmaId: string, id: string) =>
  chamar<Turma>('DELETE', `/empresas/${empresaId}/turmas/${turmaId}/participantes/${id}`);
export const gerarPdfTurma = (empresaId: string, turmaId: string, documento: 'lista' | 'certificados') =>
  baixarPdf(`/empresas/${empresaId}/turmas/${turmaId}/${documento}`, documento === 'lista' ? 'lista de presença' : 'certificados');

// Consulta pública do QR Code: não usa a sessão.
export async function validarCertificado(codigo: string): Promise<CertificadoValidado | null> {
  const res = await fetch(`${API_URL}/validar/${encodeURIComponent(codigo)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Não foi possível consultar o certificado agora. Tente de novo em instantes.');
  return res.json();
}

export type AcessoEmpresa = { id: string; nome: string; email: string; createdAt: string };
export const listarAcessos = (empresaId: string) => chamar<AcessoEmpresa[]>('GET', `/empresas/${empresaId}/acessos`);
export const criarAcesso = (empresaId: string, dados: { nome: string; email: string; senha: string }) =>
  chamar<AcessoEmpresa>('POST', `/empresas/${empresaId}/acessos`, dados);
export const removerAcesso = (empresaId: string, id: string) => chamar<{ ok: true }>('DELETE', `/empresas/${empresaId}/acessos/${id}`);

export type LinhaPainelGeral = {
  empresa: { id: string; razaoSocial: string; cnpj: string };
  percentual: number; vencidos: number; pendentes: number;
  principal: Pendencia | null;
  proximoVencimento: Vencimento | null;
};
export type PainelGeral = {
  totais: { empresas: number; saudeMedia: number; comVencidos: number; vencidos: number; pendentes: number };
  empresas: LinhaPainelGeral[];
};
export const carregarPainelGeral = () => chamar<PainelGeral>('GET', '/painel-geral');

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

export type Acesso = { token: string; usuario: { nome: string; papel: 'CONSULTORIA' | 'EMPRESA'; empresaId: string | null } };
export const entrar = (dados: { email: string; senha: string }) => chamar<Acesso>('POST', '/auth/entrar', dados);
export const cadastrar = (dados: { nomeConsultoria: string; nome: string; email: string; senha: string }) =>
  chamar<Acesso>('POST', '/auth/cadastro', dados);

// Saúde ocupacional: PPP, AET e CAT.
export const gerarPpp = (empresaId: string, colaboradorId: string) =>
  baixarPdf(`/empresas/${empresaId}/colaboradores/${colaboradorId}/ppp`, 'PPP');

export type RecomendacaoAet = { recomendacao: string; prazo?: string; responsavel?: string };
export type Aet = {
  id: string; posto: string; data: string; responsavel: string; demanda: string; funcionamento: string;
  metodos: string; diagnostico: string; recomendacoes: RecomendacaoAet[]; restituicao: string;
};
export const listarAets = (empresaId: string) => chamar<Aet[]>('GET', `/empresas/${empresaId}/aets`);
export const criarAet = (empresaId: string, dados: Omit<Aet, 'id'>) => chamar<Aet>('POST', `/empresas/${empresaId}/aets`, dados);
export const gerarAet = (empresaId: string, id: string) => baixarPdf(`/empresas/${empresaId}/aets/${id}/pdf`, 'AET');

export type Cat = {
  id: string; colaboradorId: string; colaborador?: { nome: string; cargo: string };
  tipoCat: 'INICIAL' | 'REABERTURA' | 'OBITO'; tipoAcidente: 'TIPICO' | 'TRAJETO' | 'DOENCA';
  dataHora: string; local: string; parteAtingida: string; agenteCausador: string; naturezaLesao: string; descricao: string;
  houveAfastamento: boolean; houveObito: boolean; prazo: string; enviadaEm: string | null; recibo: string | null;
};
export type NovaCat = Omit<Cat, 'id' | 'colaborador' | 'prazo' | 'enviadaEm' | 'recibo' | 'houveObito'> & {
  houveObito?: boolean; horasTrabalhadas?: string; registroPolicial?: boolean; testemunhas?: string;
  atendimentoData?: string; medicoNome?: string; medicoCrm?: string; cid?: string; diasTratamento?: number;
};
export const listarCats = (empresaId: string) => chamar<Cat[]>('GET', `/empresas/${empresaId}/cats`);
export const criarCat = (empresaId: string, dados: NovaCat) => chamar<Cat>('POST', `/empresas/${empresaId}/cats`, dados);
export const marcarCatEnviada = (empresaId: string, id: string, recibo: string) =>
  chamar<{ ok: boolean }>('POST', `/empresas/${empresaId}/cats/${id}/enviada`, { recibo });
export const gerarCat = (empresaId: string, id: string) => baixarPdf(`/empresas/${empresaId}/cats/${id}/pdf`, 'CAT');

// Laudos (NR-15 e NR-16), ordem de serviço e checklists.
export type AnexosLaudo = {
  nr15: { anexo: string; nome: string; grau: 'MINIMO' | 'MEDIO' | 'MAXIMO' | null }[];
  nr16: { codigo: string; anexo: string; nome: string }[];
};
export const buscarAnexosLaudo = () => chamar<AnexosLaudo>('GET', '/laudos/anexos');
export const definirPericulosidade = (empresaId: string, gheId: string, dados: { anexo: string; justificativa?: string }) =>
  chamar<Ghe>('PUT', `/empresas/${empresaId}/ghes/${gheId}/periculosidade`, dados);
export const gerarOs = (empresaId: string, colaboradorId: string) =>
  baixarPdf(`/empresas/${empresaId}/colaboradores/${colaboradorId}/os`, 'ordem de serviço');

export type ModeloChecklist = { modelo: string; titulo: string; itens: string[] };
export type ItemInspecao = { texto: string; resposta: 'C' | 'NC' | 'NA'; observacao?: string };
export type Inspecao = {
  id: string; modelo: string; titulo: string; local: string; data: string; inspetor: string; itens: ItemInspecao[];
  resumo: { aplicaveis: number; conformes: number; naoConformes: number; percentual: number };
};
export const buscarModelosChecklist = () => chamar<ModeloChecklist[]>('GET', '/inspecoes/modelos');
export const listarInspecoes = (empresaId: string) => chamar<Inspecao[]>('GET', `/empresas/${empresaId}/inspecoes`);
export const criarInspecao = (empresaId: string, dados: Omit<Inspecao, 'id' | 'resumo'>) => chamar<Inspecao>('POST', `/empresas/${empresaId}/inspecoes`, dados);
export const gerarInspecao = (empresaId: string, id: string) => baixarPdf(`/empresas/${empresaId}/inspecoes/${id}/pdf`, 'relatório da inspeção');

// Emergência: brigada (IT 17 SP), AVCB, extintores e plano de emergência.
export type DivisaoIt17 = { divisao: string; descricao: string; risco: 'BAIXO' | 'MEDIO' | 'ALTO' };
export type ConfigEmergencia = {
  divisao: string; risco: 'BAIXO' | 'MEDIO' | 'ALTO'; populacaoPorPavimento: number[];
  pontoEncontro?: string; rotasFuga?: string; contatos?: string; coordenador?: string;
};
export type ControleEmergencia = { id: string; tipo: string; descricao: string; local: string | null; numero: string | null; validade: string | null };
export type SituacaoEmergencia = {
  config: ConfigEmergencia | null;
  calculo: { porPavimento: number[]; total: number | null; nivelTexto: string; observacao: string | null } | null;
  brigadistas: { nome: string; cargo: string; nivel: string; validade: string | null }[];
  controles: ControleEmergencia[];
};
export const buscarTabelaIt17 = () => chamar<{ divisoes: DivisaoIt17[]; cargaHoraria: Record<string, number> }>('GET', '/emergencia/tabela');
export const buscarEmergencia = (empresaId: string) => chamar<SituacaoEmergencia>('GET', `/empresas/${empresaId}/emergencia`);
export const salvarEmergencia = (empresaId: string, dados: ConfigEmergencia) => chamar<SituacaoEmergencia>('PUT', `/empresas/${empresaId}/emergencia`, dados);
export const criarControleEmergencia = (empresaId: string, dados: Omit<ControleEmergencia, 'id' | 'local' | 'numero' | 'validade'> & { local?: string; numero?: string; validade?: string }) =>
  chamar<ControleEmergencia>('POST', `/empresas/${empresaId}/emergencia/controles`, dados);
export const removerControleEmergencia = (empresaId: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${empresaId}/emergencia/controles/${id}`);
export const gerarPlanoEmergencia = (empresaId: string) => baixarPdf(`/empresas/${empresaId}/emergencia/plano`, 'plano de emergência');

// eSocial: certificado da consultoria e fila de eventos de SST.
export type CertificadoEsocial = { titular: string; documento: string; tipoDocumento: 'CNPJ' | 'CPF'; validoDe: string; validoAte: string };
export type EventoEsocial = {
  id: string; tipo: string; descricao: string; idEvento: string; ambiente: 'PRODUCAO_RESTRITA' | 'PRODUCAO';
  status: 'PENDENTE' | 'ENVIADO' | 'PROCESSADO' | 'ERRO'; protocolo: string | null; recibo: string | null;
  mensagens: { codigo?: string; descricao?: string; localizacao?: string }[] | null; createdAt: string; updatedAt: string;
};
export const buscarCertificado = () => chamar<CertificadoEsocial | null>('GET', '/esocial/certificado');
export function enviarCertificado(arquivo: File, senha: string) {
  const form = new FormData();
  form.append('arquivo', arquivo);
  form.append('senha', senha);
  return chamar<CertificadoEsocial>('PUT', '/esocial/certificado', form);
}
export const removerCertificado = () => chamar<{ ok: boolean }>('DELETE', '/esocial/certificado');
export const listarEventosEsocial = (empresaId: string) => chamar<EventoEsocial[]>('GET', `/empresas/${empresaId}/esocial/eventos`);
export const transmitirEsocial = (empresaId: string) =>
  chamar<{ eventos: number; cdResposta: string; descResposta: string; protocolo: string | null }[]>('POST', `/empresas/${empresaId}/esocial/enviar`);
export const consultarEsocial = (empresaId: string) => chamar<{ atualizados: number }>('POST', `/empresas/${empresaId}/esocial/consultar`);
export async function baixarXmlEsocial(empresaId: string, ev: EventoEsocial) {
  const res = await fetch(`${API_URL}/empresas/${empresaId}/esocial/eventos/${ev.id}/xml`, { headers: cabecalhos() });
  verificarSessao(res);
  if (!res.ok) throw new Error(`Não foi possível baixar o XML (${res.status}).`);
  salvarArquivo(await res.blob(), `${ev.tipo}-${ev.idEvento}.xml`);
}
