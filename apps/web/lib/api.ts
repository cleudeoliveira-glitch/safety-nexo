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
  emailCobranca?: string | null;
  medicoPcmsoNome: string | null;
  medicoPcmsoCrm: string | null;
  responsavelTecnicoNome?: string | null;
  responsavelTecnicoRegistro?: string | null;
  representanteLegalNome?: string | null;
  medicoPcmsoCpf?: string | null;
  medicoPcmsoUf?: string | null;
  responsavelTecnicoCpf?: string | null;
  responsavelTecnicoConselho?: string | null;
  responsavelTecnicoUf?: string | null;
  esocialAmbiente?: string;
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
  esocial?: RiscoEsocial | null;
};
export type RiscoEsocial = {
  codAgNoc?: string; unMed?: number; utilizEPC?: number; utilizEPI?: number;
  epiCompl?: { medProtecao: boolean; condFuncto: boolean; usoInint: boolean; przValid: boolean; periodicTroca: boolean; higienizacao: boolean };
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
  codigoEsocial?: string | null;
};
export type Ghe = { id: string; nome: string; descricao: string | null; periculosidadeAnexo?: string | null; periculosidadeJustificativa?: string | null; riscos: Risco[]; exames: Exame[]; _count: { colaboradores: number } };
export type Colaborador = { id: string; nome: string; cpf?: string | null; matricula?: string | null; codCateg?: string | null; dataAdmissao?: string | null; cargo: string; cbo: string | null; gheId: string | null };
export type Aso = {
  id: string; tipo: string; dataExame: string; resultado: 'APTO' | 'INAPTO';
  medicoExaminadorNome: string; medicoExaminadorCrm: string; exames: string[]; riscos: string[]; proximoExame: string | null;
};
export type EntregaEpi = { id: string; epi: string; ca: string; validadeCa: string | null; quantidade: number; motivo: string; dataEntrega: string };
export type ColaboradorDetalhe = Colaborador & { ghe: Ghe | null; asos: Aso[]; entregasEpi: EntregaEpi[]; presencasFaciais?: { refId: string; codigo: string }[] };
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
  // Resposta vazia (ex.: "ainda não há certificado") vira null em vez de erro.
  const corpoTexto = await res.text();
  return (corpoTexto ? JSON.parse(corpoTexto) : null) as T;
}

export const listarEmpresas = () => chamar<Empresa[]>('GET', '/empresas');
export const buscarEmpresa = (id: string) => chamar<Empresa>('GET', `/empresas/${id}`);
export const criarEmpresa = (dados: Partial<Empresa>) => chamar<Empresa>('POST', '/empresas', dados);
export const atualizarEmpresa = (id: string, dados: Partial<Empresa>) => chamar<Empresa>('PATCH', `/empresas/${id}`, dados);
export const carregarPainel = (empresaId: string) => chamar<Painel>('GET', `/empresas/${empresaId}/painel`);
export const buscarCnae = (codigo: string) => chamar<CnaeInfo>('GET', `/cnae/${encodeURIComponent(codigo)}`);

export const listarGhes = (empresaId: string) => chamar<Ghe[]>('GET', `/empresas/${empresaId}/ghes`);
export const copiarDadosDe = (empresaId: string, d: { origemId: string; gheIds?: string[]; responsaveis?: boolean }) =>
  chamar<{ copiados: string[]; pulados: string[]; responsaveis: boolean }>('POST', `/empresas/${empresaId}/copiar-de`, d);
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
  if (!res.ok) { const erro = await res.json().catch(() => null); throw new Error(erro?.message ?? `Não foi possível gerar o ${nome} (${res.status}).`); }
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

export type Acesso = { token: string; usuario: { nome: string; papel: 'CONSULTORIA' | 'EMPRESA'; empresaId: string | null; adminPlataforma?: boolean } };
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

export type ModeloChecklist = { modelo: string; titulo: string; grupo?: string; tipo?: 'S' | 'M'; itens: string[]; graus?: number[] };
export type ItemInspecao = { texto: string; resposta: 'C' | 'NC' | 'NA'; observacao?: string; grau?: number };
export type Inspecao = {
  id: string; modelo: string; titulo: string; local: string; data: string; inspetor: string; itens: ItemInspecao[];
  resumo: { aplicaveis: number; conformes: number; naoConformes: number; percentual: number; multa?: { minimo: number; maximo: number } };
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
  status: 'PENDENTE' | 'ENVIADO' | 'PROCESSADO' | 'ERRO' | 'EXCLUIDO'; protocolo: string | null; recibo: string | null;
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

export type SituacaoEvento = { tipo: string; referenciaId: string; status: EventoEsocial['status']; recibo: string | null } | null;
export type CatEsocial = {
  codSitGeradora?: string; codParteAting?: string; lateralidade?: number; codAgntCausador?: string; codLesao?: string;
  iniciatCAT?: number; tpLocal?: number; logradouro?: string; numero?: string; bairro?: string; cep?: string; codMunic?: string; uf?: string;
  cnpjLocal?: string; ultDiaTrab?: string; dtObito?: string; internacao?: boolean; medicoConselho?: number; medicoUf?: string; reciboCatOrigem?: string;
};
export type OrigensEsocial = {
  empresa: {
    esocialAmbiente: 'PRODUCAO_RESTRITA' | 'PRODUCAO'; medicoPcmsoNome: string | null; medicoPcmsoCrm: string | null; medicoPcmsoCpf: string | null; medicoPcmsoUf: string | null;
    responsavelTecnicoNome: string | null; responsavelTecnicoRegistro: string | null; responsavelTecnicoCpf: string | null;
    responsavelTecnicoConselho: string | null; responsavelTecnicoUf: string | null;
  };
  colaboradores: {
    id: string; nome: string; cpf: string | null; matricula: string | null; codCateg: string | null; cargo: string; dataAdmissao: string | null; ghe: string | null;
    s2240: SituacaoEvento; asos: { id: string; tipo: string; dataExame: string; resultado: string; s2220: SituacaoEvento }[];
  }[];
  cats: {
    id: string; colaborador: string; tipoCat: string; tipoAcidente: string; dataHora: string; local: string; horasTrabalhadas: string | null;
    atendimentoData: string | null; medicoNome: string | null; medicoCrm: string | null; cid: string | null; diasTratamento: number | null;
    esocial: CatEsocial | null; s2210: SituacaoEvento;
  }[];
  afastamentos: { id: string; colaborador: string; motivo: string; inicio: string; fim: string | null; inicioEvento: SituacaoEvento; fimEvento: SituacaoEvento }[];
  toxicologicos: { id: string; colaboradorId: string; colaborador: string; dataExame: string; cnpjLaboratorio: string; codigoExame: string; medicoNome: string; medicoCrm: string | null; medicoUf: string | null; s2221: SituacaoEvento }[];
};
export const buscarOrigensEsocial = (empresaId: string) => chamar<OrigensEsocial>('GET', `/empresas/${empresaId}/esocial/origens`);
export const salvarEsocialColaborador = (empresaId: string, colaboradorId: string, dados: { cpf?: string; matricula?: string; codCateg?: string }) =>
  chamar<Colaborador>('PUT', `/empresas/${empresaId}/colaboradores/${colaboradorId}/esocial`, dados);
export const salvarCodigoExame = (empresaId: string, gheId: string, exameId: string, codigoEsocial: string) =>
  chamar<Exame>('PUT', `/empresas/${empresaId}/ghes/${gheId}/exames/${exameId}/codigo`, { codigoEsocial });
export const salvarEsocialCat = (empresaId: string, catId: string, dados: CatEsocial & { horasTrabalhadas?: string; atendimentoData?: string; medicoNome?: string; medicoCrm?: string; cid?: string; diasTratamento?: number }) =>
  chamar<unknown>('PUT', `/empresas/${empresaId}/cats/${catId}/esocial`, dados);
export const registrarToxicologico = (empresaId: string, d: { colaboradorId: string; dataExame: string; cnpjLaboratorio: string; codigoExame: string; medicoNome: string; medicoCrm?: string; medicoUf?: string }) =>
  chamar<{ id: string }>('POST', `/empresas/${empresaId}/esocial/toxicologicos`, d);
export const removerToxicologico = (empresaId: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${empresaId}/esocial/toxicologicos/${id}`);
export const excluirEventoEsocial = (empresaId: string, eventoId: string) => chamar<EventoEsocial>('POST', `/empresas/${empresaId}/esocial/eventos/${eventoId}/excluir`);
export type Faixa = { minimo: number; maximo: number };
export type DiagnosticoEsocial = {
  empresas: { empresaId: string; razaoSocial: string; cnpj: string; trabalhadores: number; faltas: { s2220: number; s2240: number; s2210: number; s2230: number; cadastros: number; erros: number }; multa: Faixa }[];
  total: Faixa; valores: { s2220: Faixa; s2240: Faixa; s2210: Faixa }; nota: string;
};
export type ResumoEsocialEmpresa = { id: string; razaoSocial: string; cnpj: string; esocialAmbiente: string; pendentes: number; enviados: number; aceitos: number; erros: number; excluidos: number };
export type ResultadoEmpresas = { empresa: string; ok: boolean; eventos?: number; atualizados?: number; mensagem: string }[];
export const esocialGeral = {
  resumo: () => chamar<ResumoEsocialEmpresa[]>('GET', '/esocial/geral'),
  diagnostico: () => chamar<DiagnosticoEsocial>('GET', '/esocial/diagnostico'),
  enviarTodas: () => chamar<ResultadoEmpresas>('POST', '/esocial/enviar-todas'),
  consultarTodas: () => chamar<ResultadoEmpresas>('POST', '/esocial/consultar-todas'),
};
export const gerarEventoEsocial = (empresaId: string, tipo: 's2210' | 's2220' | 's2221' | 's2230' | 's2240', referenciaId: string, corpo: { inicio?: string; retificar?: boolean } = {}) =>
  chamar<EventoEsocial>('POST', `/empresas/${empresaId}/esocial/${tipo}/${referenciaId}`, corpo);

// Unidades de medida do S-2240 (campo unMed do XSD S-1.3).
export const UNIDADES_ESOCIAL: [number, string][] = [
  [1, 'dose diária de ruído'], [2, 'dB (linear)'], [3, 'dB(C)'], [4, 'dB(A)'], [5, 'm/s²'], [6, 'm/s¹·⁷⁵'], [7, 'ppm'], [8, 'mg/m³'], [9, 'f/cm³'],
  [10, '°C'], [11, 'm/s'], [12, '%'], [13, 'lux'], [14, 'ufc/m³'], [15, 'dose diária'], [16, 'dose mensal'], [17, 'dose trimestral'], [18, 'dose anual'],
  [19, 'W/m²'], [20, 'A/m'], [21, 'mT'], [22, 'μT'], [23, 'mA'], [24, 'kV/m'], [25, 'V/m'], [26, 'J/m²'], [27, 'mJ/cm²'], [28, 'mSv'], [29, 'mppdc'], [30, 'UR (%)'],
];
export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// Tabelas oficiais do eSocial: [código, descrição] (a 24 traz também o grupo).
export type TabelasEsocial = { t13: [string, string][]; t14: [string, string][]; t15: [string, string][]; t17: [string, string][]; t24: [string, string, string][]; t27: [string, string][] };
let cacheTabelas: Promise<TabelasEsocial> | null = null;
export const buscarTabelasEsocial = () => (cacheTabelas ??= chamar<TabelasEsocial>('GET', '/esocial/tabelas').catch((e) => { cacheTabelas = null; throw e; }));

// Afastamentos (S-2230).
export type Afastamento = {
  id: string; colaboradorId: string; colaborador: string; motivo: string; inicio: string; fim: string | null; mesmoMotivo: boolean | null;
  acidenteTransito: number | null; observacao: string | null; catId: string | null; dias: number; emAberto: boolean; pedeRetorno: boolean; asoRetorno: boolean;
};
export const buscarMotivosAfastamento = (empresaId: string) => chamar<[string, string][]>('GET', `/empresas/${empresaId}/afastamentos/motivos`);
export const listarAfastamentos = (empresaId: string) => chamar<Afastamento[]>('GET', `/empresas/${empresaId}/afastamentos`);
export const criarAfastamento = (empresaId: string, dados: { colaboradorId: string; motivo: string; inicio: string; fim?: string; mesmoMotivo?: boolean; acidenteTransito?: number; observacao?: string; catId?: string }) =>
  chamar<Afastamento>('POST', `/empresas/${empresaId}/afastamentos`, dados);
export const encerrarAfastamento = (empresaId: string, id: string, fim: string) => chamar<Afastamento>('PUT', `/empresas/${empresaId}/afastamentos/${id}/fim`, { fim });
export const removerAfastamento = (empresaId: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${empresaId}/afastamentos/${id}`);

export type ItemHistorico = { id: string; usuarioNome: string; papel: 'CONSULTORIA' | 'EMPRESA'; acao: string; createdAt: string };
export const buscarHistorico = (empresaId: string, antes?: string) =>
  chamar<ItemHistorico[]>('GET', `/empresas/${empresaId}/historico${antes ? `?antes=${encodeURIComponent(antes)}` : ''}`);

// ---------- Comercial (valores em centavos) ----------
export type ConfigComercial = { nome: string; cnpj: string | null; cidade: string | null; pixChave: string | null; pixNome: string | null };
export type ItemProposta = { descricao: string; quantidade: number; valorCentavos: number };
export type Proposta = { id: string; numero: number; empresaId: string | null; clienteNome: string; clienteCnpj: string | null; clienteContato: string | null; data: string; validadeDias: number; itens: ItemProposta[]; observacoes: string | null; status: 'ABERTA' | 'ACEITA' | 'RECUSADA'; total: number; contratos: { id: string; numero: number }[];
  token: string | null; respostaNome: string | null; respostaCargo: string | null; respostaEm: string | null; motivoRecusa: string | null };
export type Contrato = { id: string; numero: number; empresaId: string; empresa: { razaoSocial: string }; propostaId: string | null; objeto: string; valorMensalCentavos: number | null; diaVencimento: number | null; inicio: string; fim: string | null; status: 'ATIVO' | 'ENCERRADO' };
export type Servico = { id: string; numero: number; empresaId: string; empresa: { razaoSocial: string }; contratoId: string | null; descricao: string; previsto: string | null; responsavel: string | null; valorCentavos: number | null; concluidoEm: string | null; status: 'ABERTA' | 'CONCLUIDA' | 'CANCELADA'; cobrancas: { id: string; status: string }[] };
export type Cobranca = { id: string; empresaId: string; empresa: { razaoSocial: string }; descricao: string; valorCentavos: number; vencimento: string; status: 'ABERTA' | 'PAGA' | 'CANCELADA'; pagoEm: string | null; vencida: boolean };
export type ReguaCobranca = { ligada: boolean; emailLigado: boolean; semEmail: string[] };
export type PropostaPublica = {
  numero: number; data: string; validadeAte: string; vencida: boolean;
  consultoria: { nome: string; cnpj: string | null; cidade: string | null };
  cliente: { nome: string; cnpj: string | null; contato: string | null };
  itens: ItemProposta[]; total: number; observacoes: string | null;
  status: 'ABERTA' | 'ACEITA' | 'RECUSADA'; respostaNome: string | null; respostaEm: string | null;
};
export const propostaOnline = {
  ver: (token: string) => chamar<PropostaPublica>('GET', `/proposta-online/${token}`),
  aceitar: (token: string, d: { nome: string; cargo?: string }) => chamar<{ ok: boolean }>('POST', `/proposta-online/${token}/aceitar`, d),
  recusar: (token: string, d: { nome: string; motivo?: string }) => chamar<{ ok: boolean }>('POST', `/proposta-online/${token}/recusar`, d),
};
export type ResumoComercial = { emAberto: number; vencido: number; recebidoNoMes: number; contratosAtivos: number };
const C = '/comercial';
export const comercial = {
  configuracao: () => chamar<ConfigComercial>('GET', `${C}/configuracao`),
  salvarConfiguracao: (d: Partial<ConfigComercial>) => chamar<ConfigComercial>('PUT', `${C}/configuracao`, d),
  resumo: () => chamar<ResumoComercial>('GET', `${C}/resumo`),
  propostas: () => chamar<Proposta[]>('GET', `${C}/propostas`),
  criarProposta: (d: { empresaId?: string; clienteNome?: string; clienteCnpj?: string; clienteContato?: string; data: string; validadeDias?: number; itens: ItemProposta[]; observacoes?: string }) => chamar<Proposta>('POST', `${C}/propostas`, d),
  statusProposta: (id: string, status: Proposta['status']) => chamar<{ ok: boolean }>('PUT', `${C}/propostas/${id}/status`, { status }),
  pdfProposta: (id: string) => baixarPdf(`${C}/propostas/${id}/pdf`, 'proposta'),
  linkProposta: (id: string) => chamar<{ token: string; url: string }>('POST', `${C}/propostas/${id}/link`),
  regua: () => chamar<ReguaCobranca>('GET', `${C}/regua`),
  ligarRegua: (ligada: boolean) => chamar<ReguaCobranca>('PUT', `${C}/regua`, { ligada }),
  emailCobranca: (empresaId: string, email: string) => chamar<{ emailCobranca: string | null }>('PUT', `${C}/empresas/${empresaId}/email-cobranca`, { email: email || undefined }),
  contratos: () => chamar<Contrato[]>('GET', `${C}/contratos`),
  criarContrato: (d: { empresaId: string; propostaId?: string; objeto: string; valorMensalCentavos?: number; diaVencimento?: number; inicio: string; fim?: string; observacoes?: string }) => chamar<Contrato>('POST', `${C}/contratos`, d),
  encerrarContrato: (id: string) => chamar<{ ok: boolean }>('PUT', `${C}/contratos/${id}/encerrar`, {}),
  pdfContrato: (id: string) => baixarPdf(`${C}/contratos/${id}/pdf`, 'contrato'),
  mensalidades: (mes: string) => chamar<{ criadas: number; contratos: number }>('POST', `${C}/mensalidades`, { mes }),
  servicos: () => chamar<Servico[]>('GET', `${C}/servicos`),
  criarServico: (d: { empresaId: string; contratoId?: string; descricao: string; previsto?: string; responsavel?: string; valorCentavos?: number }) => chamar<Servico>('POST', `${C}/servicos`, d),
  concluirServico: (id: string) => chamar<{ ok: boolean; cobranca: boolean }>('PUT', `${C}/servicos/${id}/concluir`, {}),
  cobrancas: () => chamar<Cobranca[]>('GET', `${C}/cobrancas`),
  criarCobranca: (d: { empresaId: string; descricao: string; valorCentavos: number; vencimento: string }) => chamar<Cobranca>('POST', `${C}/cobrancas`, d),
  pagar: (id: string, data?: string) => chamar<{ ok: boolean }>('PUT', `${C}/cobrancas/${id}/paga`, data ? { data } : {}),
  cancelar: (id: string) => chamar<{ ok: boolean }>('PUT', `${C}/cobrancas/${id}/cancelar`, {}),
  pix: (id: string) => chamar<{ copiaECola: string; qr: string; recebedor: string } | null>('GET', `${C}/cobrancas/${id}/pix`),
  pdfCobranca: (id: string) => baixarPdf(`${C}/cobrancas/${id}/pdf`, 'cobrança'),
};
export const reais = (centavos: number | null | undefined) => (centavos === null || centavos === undefined ? '—' : (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
// "1.234,56" ou "1234.56" para centavos.
export function centavos(texto: string): number | undefined {
  const t = texto.trim().replace(/[R$\s]/g, '');
  if (!t) return undefined;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
}

// ---------- Conectores: planilha do RH, terceiros e absenteísmo ----------
export type LinhaImportacao = { linha: number; nome: string; cpf: string | null; cargo: string | null; ghe: string | null; acao: 'novo' | 'atualizar' | 'erro'; erros: string[]; avisos: string[] };
export type PreviaImportacao = { colunas: string[]; ignoradas: string[]; resumo: { novos: number; atualizar: number; erros: number }; linhas: LinhaImportacao[] };
const comArquivo = (arquivo: File) => { const f = new FormData(); f.append('arquivo', arquivo); return f; };
export const previaImportacao = (empresaId: string, arquivo: File) => chamar<PreviaImportacao>('POST', `/empresas/${empresaId}/colaboradores/importar/previa`, comArquivo(arquivo));
export const importarColaboradores = (empresaId: string, arquivo: File) =>
  chamar<{ criados: number; atualizados: number; ignorados: number }>('POST', `/empresas/${empresaId}/colaboradores/importar`, comArquivo(arquivo));

export type Situacao = 'ok' | 'vencendo' | 'vencido' | 'sem-validade';
export type TerceiroDocumento = { id: string; tipo: string; validade: string | null; observacao: string | null; situacao: Situacao };
export type TreinamentoTerceiro = { nome: string; validade?: string; situacao?: Situacao };
export type TerceiroTrabalhador = { id: string; nome: string; cpf: string | null; funcao: string | null; asoValidade: string | null; integracao: string | null; treinamentos: TreinamentoTerceiro[]; pendencias: string[]; liberado: boolean };
export type Terceiro = {
  id: string; razaoSocial: string; cnpj: string | null; servico: string; contato: string | null; telefone: string | null; inicio: string | null; fim: string | null;
  documentos: TerceiroDocumento[]; trabalhadores: TerceiroTrabalhador[]; faltando: string[]; vencidos: string[]; contratoVencido: boolean; liberada: boolean;
};
export type TerceiroDados = { razaoSocial: string; cnpj?: string; servico: string; contato?: string; telefone?: string; inicio?: string; fim?: string };
export type TrabalhadorDados = { nome: string; cpf?: string; funcao?: string; asoValidade?: string; integracao?: string; treinamentos?: { nome: string; validade?: string }[] };
export const terceiros = {
  sugeridos: (e: string) => chamar<string[]>('GET', `/empresas/${e}/terceiros/documentos-sugeridos`),
  listar: (e: string) => chamar<Terceiro[]>('GET', `/empresas/${e}/terceiros`),
  criar: (e: string, d: TerceiroDados) => chamar<Terceiro>('POST', `/empresas/${e}/terceiros`, d),
  alterar: (e: string, id: string, d: TerceiroDados) => chamar<Terceiro>('PUT', `/empresas/${e}/terceiros/${id}`, d),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/terceiros/${id}`),
  documento: (e: string, id: string, d: { tipo: string; validade?: string; observacao?: string }) => chamar<TerceiroDocumento>('POST', `/empresas/${e}/terceiros/${id}/documentos`, d),
  removerDocumento: (e: string, id: string, doc: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/terceiros/${id}/documentos/${doc}`),
  trabalhador: (e: string, id: string, d: TrabalhadorDados) => chamar<TerceiroTrabalhador>('POST', `/empresas/${e}/terceiros/${id}/trabalhadores`, d),
  removerTrabalhador: (e: string, id: string, t: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/terceiros/${id}/trabalhadores/${t}`),
};

export type Atestado = { id: string; colaboradorId: string; colaborador: { nome: string }; inicio: string; dias: number; horas: number | null; tipo: string; cid: string | null; medico: string | null; observacao: string | null };
export type AtestadoDados = { colaboradorId: string; inicio: string; dias: number; horas?: number; tipo: string; cid?: string; medico?: string; observacao?: string };
export type MesAbsenteismo = { mes: number; colaboradores: number; diasUteis: number; horasPrevistas: number; horasPerdidas: number; atestados: number; taxa: number };
export type Absenteismo = {
  ano: number; jornada: number; meses: MesAbsenteismo[];
  total: { horasPrevistas: number; horasPerdidas: number; atestados: number; taxa: number };
  porGhe: { nome: string; horas: number }[]; porTipo: { nome: string; horas: number }[]; porCid: { nome: string; horas: number }[]; quemMaisFaltou: { nome: string; horas: number }[];
  alertasInss: { colaboradorId: string; nome: string; cid: string | null; dias: number; desde: string; jaAfastado: boolean }[];
};
export const atestados = {
  tipos: (e: string) => chamar<Record<string, string>>('GET', `/empresas/${e}/atestados/tipos`),
  listar: (e: string, ano: number) => chamar<Atestado[]>('GET', `/empresas/${e}/atestados?ano=${ano}`),
  criar: (e: string, d: AtestadoDados) => chamar<Atestado>('POST', `/empresas/${e}/atestados`, d),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/atestados/${id}`),
  indicadores: (e: string, ano: number) => chamar<Absenteismo>('GET', `/empresas/${e}/absenteismo?ano=${ano}`),
  jornada: (e: string, horas: number) => chamar<{ jornadaDiariaHoras: number }>('PUT', `/empresas/${e}/absenteismo/jornada`, { jornadaDiariaHoras: horas }),
};

// ---------- Arquivo de documentos (GED) ----------
export type VersaoArquivo = { id: string; versao: number; criadoEm: string; criadoPorNome: string; nomeArquivo: string };
export type ItemArquivo = {
  id: string; titulo: string; categoria: string; origem: 'GERADO' | 'ENVIADO'; versao: number; nomeArquivo: string; mime: string; tamanho: number;
  descricao: string | null; criadoPorNome: string; criadoEm: string; visualizacoes: number; trecho: string | null; achadoNaVersao: number | null; anteriores: VersaoArquivo[];
};
export type AcessoArquivo = { id: string; usuarioNome: string; papel: 'CONSULTORIA' | 'EMPRESA'; em: string; arquivo: { versao: number } };
export const arquivo = {
  listar: (e: string, busca?: string) => chamar<ItemArquivo[]>('GET', `/empresas/${e}/arquivo${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`),
  enviar: (e: string, arq: File, dados: { titulo?: string; categoria?: string; descricao?: string; versaoDe?: string }) => {
    const f = new FormData(); f.append('arquivo', arq);
    for (const [k, v] of Object.entries(dados)) if (v) f.append(k, v);
    return chamar<ItemArquivo>('POST', `/empresas/${e}/arquivo`, f);
  },
  acessos: (e: string, id: string) => chamar<AcessoArquivo[]>('GET', `/empresas/${e}/arquivo/${id}/acessos`),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/arquivo/${id}`),
  baixar: async (e: string, id: string): Promise<Blob> => {
    const res = await fetch(`${API_URL}/empresas/${e}/arquivo/${id}/baixar`, { headers: cabecalhos() });
    verificarSessao(res);
    if (!res.ok) { const erro = await res.json().catch(() => null); throw new Error(erro?.message ?? `Não foi possível abrir o documento (${res.status}).`); }
    return res.blob();
  },
};

// ---------- Assinaturas ----------
export type SignatarioPedido = { id: string; ordem: number; nome: string; cpf: string | null; papel: string; assinadoEm: string | null; presencial: boolean; latitude: number | null; link: string | null };
export type PedidoAssinatura = {
  id: string; titulo: string; status: 'ABERTO' | 'GERANDO' | 'CONCLUIDO' | 'CANCELADO'; codigo: string; icp: boolean; icpTitular: string | null;
  arquivoId: string; arquivoFinalId: string | null; criadoPorNome: string; criadoEm: string; concluidoEm: string | null; signatarios: SignatarioPedido[];
};
export type DadosAssinatura = { imagem: string; latitude?: number; longitude?: number; precisao?: number; cpf?: string };
export const assinaturas = {
  listar: (e: string) => chamar<PedidoAssinatura[]>('GET', `/empresas/${e}/assinaturas`),
  criar: (e: string, d: { arquivoId: string; icp: boolean; signatarios: { nome: string; cpf?: string; papel: string }[] }) => chamar<PedidoAssinatura>('POST', `/empresas/${e}/assinaturas`, d),
  assinarAqui: (e: string, id: string, sid: string, d: DadosAssinatura) => chamar<{ ok: boolean; faltam: number }>('POST', `/empresas/${e}/assinaturas/${id}/signatarios/${sid}/assinar`, d),
  cancelar: (e: string, id: string) => chamar<{ ok: boolean }>('POST', `/empresas/${e}/assinaturas/${id}/cancelar`),
  concluir: (e: string, id: string) => chamar<{ ok: boolean }>('POST', `/empresas/${e}/assinaturas/${id}/concluir`),
};
export type LinkAssinatura = { titulo: string; empresa: string; consultoria: string; status: string; nome: string; papel: string; pedeCpf: boolean; assinadoEm: string | null; codigo: string };
export const linkAssinatura = {
  dados: (token: string) => chamar<LinkAssinatura>('GET', `/assinar/${token}`),
  urlDocumento: (token: string) => `${API_URL}/assinar/${token}/documento`,
  assinar: (token: string, d: DadosAssinatura) => chamar<{ ok: boolean; faltam: number }>('POST', `/assinar/${token}`, d),
};
export type ConferenciaAssinatura = {
  titulo: string; empresa: string; consultoria: string; status: string; criadoEm: string; concluidoEm: string | null; hashOriginal: string; hashFinal: string | null; icpTitular: string | null;
  signatarios: { nome: string; cpf: string | null; papel: string; assinadoEm: string | null; presencial: boolean; comLocalizacao: boolean }[];
};
export const conferirAssinatura = (codigo: string) => chamar<ConferenciaAssinatura>('GET', `/assinatura/${encodeURIComponent(codigo)}`);

// ---------- Avaliação psicossocial ----------
export type DimensaoPs = { id: string; nome: string; tipo: 'casos' | 'media'; corte?: number; rotuloResultado: string; maiorEPior: boolean };
export type QuestionarioPs = { id: string; sigla: string; nome: string; descricao: string; fonte: string; totalItens: number };
export type AvaliacaoPs = { id: string; titulo: string; questionario: string; sigla: string; status: 'ABERTA' | 'ENCERRADA'; minimoGrupo: number; link: string; criadoEm: string; criadoPorNome: string; _count: { respostas: number; acoes: number } };
export type LinhaPs = { setor: string; respostas: number; oculto: boolean; valores: Record<string, number | null> | null };
export type AcaoPs = { id: string; setor: string | null; dimensao: string; acao: string; responsavel: string | null; prazo: string | null; feita: boolean };
export type ResultadoPs = { avaliacao: AvaliacaoPs; questionario: { id: string; sigla: string; nome: string; fonte: string; dimensoes: DimensaoPs[] }; total: LinhaPs; setores: LinhaPs[]; acoes: AcaoPs[] };
export const psicossocial = {
  questionarios: (e: string) => chamar<QuestionarioPs[]>('GET', `/empresas/${e}/psicossocial/questionarios`),
  listar: (e: string) => chamar<AvaliacaoPs[]>('GET', `/empresas/${e}/psicossocial`),
  criar: (e: string, d: { questionario: string; titulo: string; minimoGrupo?: number }) => chamar<AvaliacaoPs>('POST', `/empresas/${e}/psicossocial`, d),
  encerrar: (e: string, id: string) => chamar<AvaliacaoPs>('PUT', `/empresas/${e}/psicossocial/${id}/encerrar`),
  reabrir: (e: string, id: string) => chamar<AvaliacaoPs>('PUT', `/empresas/${e}/psicossocial/${id}/reabrir`),
  resultado: (e: string, id: string) => chamar<ResultadoPs>('GET', `/empresas/${e}/psicossocial/${id}/resultado`),
  acao: (e: string, id: string, d: { setor?: string; dimensao: string; acao: string; responsavel?: string; prazo?: string }) => chamar<AcaoPs>('POST', `/empresas/${e}/psicossocial/${id}/acoes`, d),
  marcar: (e: string, id: string, acaoId: string, feita: boolean) => chamar<{ ok: boolean }>('PUT', `/empresas/${e}/psicossocial/${id}/acoes/${acaoId}`, { feita }),
  removerAcao: (e: string, id: string, acaoId: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/psicossocial/${id}/acoes/${acaoId}`),
  levarAoPgr: (e: string, id: string, d: { setor: string; dimensao: string; severidade: string }) => chamar<unknown>('POST', `/empresas/${e}/psicossocial/${id}/pgr`, d),
};
export type FormularioPs = {
  titulo: string; empresa: string; consultoria: string; aberta: boolean; setores: string[];
  questionario: { sigla: string; nome: string; descricao: string; escala: { valor: number; rotulo: string }[]; itens: { n: number; texto: string }[]; aviso: string | null };
};
export const formularioPs = {
  dados: (token: string) => chamar<FormularioPs>('GET', `/psicossocial/${token}`),
  responder: (token: string, d: { setor: string; valores: Record<string, number> }) => chamar<{ ok: boolean; aviso: string | null }>('POST', `/psicossocial/${token}`, d),
};

// ---------- SIPAT e 5S ----------
export type AtividadeSipat = { id: string; data: string; horario: string; titulo: string; responsavel: string; local: string; duracaoMin: number; presentes: string[] };
export type Sipat = { id: string; ano: number; tema: string; inicio: string; fim: string; atividades: AtividadeSipat[] };
export type Senso = { id: string; nome: string; itens: string[] };
export type Auditoria5s = { id: string; setor: string; data: string; auditor: string; notas: Record<string, number>; observacoes: string | null; resultado: { porSenso: { id: string; nome: string; percentual: number }[]; total: number } };
export const sipat = {
  listar: (e: string) => chamar<Sipat[]>('GET', `/empresas/${e}/sipat`),
  criar: (e: string, d: { ano: number; tema: string; inicio: string; fim: string }) => chamar<Sipat>('POST', `/empresas/${e}/sipat`, d),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/sipat/${id}`),
  atividade: (e: string, id: string, d: Omit<AtividadeSipat, 'id' | 'presentes'>) => chamar<AtividadeSipat>('POST', `/empresas/${e}/sipat/${id}/atividades`, d),
  removerAtividade: (e: string, id: string, a: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/sipat/${id}/atividades/${a}`),
  presenca: (e: string, id: string, a: string, presentes: string[]) => chamar<{ presentes: number }>('PUT', `/empresas/${e}/sipat/${id}/atividades/${a}/presenca`, { presentes }),
  programacao: (e: string, id: string) => baixarPdf(`/empresas/${e}/sipat/${id}/programacao`, 'PDF da programação'),
  lista: (e: string, id: string, a: string) => baixarPdf(`/empresas/${e}/sipat/${id}/atividades/${a}/lista`, 'PDF da lista de presença'),
  relatorio: (e: string, id: string) => baixarPdf(`/empresas/${e}/sipat/${id}/relatorio`, 'PDF do relatório'),
};
export const cincoS = {
  checklist: (e: string) => chamar<{ escala: { valor: number; rotulo: string }[]; sensos: Senso[] }>('GET', `/empresas/${e}/5s/checklist`),
  listar: (e: string) => chamar<Auditoria5s[]>('GET', `/empresas/${e}/5s`),
  criar: (e: string, d: { setor: string; data: string; auditor: string; notas: Record<string, number>; observacoes?: string }) => chamar<Auditoria5s>('POST', `/empresas/${e}/5s`, d),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/5s/${id}`),
  pdf: (e: string, id: string) => baixarPdf(`/empresas/${e}/5s/${id}/pdf`, 'PDF da auditoria'),
};

// ---------- FAP e RAT ----------
export type AnoFap = { id: string; ano: number; rat: number; fap: number; ratAjustado: number; efeito: 'reduz' | 'aumenta' | 'neutro'; percentual: number; folhaMensal: number | null; custoMensal: number | null; semFap: number | null; diferencaMensal: number | null; observacao: string | null };
export type DadosFap = { cnae: string | null; anos: AnoFap[]; ocorrencias: { desde: string; cats: number; comAfastamento: number; obitos: number; afastamentosInss: number } };
export const fapRat = {
  listar: (e: string) => chamar<DadosFap>('GET', `/empresas/${e}/fap`),
  salvar: (e: string, d: { ano: number; rat: number; fap: number; folhaMensal?: number; observacao?: string }) => chamar<{ id: string; ano: number }>('PUT', `/empresas/${e}/fap`, d),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/fap/${id}`),
  relatorio: (e: string) => baixarPdf(`/empresas/${e}/fap/relatorio`, 'relatório de FAP e RAT'),
};

// ---------- Documentos antigos lidos com IA ----------
export type TipoRisco = 'FISICO' | 'QUIMICO' | 'BIOLOGICO' | 'ERGONOMICO' | 'ACIDENTE';
export type RiscoLido = { tipo: TipoRisco; agente: string; fonteGeradora: string | null; medidasControle: string | null; severidade: 'BAIXA' | 'MEDIA' | 'ALTA' | null; intensidade: string | null; limiteTolerancia: string | null; pagina: number | null };
export type GheLido = { nome: string; descricao: string | null; cargos: string[]; trabalhadores: number | null; riscos: RiscoLido[] };
export type DocumentoLido = { tipoDocumento: string | null; empresa: string | null; cnpj: string | null; dataElaboracao: string | null; responsavelTecnico: string | null; ghes: GheLido[]; avisos: string[] };
export type Leitura = { id: string; nomeArquivo: string; status: 'LENDO' | 'PRONTO' | 'ERRO' | 'IMPORTADO'; resultado: DocumentoLido | null; erro: string | null; criadoPorNome: string; createdAt: string; importadoEm: string | null; arquivoId: string | null };
export type RiscoImportar = { tipo: TipoRisco; agente: string; fonteGeradora: string; medidasControle?: string; severidade: 'BAIXA' | 'MEDIA' | 'ALTA'; intensidade?: string; limiteTolerancia?: string };
export const importarPdf = {
  situacao: (e: string) => chamar<{ iaLigada: boolean }>('GET', `/empresas/${e}/importar-pdf/situacao`),
  listar: (e: string) => chamar<Leitura[]>('GET', `/empresas/${e}/importar-pdf`),
  obter: (e: string, id: string) => chamar<Leitura & { ghesExistentes: string[] }>('GET', `/empresas/${e}/importar-pdf/${id}`),
  enviar: (e: string, arq: File) => { const f = new FormData(); f.append('arquivo', arq); return chamar<Leitura>('POST', `/empresas/${e}/importar-pdf`, f); },
  importar: (e: string, id: string, ghes: { nome: string; descricao?: string; riscos: RiscoImportar[] }[]) => chamar<{ novosGhes: number; novosRiscos: number; repetidos: number }>('POST', `/empresas/${e}/importar-pdf/${id}/importar`, { ghes }),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/importar-pdf/${id}`),
};

// ---------- Prontuário de saúde ----------
export type TipoRegistro = 'VACINA' | 'AUDIOMETRIA' | 'ESPIROMETRIA' | 'OUTRO';
export type RegistroSaude = { id: string; colaboradorId: string; colaborador: { nome: string }; tipo: TipoRegistro; data: string; titulo: string; resultado: string | null; dados: Record<string, unknown> | null; profissional: string | null; lote: string | null; proximaData: string | null; observacao: string | null };
export const prontuario = {
  listar: (e: string, colaboradorId?: string) => chamar<RegistroSaude[]>('GET', `/empresas/${e}/prontuario${colaboradorId ? `?colaboradorId=${colaboradorId}` : ''}`),
  criar: (e: string, d: Record<string, unknown>) => chamar<RegistroSaude>('POST', `/empresas/${e}/prontuario`, d),
  remover: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/prontuario/${id}`),
  pdf: (e: string, colaboradorId: string) => baixarPdf(`/empresas/${e}/prontuario/pdf/${colaboradorId}`, 'prontuário'),
};

// ---------- Painel SSMA ----------
export type MesSsma = { mes: string; acidentes: number; comAfastamento: number; obitos: number; diasPerdidos: number; hht: number; hhtEstimado: boolean; tf: number | null; tg: number | null };
export type PainelSsma = {
  empresa: { id: string; razaoSocial: string; jornadaDiariaHoras: number; custoDiaFalta: number | null };
  filtro: { fim: string; gheId: string | null; setor: string | null }; setores: { id: string; nome: string }[];
  saude: number | null; emDia: { item: string; ok: number; de: number; pct: number | null }[];
  atual: MesSsma & { variacaoTf: number | null; variacaoTg: number | null };
  serie: MesSsma[]; ranking: { nome: string; acidentes: number }[]; afastamento: { com: number; sem: number };
  estrategico: { diasAtestadoMes: number; custoAbsenteismoMes: number | null; diasAtestado12: number; custoAbsenteismo12: number | null; cids: { cid: string; dias: number }[]; diasInss12: number; fap: { ano: number; fap: number; diferencaMensal: number | null } | null; setorMaisCat: { nome: string; acidentes: number } | null };
};
const qs = (f: Record<string, string | undefined>) => new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
export const ssma = {
  montar: (e: string, f: { fim?: string; gheId?: string }) => chamar<PainelSsma>('GET', `/empresas/${e}/ssma?${qs(f)}`),
  config: (e: string, custoDiaFalta: number | null) => chamar<{ ok: boolean }>('PUT', `/empresas/${e}/ssma/config`, { custoDiaFalta }),
  horas: (e: string, mes: string, horas: number | null) => chamar<{ ok: boolean }>('PUT', `/empresas/${e}/ssma/horas`, { mes, horas }),
  pdf: (e: string, f: { fim?: string; gheId?: string }) => baixarPdf(`/empresas/${e}/ssma/pdf?${qs(f)}`, 'painel SSMA'),
};

// Reconhecimento facial (face-api.js roda no navegador; a comparação é feita no servidor).
export type ConfigRosto = { ativo: boolean; limiar: number; consentimentoObrigatorio: boolean; provaDeVida: boolean; usos: { EPI: boolean; DDS: boolean; TREINAMENTO: boolean }; textoConsentimento: string };
export type StatusRosto = { cadastrado: boolean; consentimentoEm: string | null; hash: string | null };
export type Captura = { descritor: number[]; foto: string; latitude?: number; longitude?: number; precisao?: number; provaDeVida?: boolean; capturadoEm?: string };
export type PresencaRosto = { colaboradorId: string; nome: string; codigo: string; repetido: boolean };
export const rosto = {
  config: () => chamar<ConfigRosto>('GET', '/rosto/config'),
  listar: (e: string) => chamar<{ id: string; nome: string; cargo: string; cadastrado: boolean }[]>('GET', `/empresas/${e}/rosto`),
  status: (e: string, c: string) => chamar<StatusRosto>('GET', `/empresas/${e}/colaboradores/${c}/rosto`),
  cadastrar: (e: string, c: string, descritores: number[][], consentimento: boolean) => chamar<StatusRosto>('PUT', `/empresas/${e}/colaboradores/${c}/rosto`, { descritores, consentimento }),
  remover: (e: string, c: string) => chamar<StatusRosto>('DELETE', `/empresas/${e}/colaboradores/${c}/rosto`),
  entregarEpi: (e: string, c: string, dados: Captura & Record<string, unknown>) => chamar<{ entrega: EntregaEpi; codigo: string; distancia: number }>('POST', `/empresas/${e}/colaboradores/${c}/epis/rosto`, dados),
  presencaDds: (e: string, ddsId: string, cap: Captura) => chamar<PresencaRosto>('POST', `/empresas/${e}/dds/${ddsId}/presenca-rosto`, cap),
  presencaTurma: (e: string, turmaId: string, cap: Captura) => chamar<PresencaRosto>('POST', `/empresas/${e}/turmas/${turmaId}/presenca-rosto`, cap),
  comprovantes: (e: string, tipo: 'EPI' | 'DDS' | 'TREINAMENTO', refId: string) => chamar<{ codigo: string; colaboradorId: string; nome: string; em: string }[]>('GET', `/empresas/${e}/presencas-faciais?${qs({ tipo, refId })}`),
  pdf: (e: string, codigo: string) => baixarPdf(`/empresas/${e}/presencas-faciais/${codigo}/pdf`, 'comprovante'),
  validar: (codigo: string) => chamar<{ codigo: string; tipo: string; titulo: string; itens: [string, string][]; colaborador: string; cpf: string | null; empresa: string; em: string; hash: string; comLocal: boolean }>('GET', `/validar-rosto/${codigo}`),
};

// Almoxarifado de EPI.
export type ItemEstoque = { id: string; epi: string; ca: string; validadeCa: string | null; tamanho: string | null; quantidade: number; minimo: number; ativo: boolean; baixo: boolean; caVencido: boolean };
export type MovEstoque = { id: string; tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE'; quantidade: number; saldo: number; observacao: string | null; colaborador: string | null; createdAt: string };
export const estoque = {
  listar: (e: string) => chamar<ItemEstoque[]>('GET', `/empresas/${e}/estoque`),
  criar: (e: string, d: { epi: string; ca: string; validadeCa?: string; tamanho?: string; quantidade: number; minimo?: number }) => chamar<ItemEstoque>('POST', `/empresas/${e}/estoque`, d),
  editar: (e: string, id: string, d: { validadeCa?: string | null; minimo?: number; ativo?: boolean }) => chamar<ItemEstoque>('PATCH', `/empresas/${e}/estoque/${id}`, d),
  entrada: (e: string, id: string, quantidade: number, observacao?: string) => chamar<ItemEstoque>('POST', `/empresas/${e}/estoque/${id}/entrada`, { quantidade, observacao }),
  ajuste: (e: string, id: string, quantidade: number, observacao: string) => chamar<ItemEstoque>('POST', `/empresas/${e}/estoque/${id}/ajuste`, { quantidade, observacao }),
  movimentos: (e: string, id: string) => chamar<MovEstoque[]>('GET', `/empresas/${e}/estoque/${id}/movimentos`),
};

// Lista de toque: cada pessoa assina com o dedo na lista de presença do DDS ou do treinamento.
export type PessoaLista = { colaboradorId: string; nome: string; cargo: string; cpf: string | null; foto: string | null; assinadoEm: string | null; testemunha: string | null };
export type ListaToque = { titulo: string; subtitulo: string; responsavel: string; pessoas: PessoaLista[]; assinadas: number; foraDaLista: number };
export type TipoListaToque = 'dds' | 'turmas';
export const listaToque = {
  ver: (e: string, t: TipoListaToque, id: string) => chamar<ListaToque>('GET', `/empresas/${e}/lista-toque/${t}/${id}`),
  marcarTodos: (e: string, t: TipoListaToque, id: string) => chamar<ListaToque>('POST', `/empresas/${e}/lista-toque/${t}/${id}/marcar-todos`),
  assinar: (e: string, t: TipoListaToque, id: string, colab: string, d: { imagem: string; foto?: string; latitude?: number; longitude?: number; precisao?: number; aRogo?: boolean }) =>
    chamar<ListaToque>('POST', `/empresas/${e}/lista-toque/${t}/${id}/${colab}`, d),
};
export const fotoColaborador = {
  ver: (e: string, c: string) => chamar<{ foto: string | null }>('GET', `/empresas/${e}/colaboradores/${c}/foto`),
  salvar: (e: string, c: string, imagem: string) => chamar<{ foto: string | null }>('PUT', `/empresas/${e}/colaboradores/${c}/foto`, { imagem }),
  apagar: (e: string, c: string) => chamar<{ foto: string | null }>('DELETE', `/empresas/${e}/colaboradores/${c}/foto`),
};

// Painel ADM da plataforma (só o dono do Safety Nexo).
export type PlanoPlataforma = { codigo: string; nome: string; precoMensal: number; limiteEmpresas: number | null };
export type ConsultoriaAdm = {
  id: string; nome: string; cnpj: string | null; cidade: string | null; plano: string; limiteEmpresas: number;
  bloqueada: boolean; motivoBloqueio: string | null; observacaoAdm: string | null; criadaEm: string;
  pedidoPlano: string | null; pedidoPlanoEm: string | null; dono: boolean;
  responsavel: { nome: string; email: string } | null;
  empresas: number; usuarios: number; colaboradores: number; documentos: number; ultimoAcesso: string | null;
};
export type PainelAdm = {
  planos: PlanoPlataforma[];
  totais: {
    consultorias: number; ativas: number; bloqueadas: number; novasNoMes: number; usaramEm30Dias: number;
    pagantes: number; receitaMensal: number; porPlano: { codigo: string; nome: string; total: number }[];
  };
  consultorias: ConsultoriaAdm[];
};
export type ConsultoriaAdmDetalhe = {
  id: string; nome: string;
  usuarios: { id: string; nome: string; email: string; papel: 'CONSULTORIA' | 'EMPRESA'; createdAt: string; ultimoAcesso: string | null; empresa: { razaoSocial: string } | null }[];
  empresas: { id: string; razaoSocial: string; cnpj: string; createdAt: string; _count: { colaboradores: number; documentos: number; arquivos: number } }[];
};
export const admin = {
  painel: () => chamar<PainelAdm>('GET', '/admin/consultorias'),
  detalhe: (id: string) => chamar<ConsultoriaAdmDetalhe>('GET', `/admin/consultorias/${id}`),
  atualizar: (id: string, dados: { plano?: string; limiteEmpresas?: number; bloqueada?: boolean; motivoBloqueio?: string; observacaoAdm?: string }) =>
    chamar<unknown>('PATCH', `/admin/consultorias/${id}`, dados),
};

// ---------- Novidades: normas, prevenção, IA, votação da CIPA, espaço do trabalhador, e-mail ----------

// Imagem protegida (foto de relato ou de ação): busca com o login e devolve um endereço local.
export async function imagemProtegida(caminho: string): Promise<string> {
  const res = await fetch(`${API_URL}${caminho}`, { headers: cabecalhos() });
  verificarSessao(res);
  if (!res.ok) throw new Error('Não foi possível abrir a foto.');
  return URL.createObjectURL(await res.blob());
}

export type AvisoNorma = {
  id: string; titulo: string; normas: string[]; resumo: string; oQueFazer: string | null; linkOficial: string | null;
  publicadaEm: string | null; vigenciaEm: string | null; cnaePrefixos: string[]; grauRiscoMin: number | null; funcionariosMin: number | null; criadoEm: string;
};
export type AvisoNormaConsultoria = AvisoNorma & { lido: boolean; empresas: { id: string; razaoSocial: string }[] };
export type NovoAvisoNorma = Omit<AvisoNorma, 'id' | 'criadoEm' | 'oQueFazer' | 'linkOficial' | 'publicadaEm' | 'vigenciaEm' | 'grauRiscoMin' | 'funcionariosMin'> & {
  oQueFazer?: string; linkOficial?: string; publicadaEm?: string; vigenciaEm?: string; grauRiscoMin?: number; funcionariosMin?: number;
};
export const normas = {
  avisos: () => chamar<AvisoNormaConsultoria[]>('GET', '/normas/avisos'),
  lido: (id: string) => chamar<{ ok: boolean }>('POST', `/normas/avisos/${id}/lido`),
  adminListar: () => chamar<(AvisoNorma & { _count: { lidos: number } })[]>('GET', '/admin/normas'),
  adminCriar: (d: NovoAvisoNorma) => chamar<AvisoNorma>('POST', '/admin/normas', d),
  adminAtualizar: (id: string, d: NovoAvisoNorma) => chamar<AvisoNorma>('PUT', `/admin/normas/${id}`, d),
  adminRemover: (id: string) => chamar<{ ok: boolean }>('DELETE', `/admin/normas/${id}`),
};

export const avisosEmail = {
  previa: () => chamar<{ avisosEmail: boolean; emailLigado: boolean; html: string }>('GET', '/avisos/previa'),
  preferencia: (avisosEmail: boolean) => chamar<{ avisosEmail: boolean }>('PUT', '/avisos/preferencia', { avisosEmail }),
};

export type TipoRelato = 'QUASE_ACIDENTE' | 'CONDICAO_INSEGURA' | 'ATO_INSEGURO' | 'SUGESTAO';
export const TIPOS_RELATO: Record<TipoRelato, string> = { QUASE_ACIDENTE: 'Quase acidente', CONDICAO_INSEGURA: 'Algo perigoso no local', ATO_INSEGURO: 'Alguém fazendo algo arriscado', SUGESTAO: 'Ideia para melhorar' };
export type PerigoIa = { descricao: string; nr: string | null; tipo: string; probabilidade: number; severidade: number; acoes: string[] };
export type AnaliseFotoIa = { resumo: string; imagemUtil: boolean; perigos: PerigoIa[]; boasPraticas: string[] };
export type Relato = {
  id: string; numero: number; tipo: TipoRelato; descricao: string; local: string | null; nome: string | null;
  status: 'NOVO' | 'EM_ANALISE' | 'ENCERRADO'; resposta: string | null; analiseIa: AnaliseFotoIa | null; criadoEm: string; temFoto: boolean; acoes: boolean;
};
export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA';
export type Esforco = 'RAPIDO' | 'MEDIO' | 'DEMORADO';
export type AcaoCorretiva = {
  id: string; origem: string; origemId: string | null; origemTexto: string | null; descricao: string; local: string | null; responsavel: string | null;
  prazo: string | null; prioridade: Prioridade; esforco: Esforco; status: 'ABERTA' | 'FEITA'; feitaEm: string | null; feitaPor: string | null;
  observacao: string | null; temEvidencia: boolean; criadoEm: string; somenteLeitura: boolean;
};
export type NovaAcao = { descricao: string; local?: string; responsavel?: string; prazo?: string; prioridade?: Prioridade; esforco?: Esforco; origem?: string; origemId?: string; origemTexto?: string };
export type CategoriaCausa = 'METODO' | 'MAQUINA' | 'MATERIAL' | 'PESSOAS' | 'AMBIENTE' | 'GESTAO';
export const CATEGORIAS_CAUSA: Record<CategoriaCausa, string> = { METODO: 'Método (como o trabalho é feito)', MAQUINA: 'Máquina ou equipamento', MATERIAL: 'Material', PESSOAS: 'Pessoas (treino, cansaço, pressa)', AMBIENTE: 'Ambiente (piso, luz, calor)', GESTAO: 'Gestão (regras, supervisão)' };
export type Investigacao = { id: string; catId: string | null; relatoId: string | null; titulo: string; dataOcorrencia: string; local: string; descricao: string; equipe: string; porques: string[]; causas: { categoria: CategoriaCausa; texto: string }[]; conclusao: string | null; criadoEm: string };
export type NovaInvestigacao = Omit<Investigacao, 'id' | 'criadoEm' | 'catId' | 'relatoId' | 'conclusao'> & { catId?: string; relatoId?: string; conclusao?: string; medidas: { descricao: string; responsavel?: string; prazo?: string; prioridade?: Prioridade }[] };
export type InvestigacaoIa = { porques: string[]; causas: { categoria: CategoriaCausa; texto: string }[]; medidas: { descricao: string; prioridade: Prioridade }[]; observacao: string | null };

const comFoto = (campos: Record<string, string | undefined>, foto?: Blob | null) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) if (v !== undefined && v !== '') f.append(k, v);
  if (foto) f.append('foto', foto, 'foto.jpg');
  return f;
};

export const prevencao = {
  qr: (e: string) => chamar<{ link: string; qr: string }>('GET', `/empresas/${e}/relatos/qr`),
  novoQr: (e: string) => chamar<{ link: string; qr: string }>('POST', `/empresas/${e}/relatos/qr/novo`),
  cartaz: (e: string) => baixarPdf(`/empresas/${e}/relatos/cartaz`, 'cartaz'),
  relatos: (e: string) => chamar<Relato[]>('GET', `/empresas/${e}/relatos`),
  fotoRelato: (e: string, id: string) => imagemProtegida(`/empresas/${e}/relatos/${id}/foto`),
  tratar: (e: string, id: string, d: { status: Relato['status']; resposta?: string }) => chamar<Relato>('PUT', `/empresas/${e}/relatos/${id}`, d),
  analisarRelato: (e: string, id: string) => chamar<AnaliseFotoIa>('POST', `/empresas/${e}/relatos/${id}/ia`),
  acoes: (e: string) => chamar<AcaoCorretiva[]>('GET', `/empresas/${e}/acoes`),
  criarAcao: (e: string, d: NovaAcao) => chamar<AcaoCorretiva>('POST', `/empresas/${e}/acoes`, d),
  atualizarAcao: (e: string, id: string, d: Partial<Pick<AcaoCorretiva, 'descricao' | 'responsavel' | 'prazo' | 'prioridade' | 'esforco' | 'status' | 'observacao'>>) => chamar<AcaoCorretiva>('PUT', `/empresas/${e}/acoes/${id}`, d),
  removerAcao: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/acoes/${id}`),
  evidencia: (e: string, id: string, foto: Blob) => chamar<{ ok: boolean }>('POST', `/empresas/${e}/acoes/${id}/evidencia`, comFoto({}, foto)),
  verEvidencia: (e: string, id: string) => imagemProtegida(`/empresas/${e}/acoes/${id}/evidencia`),
  acoesDaInspecao: (e: string, inspecaoId: string) => chamar<{ criadas: number }>('POST', `/empresas/${e}/acoes/da-inspecao/${inspecaoId}`),
  pdfPlano: (e: string) => baixarPdf(`/empresas/${e}/acoes/pdf`, 'plano de ação'),
  investigacoes: (e: string) => chamar<Investigacao[]>('GET', `/empresas/${e}/investigacoes`),
  criarInvestigacao: (e: string, d: NovaInvestigacao) => chamar<Investigacao>('POST', `/empresas/${e}/investigacoes`, d),
  removerInvestigacao: (e: string, id: string) => chamar<{ ok: boolean }>('DELETE', `/empresas/${e}/investigacoes/${id}`),
  pdfInvestigacao: (e: string, id: string) => baixarPdf(`/empresas/${e}/investigacoes/${id}/pdf`, 'relatório da investigação'),
};

export const relatoPublico = {
  dados: (token: string) => chamar<{ empresa: string; consultoria: string; setores: string[] }>('GET', `/relato/${token}`),
  enviar: (token: string, d: { tipo: TipoRelato; descricao: string; local?: string; nome?: string }, foto?: Blob | null) =>
    chamar<{ ok: boolean; numero: number }>('POST', `/relato/${token}`, comFoto(d, foto)),
};

export type AprIa = { etapas: EtapaApr[]; permissoes: string[]; observacao: string | null };
export const ia = {
  status: () => chamar<{ ligada: boolean }>('GET', '/ia/status'),
  foto: (e: string, foto: Blob, contexto?: string) => chamar<AnaliseFotoIa>('POST', `/empresas/${e}/ia/foto`, comFoto({ contexto }, foto)),
  apr: (e: string, atividade: string, local?: string, foto?: Blob | null) => chamar<AprIa>('POST', `/empresas/${e}/ia/apr`, comFoto({ atividade, local }, foto)),
  investigacao: (e: string, descricao: string) => chamar<InvestigacaoIa>('POST', `/empresas/${e}/ia/investigacao`, { descricao }),
};

export type SituacaoVotacao = {
  inicio: string | null; fim: string | null; apuradaEm: string | null; estado: 'NAO_ABERTA' | 'AGENDADA' | 'ABERTA' | 'ENCERRADA' | 'APURADA';
  total: number; votaram: number; eleitores: { nome: string; cargo: string; codigo: string; link: string; votou: boolean }[];
  resultado: { candidatos: { nome: string; votos: number }[]; brancos: number; nulos: number } | null;
};
const rotaVotacao = (e: string, eleicaoId: string) => `/empresas/${e}/cipa/eleicoes/${eleicaoId}/votacao`;
export const votacaoCipa = {
  situacao: (e: string, id: string) => chamar<SituacaoVotacao>('GET', rotaVotacao(e, id)),
  abrir: (e: string, id: string, d: { inicio: string; fim: string }) => chamar<SituacaoVotacao>('POST', rotaVotacao(e, id), d),
  encerrar: (e: string, id: string) => chamar<SituacaoVotacao>('POST', `${rotaVotacao(e, id)}/encerrar`),
  apurar: (e: string, id: string) => chamar<SituacaoVotacao>('POST', `${rotaVotacao(e, id)}/apurar`),
  tirinhas: (e: string, id: string) => baixarPdf(`${rotaVotacao(e, id)}/tirinhas`, 'códigos de votação'),
};
export type Cedula = { empresa: string; primeiroNome: string; inicio: string | null; fim: string | null; votou: boolean; aberta: boolean; pedeCpf: boolean; candidatos: { id: string; nome: string; cargo: string }[] };
export const votoPublico = {
  cedula: (codigo: string) => chamar<Cedula>('GET', `/cipa-voto/${codigo}`),
  votar: (codigo: string, d: { escolha: string; cpfInicio?: string }) => chamar<{ ok: boolean }>('POST', `/cipa-voto/${codigo}`, d),
};

export type TreinamentoSugerido = { norma: string; modelo: string; motivo: string; onde: string[]; total: number; pendentes: { id: string; nome: string; cargo: string }[] };
export const treinamentosSugeridos = (e: string) => chamar<TreinamentoSugerido[]>('GET', `/empresas/${e}/treinamentos/sugeridos`);

export type LinkPortal = { id: string; nome: string; cargo: string; temCpf: boolean; link: string | null };
export const portal = {
  links: (e: string) => chamar<LinkPortal[]>('GET', `/empresas/${e}/portal`),
  gerar: (e: string) => chamar<LinkPortal[]>('POST', `/empresas/${e}/portal/gerar`),
  novo: (e: string, colaboradorId: string) => chamar<{ link: string }>('POST', `/empresas/${e}/portal/${colaboradorId}/novo`),
};
export type MeuEspaco = {
  nome: string; cargo: string; empresa: string; consultoria: string;
  asos: { tipo: string; dataExame: string; resultado: string; proximoExame: string | null }[];
  epis: { epi: string; ca: string; quantidade: number; dataEntrega: string }[];
  treinamentos: { nome: string; norma: string | null; cargaHoraria: number; concluidoEm: string; validade: string | null; vencido: boolean; certificado: string }[];
  assinar: { titulo: string; papel: string; link: string }[];
  votar: string | null; relato: string | null;
};
export const meuEspaco = {
  abrir: (token: string) => chamar<{ primeiroNome: string; empresa: string }>('GET', `/portal/${token}`),
  entrar: (token: string, cpf: string) => chamar<MeuEspaco>('POST', `/portal/${token}`, { cpf }),
};

// Meu plano: plano da consultoria, empresas usadas e pedido de troca (o dono da plataforma confirma no painel ADM).
export type MeuPlano = {
  plano: string; nomePlano: string; limiteEmpresas: number | null; empresas: number; acessoTotal: boolean;
  pedidoPlano: string | null; pedidoPlanoEm: string | null;
};
export const meuPlano = {
  ver: () => chamar<MeuPlano>('GET', '/meu-plano'),
  pedir: (plano: string) => chamar<MeuPlano>('POST', '/meu-plano/pedido', { plano }),
};
