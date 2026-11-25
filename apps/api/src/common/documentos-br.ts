import { ConflictException } from '@nestjs/common';
import { registerDecorator, ValidationOptions } from 'class-validator';

// Conferência dos dígitos de CPF e CNPJ. Campo vazio passa (quem é obrigatório tem a própria regra).

export const soDigitos = (v: string) => (v ?? '').replace(/\D/g, '');

export function cpfValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function cnpjValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((t, p, i) => t + Number(d[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

function regra(nome: string, teste: (v: string) => boolean, mensagem: string, opcoes?: ValidationOptions) {
  return (objeto: object, propriedade: string) =>
    registerDecorator({
      name: nome,
      target: objeto.constructor,
      propertyName: propriedade,
      options: { message: mensagem, ...opcoes },
      validator: { validate: (v: unknown) => v === undefined || v === null || (typeof v === 'string' && (!v.trim() || teste(v))) },
    });
}

export const EhCpf = (mensagem = 'Este CPF não é válido. Confira os números.', opcoes?: ValidationOptions) => regra('ehCpf', cpfValido, mensagem, opcoes);
export const EhCnpj = (mensagem = 'Este CNPJ não é válido. Confira os números.', opcoes?: ValidationOptions) => regra('ehCnpj', cnpjValido, mensagem, opcoes);

// Duas pessoas com o mesmo CPF na mesma empresa contam em dobro no PGR, nos indicadores e no eSocial.
export async function conferirCpfRepetido(
  prisma: { colaborador: { findMany(args: { where: object; select: { id: true; nome: true; cpf: true } }): Promise<{ id: string; nome: string; cpf: string | null }[]> } },
  empresaId: string,
  cpf: string | null | undefined,
  excetoId?: string,
) {
  const procurado = soDigitos(cpf ?? '');
  if (!procurado) return;
  const comCpf = await prisma.colaborador.findMany({ where: { empresaId, cpf: { not: null }, ...(excetoId ? { id: { not: excetoId } } : {}) }, select: { id: true, nome: true, cpf: true } });
  const igual = comCpf.find((c) => soDigitos(c.cpf ?? '') === procurado);
  if (igual) throw new ConflictException(`Já existe uma pessoa com este CPF nesta empresa: ${igual.nome}. Abra a ficha dela em vez de cadastrar de novo.`);
}
