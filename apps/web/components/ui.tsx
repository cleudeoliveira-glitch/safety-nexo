'use client';

import { useEffect, useRef, useState } from 'react';
import { CampoAjuda, Ajuda } from './CampoAjuda';
import { Icone, NomeIcone } from './Icone';
import { ajudaDoCampo } from '@/lib/ajudaCampos';
import { VOLTOU_PARA_CORRIGIR } from '@/lib/previa';
import { emPortugues } from '@/lib/erros-pt';

export function Cartao({ titulo, children, id, acao }: { titulo: string; children: React.ReactNode; id?: string; acao?: React.ReactNode }) {
  return (
    <section id={id} className="rounded-card border border-border bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

type CampoProps = React.InputHTMLAttributes<HTMLInputElement> & { id: string; rotulo: string; ajuda?: Ajuda; dica?: string; icone?: NomeIcone };

// Ícone que aparece dentro do campo, pelo tipo, quando a tela não escolhe um.
function iconePadrao(type?: string): NomeIcone {
  if (type === 'email') return 'envelope';
  if (type === 'password') return 'cadeado';
  if (type === 'tel') return 'telefone';
  if (type === 'date' || type === 'datetime-local' || type === 'month' || type === 'time') return 'calendario';
  if (type === 'number') return 'numero';
  if (type === 'search') return 'lupa';
  return 'caneta';
}

// O "?" usa a ajuda da tela, se houver; senão busca o mesmo texto da Base de Conhecimento (lib/ajudaCampos.ts).
export function Rotulo({ htmlFor, rotulo, ajuda }: { htmlFor: string; rotulo: string; ajuda?: Ajuda }) {
  const texto = ajuda ?? ajudaDoCampo(htmlFor, rotulo);
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[15px] font-semibold text-primary">
      {rotulo}
      {texto && <CampoAjuda titulo={rotulo} ajuda={texto} />}
    </label>
  );
}

// Escolher arquivo sempre em português do Brasil. O botão nativo do navegador segue a língua do computador
// (ex.: "Escolher ficheiro" no Chrome de Portugal, "Choose file" no inglês).
export function EscolherArquivo({ id, className, onChange, ...input }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [nome, setNome] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Quando o formulário é limpo (form.reset()), o nome mostrado também volta ao início.
    const form = ref.current?.form;
    if (!form) return;
    const limpar = () => setNome('');
    form.addEventListener('reset', limpar);
    return () => form.removeEventListener('reset', limpar);
  }, []);
  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-2 text-sm ${className ?? ''}`}>
      <input ref={ref} id={id} type="file" className="sr-only" {...input}
        onChange={(e) => { const f = e.target.files; setNome(f && f.length ? (f.length > 1 ? `${f.length} arquivos escolhidos` : f[0].name) : ''); onChange?.(e); }} />
      <button type="button" onClick={() => ref.current?.click()} disabled={input.disabled}
        className="rounded-card border border-primary/40 bg-white px-3 py-2 font-semibold text-primary hover:border-primary disabled:opacity-50">
        Escolher arquivo
      </button>
      <span className="min-w-0 truncate text-text/70">{nome || 'Nenhum arquivo escolhido'}</span>
    </span>
  );
}

// Campo de preencher no padrão do sistema: nome grande em cima, ícone do lado, borda forte e brilho verde ao clicar.
// Campo de senha ganha o olhinho para mostrar ou esconder o que foi digitado.
export function Campo({ id, rotulo, ajuda, dica, className, icone, type, ...input }: CampoProps) {
  const [mostrar, setMostrar] = useState(false);
  const senha = type === 'password';
  if (type === 'file') {
    return (
      <div className={className}>
        <Rotulo htmlFor={id} rotulo={rotulo} />
        <div className="rounded-card border-2 border-dashed border-primary/40 bg-white p-3"><EscolherArquivo id={id} {...input} /></div>
        {dica && <p className="mt-1 text-xs text-text/60">{dica}</p>}
      </div>
    );
  }
  return (
    <div className={className}>
      <Rotulo htmlFor={id} rotulo={rotulo} ajuda={ajuda} />
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/70">
          <Icone nome={icone ?? iconePadrao(type)} className="h-5 w-5" />
        </span>
        <input id={id} type={senha && mostrar ? 'text' : type} className={`campo-sn com-icone w-full ${senha ? 'com-olho' : ''}`} {...input} />
        {senha && (
          <button type="button" onClick={() => setMostrar((v) => !v)} aria-label={mostrar ? 'Esconder a senha' : 'Mostrar a senha'} title={mostrar ? 'Esconder a senha' : 'Mostrar a senha'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-primary/70 hover:bg-primary/10 hover:text-primary">
            <Icone nome={mostrar ? 'olhoFechado' : 'olho'} className="h-5 w-5" />
          </button>
        )}
      </div>
      {dica && <p className="mt-1 text-xs text-text/60">{dica}</p>}
      {/* No celular o exemplo comprido não cabe dentro do campo: aparece inteiro logo abaixo. */}
      {!dica && typeof input.placeholder === 'string' && input.placeholder.length > 30 && (
        <p className="mt-1 text-xs text-text/50 sm:hidden">{input.placeholder}</p>
      )}
    </div>
  );
}

type SelecaoProps = React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; rotulo: string; ajuda?: Ajuda };

export function Selecao({ id, rotulo, ajuda, className, children, onChange, ...select }: SelecaoProps) {
  // No celular a opção escolhida pode ser maior que a caixa: o texto inteiro aparece logo abaixo.
  const ref = useRef<HTMLSelectElement>(null);
  const [escolhida, setEscolhida] = useState('');
  useEffect(() => {
    const el = ref.current;
    const texto = el?.options[el.selectedIndex]?.text ?? '';
    if (texto !== escolhida) setEscolhida(texto);
  });
  return (
    <div className={className}>
      <Rotulo htmlFor={id} rotulo={rotulo} ajuda={ajuda} />
      <select id={id} ref={ref} className="campo-sn w-full" onChange={(e) => { setEscolhida(e.target.options[e.target.selectedIndex]?.text ?? ''); onChange?.(e); }} {...select}>
        {children}
      </select>
      {escolhida.length > 30 && <p className="mt-1 text-xs text-text/70 sm:hidden">{escolhida}</p>}
    </div>
  );
}

type AreaTextoProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; rotulo: string; ajuda?: Ajuda; dica?: string };

// Campo de texto que cresce com o que é escrito: no celular o texto inteiro fica à vista, sem cortar.
export function AreaTexto({ id, rotulo, ajuda, dica, className, onInput, rows = 2, ...area }: AreaTextoProps) {
  const crescer = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 4}px`;
  };
  return (
    <div className={className}>
      <Rotulo htmlFor={id} rotulo={rotulo} ajuda={ajuda} />
      <textarea id={id} rows={rows} ref={crescer} className="campo-sn block w-full resize-y leading-snug"
        onInput={(e) => { crescer(e.currentTarget); onInput?.(e); }} {...area} />
      {dica && <p className="mt-1 text-xs text-text/60">{dica}</p>}
    </div>
  );
}

// Card com número grande e cor clarinha: ok (verde), nao (vermelho), pendente (amarelo) e total (azul).
export type TomCard = 'ok' | 'nao' | 'pendente' | 'total';
const TONS: Record<TomCard, { fundo: string; texto: string; icone: NomeIcone }> = {
  ok: { fundo: 'card-ok', texto: 'text-[#15803D]', icone: 'check' },
  nao: { fundo: 'card-nao', texto: 'text-[#B91C1C]', icone: 'alerta' },
  pendente: { fundo: 'card-pendente', texto: 'text-[#B45309]', icone: 'relogio' },
  total: { fundo: 'card-total', texto: 'text-[#1D4ED8]', icone: 'grafico' },
};
export const classeCard = (tom: TomCard) => TONS[tom].fundo;

export function CardNumero({ tom, valor, rotulo, detalhe, icone, children }: { tom: TomCard; valor: React.ReactNode; rotulo: string; detalhe?: React.ReactNode; icone?: NomeIcone; children?: React.ReactNode }) {
  const t = TONS[tom];
  return (
    <div className={`rounded-xl p-4 ${t.fundo}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-text/60">{rotulo}</p>
        <span className={t.texto}><Icone nome={icone ?? t.icone} className="h-5 w-5" /></span>
      </div>
      <p className={`mt-1 text-3xl font-bold ${t.texto}`}>{valor}</p>
      {children}
      {detalhe && <p className="mt-1 text-sm text-text/70">{detalhe}</p>}
    </div>
  );
}

export function Botao({ variante = 'primario', className = '', ...botao }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' }) {
  const estilo =
    variante === 'primario'
      ? 'bg-primary text-white hover:opacity-90'
      : 'border border-border bg-white text-text hover:border-primary';
  return <button className={`rounded-card px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${estilo} ${className}`} {...botao} />;
}

export function Aviso({ tipo, children }: { tipo: 'erro' | 'ok' | 'info'; children: React.ReactNode }) {
  // Quem voltou da pré-visualização para corrigir não fez nada errado: não mostra como erro.
  if (children === VOLTOU_PARA_CORRIGIR) return null;
  const cor = tipo === 'erro' ? 'border-danger text-danger' : tipo === 'ok' ? 'border-success text-success' : 'border-border text-text/70';
  // Erro em texto passa pela troca de mensagens em inglês (navegador, código) por português.
  const texto = tipo === 'erro' && typeof children === 'string' ? emPortugues(children) : children;
  return <p className={`rounded-card border bg-white px-4 py-3 text-sm ${cor}`}>{texto}</p>;
}
