// Mesma conferência de CPF e CNPJ do motor, para avisar já ao sair do campo.
const soDigitos = (v: string) => (v ?? '').replace(/\D/g, '');

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
    const resto = pesos.reduce((t, p, i) => t + Number(d[i]) * p, 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

// Aviso para mostrar embaixo do campo: null quando está vazio ou certo.
export const avisoCpf = (v: string) => (v.trim() && !cpfValido(v) ? 'Este CPF não é válido. Confira os números.' : null);
export const avisoCnpj = (v: string) => (v.trim() && !cnpjValido(v) ? 'Este CNPJ não é válido. Confira os números.' : null);
