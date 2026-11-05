'use client';

import type { TemaDds } from '@/lib/api';

// O roteiro de um DDS vivencial, na ordem em que se conduz: contar o caso, falar, fazer a dinâmica, perguntar.
export function RoteiroDds({ tema, compacto = false }: { tema: TemaDds; compacto?: boolean }) {
  const partes = [
    { titulo: '1. Comece contando este caso', texto: tema.situacao, cor: 'border-warning/40 bg-warning/10' },
    { titulo: '2. O que falar', texto: tema.conteudo, cor: 'border-border bg-white' },
    { titulo: '3. Dinâmica vivencial (cerca de 3 minutos)', texto: tema.dinamica, cor: 'border-success/40 bg-success/10' },
    { titulo: '4. Pergunte para a equipe', texto: tema.pergunta, cor: 'border-primary/30 bg-primary/5' },
  ].filter((p) => p.texto);
  return (
    <div className={compacto ? 'space-y-2' : 'space-y-3'}>
      {partes.map((p) => (
        <div key={p.titulo} className={`rounded-card border p-4 ${p.cor}`}>
          <p className="text-sm font-bold text-primary">{p.titulo}</p>
          <p className="mt-1 text-[15px] leading-relaxed">{p.texto}</p>
        </div>
      ))}
    </div>
  );
}

// Texto que vai para o registro do DDS e para a lista de presença.
export function textoDoRoteiro(t: TemaDds): string {
  return [
    t.situacao && `Caso para contar: ${t.situacao}`,
    t.conteudo,
    t.dinamica && `Dinâmica vivencial: ${t.dinamica}`,
    `Para conversar com a equipe: ${t.pergunta}`,
  ].filter(Boolean).join('\n\n');
}
