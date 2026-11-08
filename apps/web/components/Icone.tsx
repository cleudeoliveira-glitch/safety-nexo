// Ícones de traço simples usados no menu e nos atalhos do painel.
const caminhos = {
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM6.5 6.5h1v1h-1zM16.5 6.5h1v1h-1zM6.5 16.5h1v1h-1z',
  check: 'M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11',
  lupa: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  sino: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  cracha: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 3v3h6V3M12 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 18a4 4 0 0 1 8 0',
  casa: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  cifrao: 'M12 2v20M17 6.5C16 5 14.3 4.5 12 4.5c-3 0-4.5 1.3-4.5 3.2 0 4.6 9.5 2.4 9.5 7.6 0 2-1.8 3.4-5 3.4-2.4 0-4.2-.7-5-2.3',
  predio: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3',
  alerta: 'M12 3 2 20h20zM12 10v4M12 17.5v.01',
  pessoas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  upload: 'M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4',
  brilho: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z',
  documento: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  coracao: 'M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.4 12 20 12 20z',
  cadeira: 'M6 3v9h11M6 12v9M17 12v9M6 16h11M17 3v9',
  cruz: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  calendario: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  pasta: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  cerebro: 'M12 5a3 3 0 0 0-5.6-1.5A3 3 0 0 0 4 8a3 3 0 0 0 0 6 3 3 0 0 0 3 4 3 3 0 0 0 5 1M12 5a3 3 0 0 1 5.6-1.5A3 3 0 0 1 20 8a3 3 0 0 1 0 6 3 3 0 0 1-3 4 3 3 0 0 1-5 1M12 5v14',
  escudo: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  chave: 'M14 4h6v6M20 4l-9 9M10 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5',
  fala: 'M4 5h16v11H9l-5 4z',
  lista: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  caixa: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  sinal: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.01M2 9a15 15 0 0 1 20 0',
  formatura: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
  votar: 'M4 12h16v8H4zM8 12V5h8v7M10 8l1.5 1.5L14 7',
  festa: 'M4 20l4-12 8 8zM14 3v2M19 5l-1.5 1.5M21 10h-2M16 8l-2 2',
  vassoura: 'M14 3l-4 9M7 12h8l2 9H5z',
  fogo: 'M12 21a6 6 0 0 0 6-6c0-4-3-6-3-9-2 1-3 3-3 5-1-1-2-2-2-4-2 2-4 5-4 8a6 6 0 0 0 6 6z',
  nuvem: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9zM12 11v5M10 14l2 2 2-2',
  grafico: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  porcento: 'M19 5 5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  aperto: 'M3 11l4-4 5 3 5-3 4 4-9 8zM12 10v0',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  caneta: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  livro: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  sair: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4',
  mais: 'M12 5v14M5 12h14',
  coroa: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  fechar: 'M6 6l12 12M18 6 6 18',
  seta: 'M9 6l6 6-6 6',
  interrogacao: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01',
  envelope: 'M3 6h18v12H3zM3 6l9 7 9-7',
  cadeado: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  telefone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  olhoFechado: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  numero: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  texto: 'M4 6h16M4 12h16M4 18h10',
} as const;

export type NomeIcone = keyof typeof caminhos;

export function Icone({ nome, className = 'h-5 w-5' }: { nome: NomeIcone; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={caminhos[nome]} />
    </svg>
  );
}
