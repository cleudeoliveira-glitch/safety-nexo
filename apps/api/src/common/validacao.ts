import { BadRequestException, ValidationError } from '@nestjs/common';

// Nomes amigáveis dos campos, para as mensagens de erro.
const CAMPOS: Record<string, string> = {
  razaoSocial: 'Razão social', cnpj: 'CNPJ', cnae: 'CNAE', grauRisco: 'Grau de risco', numFuncionarios: 'Número de funcionários',
  nome: 'Nome', cpf: 'CPF', cargo: 'Cargo', cbo: 'CBO', email: 'E-mail', senha: 'Senha', nomeConsultoria: 'Nome da consultoria',
  atividade: 'Atividade', local: 'Local', responsavel: 'Responsável', etapa: 'Etapa', riscos: 'Riscos', medidas: 'Medidas',
  emitente: 'Emitente', tema: 'Tema', conteudo: 'Conteúdo', ministrante: 'Ministrante', duracaoMin: 'Duração',
  agente: 'Agente', fonteGeradora: 'Fonte geradora', crm: 'CRM', epi: 'EPI', ca: 'CA', quantidade: 'Quantidade',
  localVotacao: 'Local da votação', horarioVotacao: 'Horário', votantes: 'Votantes', votos: 'Votos', instrutor: 'Instrutor',
  cargaHoraria: 'Carga horária', validadeMeses: 'Validade',
};

const numero = (texto: string) => texto.match(/(\d+)/)?.[1];

// Troca as mensagens padrão (em inglês) por frases em português. Mensagens escritas nos DTOs são mantidas.
function traduzir(chave: string, mensagem: string, campo: string): string {
  if (!/must|should|not exist|longer|shorter/i.test(mensagem)) return mensagem;
  switch (chave) {
    case 'isLength':
      return /longer/.test(mensagem) ? `${campo} precisa ter pelo menos ${numero(mensagem)} caracteres.` : `${campo} pode ter no máximo ${numero(mensagem)} caracteres.`;
    case 'maxLength':
      return `${campo} pode ter no máximo ${numero(mensagem)} caracteres.`;
    case 'minLength':
      return `${campo} precisa ter pelo menos ${numero(mensagem)} caracteres.`;
    case 'min':
      return `${campo} não pode ser menor que ${numero(mensagem)}.`;
    case 'max':
      return `${campo} não pode ser maior que ${numero(mensagem)}.`;
    case 'isInt':
    case 'isNumber':
      return `${campo} precisa ser um número inteiro.`;
    case 'isDateString':
      return `${campo} precisa ser uma data válida.`;
    case 'isEmail':
      return 'Informe um e-mail válido.';
    case 'isBoolean':
      return `${campo} precisa ser sim ou não.`;
    case 'isIn':
      return `${campo} tem um valor que não é aceito.`;
    case 'isArray':
      return `${campo} precisa ser uma lista.`;
    case 'arrayMinSize':
      return `Inclua pelo menos ${numero(mensagem)} item em ${campo}.`;
    case 'whitelistValidation':
      return `O campo ${campo} não é aceito aqui.`;
    case 'isNotEmpty':
      return `Preencha ${campo}.`;
    default:
      return `${campo} está inválido.`;
  }
}

function mensagens(erros: ValidationError[]): string[] {
  return erros.flatMap((erro) => {
    const campo = CAMPOS[erro.property] ?? erro.property;
    const regras = Object.entries(erro.constraints ?? {});
    // Campo ausente falha em várias regras ao mesmo tempo; basta pedir para preencher.
    if (erro.value === undefined || erro.value === null || erro.value === '') {
      const propria = regras.find(([chave, msg]) => traduzir(chave, msg, campo) === msg);
      if (regras.length) return [propria ? propria[1] : `Preencha ${campo}.`];
    }
    const proprias = regras.map(([chave, msg]) => traduzir(chave, msg, campo));
    return [...proprias, ...mensagens(erro.children ?? [])];
  });
}

export const errosEmPortugues = (erros: ValidationError[]) => new BadRequestException([...new Set(mensagens(erros))]);
