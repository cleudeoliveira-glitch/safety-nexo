import { documentoHtml, escape, Moldura } from '../documentos/layout';

type Ano = { ano: number; rat: number; fap: number; ratAjustado: number; efeito: string; percentual: number; folhaMensal: number | null; custoMensal: number | null; semFap: number | null; diferencaMensal: number | null; observacao: string | null };
type Ocorr = { desde: Date; cats: number; comAfastamento: number; obitos: number; afastamentosInss: number };

const n4 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const real = (n: number | null) => (n == null ? '-' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;

export function relatorioFapHtml(m: Moldura, anos: Ano[], o: Ocorr) {
  const atual = anos[0];
  const frase = atual.efeito === 'neutro' ? 'O FAP é 1,0000: não aumenta nem diminui o RAT.'
    : `O FAP ${atual.efeito} o RAT em ${atual.percentual.toLocaleString('pt-BR')}%: a alíquota passa de ${pct(atual.rat)} para ${pct(atual.ratAjustado)} da folha.`;
  return documentoHtml(m, `
    <h2>${atual.ano}</h2>
    <p>${escape(frase)}</p>
    ${atual.diferencaMensal != null ? `<p>Com folha de ${real(atual.folhaMensal)} por mês, a contribuição fica em ${real(atual.custoMensal)} por mês, ${atual.diferencaMensal > 0 ? `${real(atual.diferencaMensal)} a mais` : atual.diferencaMensal < 0 ? `${real(-atual.diferencaMensal)} a menos` : 'o mesmo valor'} do que seria sem o FAP (${real(atual.semFap)}).</p>` : ''}
    <h2>Anos informados</h2>
    <table><tr><th>Ano</th><th>RAT</th><th>FAP</th><th>RAT ajustado</th><th>Folha mensal</th><th>Por mês</th><th>Diferença pelo FAP</th></tr>
    ${anos.map((a) => `<tr><td>${a.ano}</td><td>${pct(a.rat)}</td><td>${n4(a.fap)}</td><td>${pct(a.ratAjustado)}</td><td>${real(a.folhaMensal)}</td><td>${real(a.custoMensal)}</td><td>${real(a.diferencaMensal)}</td></tr>`).join('')}
    </table>
    <h2>O que está registrado no sistema (últimos 24 meses)</h2>
    <table><tr><th>CATs emitidas</th><th>Com afastamento</th><th>Óbitos</th><th>Afastamentos do trabalho com mais de 15 dias</th></tr>
    <tr><td>${o.cats}</td><td>${o.comAfastamento}</td><td>${o.obitos}</td><td>${o.afastamentosInss}</td></tr></table>
    <p class="meta">O que pesa no FAP são as CATs e os benefícios que o INSS concede por acidente ou doença do trabalho, inclusive por nexo técnico, de acordo com a gravidade e o custo de cada um (Decreto 3.048/1999, art. 202-A, § 4º). Menos acidentes e afastamentos hoje significam um FAP menor nos próximos anos.</p>
    <p class="meta">Como a conta é feita: o RAT é de 1%, 2% ou 3%, conforme o risco da atividade principal (Lei 8.212/1991, art. 22, II). O FAP vai de 0,5000 a 2,0000 e multiplica o RAT (Decreto 3.048/1999, art. 202-A, § 1º). A Previdência divulga o FAP de cada empresa todo ano, na internet.</p>`);
}
