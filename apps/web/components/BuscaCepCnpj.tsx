'use client';

import { useRef, useState } from 'react';
import { Campo } from './ui';
import { BuscaNaoAchou, buscarCep, buscarCnpj, DadosCnpj, EnderecoCep, escreverNoCampo, formatarCep, montarEndereco } from '@/lib/buscaCepCnpj';

type Situacao = { tipo: 'buscando' | 'ok' | 'aviso' | 'erro'; texto: string } | null;
const COR = { buscando: 'text-text/60', ok: 'text-success', aviso: 'text-warning', erro: 'text-warning' } as const;

function Linha({ s }: { s: Situacao }) {
  return s ? <p className={`mt-1.5 text-sm ${COR[s.tipo]}`} aria-live="polite">{s.texto}</p> : null;
}

// CNPJ que, ao completar os 14 números, busca a empresa na Receita e entrega os dados para a tela preencher.
// Se a busca falhar, só avisa: o campo continua normal e a pessoa digita o resto.
export function CampoCnpj({
  id, name, rotulo = 'CNPJ', aoAchar, className, onBlur, onChange, ...input
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string; rotulo?: string; aoAchar: (dados: DadosCnpj, form: HTMLFormElement | null) => string | void;
}) {
  const [situacao, setSituacao] = useState<Situacao>(null);
  const ultimo = useRef('');
  const formRef = useRef<HTMLFormElement | null>(null);

  async function buscar(valor: string, el: HTMLInputElement, forcar = false) {
    const d = valor.replace(/\D/g, '');
    if (d.length !== 14) { if (!d.length) setSituacao(null); return; }
    if (d === ultimo.current && !forcar) return;
    ultimo.current = d;
    formRef.current = el.form;
    setSituacao({ tipo: 'buscando', texto: 'Buscando os dados deste CNPJ…' });
    try {
      const dados = await buscarCnpj(d);
      if (ultimo.current !== d) return; // a pessoa já trocou o número
      const extra = aoAchar(dados, formRef.current);
      const nome = dados.nomeFantasia && dados.nomeFantasia.toLowerCase() !== dados.razaoSocial.toLowerCase() ? `${dados.razaoSocial} (${dados.nomeFantasia})` : dados.razaoSocial;
      if (dados.situacao && dados.situacao !== 'ATIVA') {
        setSituacao({ tipo: 'aviso', texto: `Achamos ${nome}, mas na Receita a situação está "${dados.situacao.toLowerCase()}". Confira com a empresa.` });
      } else {
        setSituacao({ tipo: 'ok', texto: `Achamos ${nome}. ${extra || 'Os dados foram preenchidos, confira antes de salvar.'}` });
      }
    } catch (e) {
      if (ultimo.current !== d) return;
      ultimo.current = ''; // deixa tentar de novo ao sair do campo
      setSituacao({ tipo: e instanceof BuscaNaoAchou ? 'aviso' : 'erro', texto: (e as Error).message });
    }
  }

  return (
    <div className={className}>
      <Campo id={id} name={name} rotulo={rotulo} inputMode="numeric" icone="lupa" autoComplete="off" placeholder="00.000.000/0000-00"
        dica={situacao ? undefined : 'Digite o CNPJ e o sistema busca nome e endereço sozinho.'}
        {...input}
        onChange={(e) => { onChange?.(e); buscar(e.target.value, e.target); }}
        onBlur={(e) => { onBlur?.(e); buscar(e.target.value, e.target); }} />
      <Linha s={situacao} />
    </div>
  );
}

// Endereço com CEP: ao digitar o CEP, rua, bairro e cidade entram sozinhos; falta só o número.
// O endereço completo continua num campo só (o que vai para os documentos) e dá para corrigir à mão.
export function CampoEndereco({
  id, name, rotulo = 'Endereço da empresa', defaultValue, className,
}: { id: string; name: string; rotulo?: string; defaultValue?: string; className?: string }) {
  const [situacao, setSituacao] = useState<Situacao>(null);
  const partes = useRef<EnderecoCep | null>(null);
  const montado = useRef(''); // o último endereço que o próprio sistema escreveu
  const buscando = useRef('');
  const cepAtual = useRef('');
  const formRef = useRef<HTMLFormElement | null>(null);

  function escrever(numero: string) {
    if (!partes.current) return;
    const campo = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
    // Se a pessoa mexeu no endereço depois, não passa por cima.
    if (campo && campo.value.trim() && montado.current && campo.value !== montado.current) return;
    montado.current = montarEndereco({ ...partes.current, numero });
    escreverNoCampo(formRef.current, name, montado.current);
  }

  async function aoMudarCep(el: HTMLInputElement) {
    formRef.current = el.form;
    const d = el.value.replace(/\D/g, '');
    cepAtual.current = d;
    if (d.length !== 8 || d === buscando.current) return;
    const campo = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
    // Já escrito no endereço (por exemplo, veio do CNPJ): não busca de novo.
    if (campo?.value.includes(formatarCep(d))) return;
    buscando.current = d;
    setSituacao({ tipo: 'buscando', texto: 'Buscando o endereço…' });
    try {
      const e = await buscarCep(d);
      if (cepAtual.current !== d) return;
      partes.current = e;
      montado.current = ''; // endereço novo: pode escrever
      const numero = (formRef.current?.elements.namedItem(`${name}Numero`) as HTMLInputElement | null)?.value ?? '';
      escrever(numero);
      setSituacao({ tipo: 'ok', texto: e.logradouro ? 'Endereço encontrado. Coloque o número.' : 'Achamos a cidade. Este CEP é geral: escreva a rua e o número.' });
    } catch (err) {
      setSituacao({ tipo: err instanceof BuscaNaoAchou ? 'aviso' : 'erro', texto: (err as Error).message });
    } finally {
      buscando.current = '';
    }
  }

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)] gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,8rem)_1fr] ${className ?? ''}`}>
      <div>
        <Campo id={`${id}-cep`} name={`${name}Cep`} rotulo="CEP" inputMode="numeric" icone="lupa" placeholder="00000-000" maxLength={9} autoComplete="postal-code"
          onChange={(e) => { const v = formatarCep(e.target.value); if (v !== e.target.value) e.target.value = v; aoMudarCep(e.target); }} />
      </div>
      <Campo id={`${id}-numero`} name={`${name}Numero`} rotulo="Número" placeholder="Ex.: 120" autoComplete="off"
        onChange={(e) => { formRef.current = e.target.form; escrever(e.target.value); }} />
      <Campo id={id} name={name} rotulo={rotulo} defaultValue={defaultValue} placeholder="Rua, número, bairro, cidade/UF, CEP" autoComplete="street-address"
        className="col-span-2 sm:col-span-3" />
      <div className="col-span-2 -mt-2 sm:col-span-3">
        <Linha s={situacao} />
        {!situacao && <p className="mt-1.5 text-xs text-text/60">Digite o CEP e o endereço aparece sozinho. Se preferir, escreva direto no endereço.</p>}
      </div>
    </div>
  );
}

// Preenche os campos de uma tela com os dados do CNPJ. Por padrão só os que estão vazios,
// para não apagar o que a pessoa já escreveu.
export function preencherComCnpj(form: HTMLFormElement | null, campos: Partial<Record<string, string>>, soSeVazio = true) {
  let n = 0;
  const escritos = new Set<string>();
  for (const [nome, valor] of Object.entries(campos)) {
    // CEP e número só acompanham o endereço: se o endereço já estava escrito, não mexe neles
    // (senão a busca do CEP trocaria o endereço que a pessoa já tinha).
    const doEndereco = /^(.+)(Cep|Numero)$/.exec(nome)?.[1];
    if (doEndereco && doEndereco in campos && !escritos.has(doEndereco)) continue;
    if (valor && escreverNoCampo(form, nome, valor, soSeVazio)) { escritos.add(nome); if (!doEndereco) n++; }
  }
  return n;
}

// Para empresa já cadastrada: um botão que busca o CNPJ dela e completa só os campos vazios.
export function CompletarPeloCnpj({ cnpj, campos, className }: {
  cnpj: string; campos: (d: DadosCnpj) => Partial<Record<string, string>>; className?: string;
}) {
  const [situacao, setSituacao] = useState<Situacao>(null);
  if (cnpj.replace(/\D/g, '').length !== 14) return null;
  return (
    <div className={className}>
      <button type="button" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
        disabled={situacao?.tipo === 'buscando'}
        onClick={async (ev) => {
          const form = ev.currentTarget.form;
          setSituacao({ tipo: 'buscando', texto: 'Buscando os dados do CNPJ…' });
          try {
            const d = await buscarCnpj(cnpj);
            const n = preencherComCnpj(form, campos(d));
            const alerta = d.situacao && d.situacao !== 'ATIVA' ? ` Atenção: na Receita a situação está "${d.situacao.toLowerCase()}".` : '';
            setSituacao({ tipo: alerta ? 'aviso' : 'ok', texto: (n ? `Preenchemos ${n} campo${n > 1 ? 's' : ''} que estava${n > 1 ? 'm' : ''} vazio${n > 1 ? 's' : ''}. Confira e salve.` : 'Os campos já estavam preenchidos, nada foi trocado.') + alerta });
          } catch (e) {
            setSituacao({ tipo: e instanceof BuscaNaoAchou ? 'aviso' : 'erro', texto: (e as Error).message });
          }
        }}>
        Completar com os dados do CNPJ
      </button>
      <Linha s={situacao} />
    </div>
  );
}
