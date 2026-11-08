import type { NomeIcone } from '@/components/Icone';

// Todos os documentos que o Safety Nexo emite, num lugar só (tela "Emitir documento").
// "rota" segue a regra do menu: "/" fica dentro da empresa em foco, "#" abre uma parte do cadastro
// e "geral" é fora da empresa.
export type ModeloDocumento = {
  sigla: string;
  nome: string;
  norma: string;
  grupo: GrupoDocumento;
  texto: string;
  rota: string;
  icone: NomeIcone;
  geral?: boolean;
  soConsultoria?: boolean;
  buscar?: string; // outras palavras que a pessoa pode digitar
};

export const GRUPOS_DOCUMENTO = ['Programas e laudos', 'Dia a dia', 'Funcionários', 'Saúde', 'CIPA e treinamentos', 'Emergência e indicadores', 'Comercial'] as const;
export type GrupoDocumento = (typeof GRUPOS_DOCUMENTO)[number];

export const DOCUMENTOS: ModeloDocumento[] = [
  { sigla: 'PGR', nome: 'Programa de Gerenciamento de Riscos', norma: 'NR-01', grupo: 'Programas e laudos', texto: 'Sai com os GHEs, riscos e EPIs que já estão no cadastro.', rota: '#documentos', icone: 'documento', soConsultoria: true, buscar: 'inventario plano de acao gro' },
  { sigla: 'PCMSO', nome: 'Programa de Controle Médico de Saúde Ocupacional', norma: 'NR-07', grupo: 'Programas e laudos', texto: 'Exames de cada GHE, com o médico responsável.', rota: '#documentos', icone: 'coracao', soConsultoria: true, buscar: 'exames medico' },
  { sigla: 'LTCAT', nome: 'Laudo Técnico das Condições Ambientais do Trabalho', norma: 'Previdência', grupo: 'Programas e laudos', texto: 'Agentes nocivos e aposentadoria especial.', rota: '#documentos', icone: 'documento', soConsultoria: true, buscar: 'aposentadoria especial inss' },
  { sigla: 'LIP', nome: 'Laudo de Insalubridade', norma: 'NR-15', grupo: 'Programas e laudos', texto: 'Grau de insalubridade por GHE.', rota: '#documentos', icone: 'documento', soConsultoria: true, buscar: 'insalubridade adicional' },
  { sigla: 'LPP', nome: 'Laudo de Periculosidade', norma: 'NR-16', grupo: 'Programas e laudos', texto: 'Atividades perigosas e o anexo da norma.', rota: '#documentos', icone: 'documento', soConsultoria: true, buscar: 'periculosidade adicional' },
  { sigla: 'PGRTR', nome: 'PGR do Trabalho Rural', norma: 'NR-31', grupo: 'Programas e laudos', texto: 'Para empresas do campo.', rota: '#documentos', icone: 'documento', soConsultoria: true, buscar: 'rural campo agro' },
  { sigla: 'OS', nome: 'Ordem de Serviço', norma: 'NR-01', grupo: 'Funcionários', texto: 'Uma por colaborador, com os riscos do cargo.', rota: '#documentos', icone: 'documento', soConsultoria: true, buscar: 'ordem de servico' },
  { sigla: 'AEP', nome: 'Avaliação Ergonômica Preliminar', norma: 'NR-17', grupo: 'Saúde', texto: 'Checklist rápido do posto, com ações no plano.', rota: '/operacao#checklist', icone: 'cadeira', buscar: 'ergonomia preliminar aep' },
  { sigla: 'AET', nome: 'Análise Ergonômica do Trabalho', norma: 'NR-17', grupo: 'Saúde', texto: 'Postos de trabalho e recomendações.', rota: '/saude#aet', icone: 'cadeira', buscar: 'ergonomia' },
  { sigla: 'Psico', nome: 'Avaliação psicossocial', norma: 'NR-01', grupo: 'Saúde', texto: 'Questionário anônimo e relatório por setor.', rota: '/psicossocial', icone: 'cerebro', soConsultoria: true, buscar: 'aep psicossocial estresse srq' },
  { sigla: 'CAT', nome: 'Comunicação de Acidente de Trabalho', norma: 'eSocial S-2210', grupo: 'Saúde', texto: 'Com o prazo legal e o recibo do eSocial.', rota: '/saude#cat', icone: 'cruz', buscar: 'acidente' },
  { sigla: 'Inv', nome: 'Investigação de acidente', norma: 'NR-01', grupo: 'Saúde', texto: '5 porquês, causas e medidas.', rota: '/prevencao#investigacao', icone: 'lupa', soConsultoria: true, buscar: 'arvore de causas acidente' },
  { sigla: 'APR', nome: 'Análise Preliminar de Risco', norma: 'NR-01', grupo: 'Dia a dia', texto: 'Etapas, riscos, medidas e EPIs da atividade.', rota: '/operacao#apr', icone: 'escudo', buscar: 'analise de risco' },
  { sigla: 'PT', nome: 'Permissão de Trabalho', norma: 'NR-10 / 33 / 35', grupo: 'Dia a dia', texto: 'Altura, espaço confinado, quente e eletricidade.', rota: '/operacao#pt', icone: 'chave', buscar: 'permissao altura espaco confinado quente' },
  { sigla: 'DDS', nome: 'Diálogo Diário de Segurança', norma: 'Treinamento', grupo: 'Dia a dia', texto: '150 temas prontos, com lista de presença.', rota: '/operacao#dds', icone: 'fala', buscar: 'dialogo' },
  { sigla: 'CHK', nome: 'Checklist de inspeção', norma: 'NR-06 / 10 / 12 / 23 / 24', grupo: 'Dia a dia', texto: 'Com fotos, relatório da IA e prazo para inspecionar de novo.', rota: '/operacao#checklist', icone: 'lista', buscar: 'inspecao vistoria foto' },
  { sigla: 'ASO', nome: 'Atestado de Saúde Ocupacional', norma: 'NR-07', grupo: 'Funcionários', texto: 'Por colaborador, com o próximo exame calculado.', rota: '#colaboradores', icone: 'pessoas', buscar: 'exame admissional periodico demissional' },
  { sigla: 'EPI', nome: 'Ficha de entrega de EPI', norma: 'NR-06', grupo: 'Funcionários', texto: 'Com CA, validade e assinatura.', rota: '#colaboradores', icone: 'caixa', buscar: 'ficha epi ca' },
  { sigla: 'PPP', nome: 'Perfil Profissiográfico Previdenciário', norma: 'eSocial S-2240', grupo: 'Funcionários', texto: 'Na ficha do colaborador.', rota: '#colaboradores', icone: 'pessoas', soConsultoria: true, buscar: 'perfil profissiografico' },
  { sigla: 'CIPA', nome: 'Dimensionamento da CIPA', norma: 'NR-05', grupo: 'CIPA e treinamentos', texto: 'Quadro I da NR-05 e calendário do mandato.', rota: '#cipa', icone: 'votar', soConsultoria: true },
  { sigla: 'Eleição', nome: 'Eleição da CIPA', norma: 'NR-05', grupo: 'CIPA e treinamentos', texto: 'Edital, cédulas, atas de eleição e posse.', rota: '/cipa', icone: 'votar', soConsultoria: true, buscar: 'edital ata posse cedula' },
  { sigla: 'Cert', nome: 'Certificado e lista de presença', norma: '28 NRs', grupo: 'CIPA e treinamentos', texto: 'Treinamentos com QR code de validação.', rota: '/treinamentos', icone: 'formatura', buscar: 'treinamento certificado presenca' },
  { sigla: 'SIPAT', nome: 'Programação da SIPAT', norma: 'NR-05', grupo: 'CIPA e treinamentos', texto: 'Semana de prevenção com a agenda.', rota: '/cultura#sipat', icone: 'festa' },
  { sigla: '5S', nome: 'Auditoria 5S', norma: 'Qualidade', grupo: 'CIPA e treinamentos', texto: 'Notas por senso e por área.', rota: '/cultura#5s', icone: 'vassoura' },
  { sigla: 'PAE', nome: 'Plano de emergência e brigada', norma: 'IT 17 / NR-23', grupo: 'Emergência e indicadores', texto: 'Brigada dimensionada, AVCB e extintores.', rota: '/emergencia', icone: 'fogo', buscar: 'brigada incendio avcb' },
  { sigla: 'SSMA', nome: 'Relatório de indicadores', norma: 'NBR 14280', grupo: 'Emergência e indicadores', texto: 'Taxa de frequência, gravidade e metas.', rota: '/ssma', icone: 'grafico', buscar: 'indicadores taxa frequencia gravidade' },
  { sigla: 'FAP', nome: 'Relatório FAP e RAT', norma: 'Previdência', grupo: 'Emergência e indicadores', texto: 'Quanto a empresa paga e como reduzir.', rota: '/fap', icone: 'porcento', soConsultoria: true, buscar: 'rat ntep' },
  { sigla: 'Prop', nome: 'Proposta comercial', norma: 'Consultoria', grupo: 'Comercial', texto: 'Serviços e valores para o cliente.', rota: '/comercial', icone: 'cifrao', geral: true, soConsultoria: true, buscar: 'orcamento' },
  { sigla: 'Contr', nome: 'Contrato de prestação de serviço', norma: 'Consultoria', grupo: 'Comercial', texto: 'Gerado a partir da proposta aceita.', rota: '/comercial', icone: 'cifrao', geral: true, soConsultoria: true },
  { sigla: 'Pix', nome: 'Cobrança com Pix', norma: 'Consultoria', grupo: 'Comercial', texto: 'Com QR code do Pix da consultoria.', rota: '/comercial', icone: 'cifrao', geral: true, soConsultoria: true, buscar: 'boleto pagamento' },
];

// Busca sem acento e sem maiúscula: "inspecao" acha "Inspeção".
export const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarDocumentos(lista: ModeloDocumento[], busca: string, grupo: string) {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  return lista.filter((d) => {
    if (grupo && d.grupo !== grupo) return false;
    const alvo = semAcento(`${d.sigla} ${d.nome} ${d.norma} ${d.texto} ${d.buscar ?? ''}`);
    return termos.every((t) => alvo.includes(t));
  });
}
