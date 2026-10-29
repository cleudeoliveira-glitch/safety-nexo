'use client';

import { CampoAjuda, Ajuda } from './CampoAjuda';

export function Cartao({ titulo, children, id, acao }: { titulo: string; children: React.ReactNode; id?: string; acao?: React.ReactNode }) {
  return (
    <section id={id} className="rounded-card border border-border bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

type CampoProps = React.InputHTMLAttributes<HTMLInputElement> & { id: string; rotulo: string; ajuda?: Ajuda; dica?: string };

export function Campo({ id, rotulo, ajuda, dica, className, ...input }: CampoProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {rotulo}
        {ajuda && <CampoAjuda titulo={rotulo} ajuda={ajuda} />}
      </label>
      <input id={id} className="w-full rounded-card border border-border bg-background px-3.5 py-2.5" {...input} />
      {dica && <p className="mt-1 text-xs text-text/60">{dica}</p>}
    </div>
  );
}

type SelecaoProps = React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; rotulo: string; ajuda?: Ajuda };

export function Selecao({ id, rotulo, ajuda, className, children, ...select }: SelecaoProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {rotulo}
        {ajuda && <CampoAjuda titulo={rotulo} ajuda={ajuda} />}
      </label>
      <select id={id} className="w-full rounded-card border border-border bg-background px-3.5 py-2.5" {...select}>
        {children}
      </select>
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
  const cor = tipo === 'erro' ? 'border-danger text-danger' : tipo === 'ok' ? 'border-success text-success' : 'border-border text-text/70';
  return <p className={`rounded-card border bg-white px-4 py-3 text-sm ${cor}`}>{children}</p>;
}
