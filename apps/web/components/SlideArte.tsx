// Arte dos slides de treinamento: ícones de SST desenhados aqui mesmo (sem imagem de terceiros)
// e a figurinha do trabalhador que aparece na capa e no fechamento.
// Tudo em SVG, então pesa pouco, fica nítido na TV e abre sem internet.

const desenhos = {
  capacete: 'M2.5 17.5h19v2.5h-19zM4.5 17.5a7.5 7.5 0 0 1 15 0M10 10.5V5.8a2 2 0 0 1 4 0v4.7',
  escada: 'M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10',
  mosquetao: 'M9 3h4a5 5 0 0 1 5 5v8a5 5 0 0 1-10 0v-3M8 13l2-2M8 13 6 11M12 8v8',
  raio: 'M13 2 4 14h7l-1 8 9-12h-7z',
  engrenagem: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  fogo: 'M12 21a6 6 0 0 0 6-6c0-4-3-6-3-9-2 1-3 3-3 5-1-1-2-2-2-4-2 2-4 5-4 8a6 6 0 0 0 6 6z',
  extintor: 'M9 8h6v13H9zM10.5 8V5h3v3M13.5 5H17l2-2M9 12h6',
  saida: 'M4 21V3h9v18M13 12h8M18 9l3 3-3 3M9.5 12v.01',
  luva: 'M7 21v-7.5l-2.2-3.2a1.5 1.5 0 0 1 2.5-1.7L9 10.5V4.5a1.5 1.5 0 0 1 3 0V10V3.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v9a7 7 0 0 1-2.5 5.4V21z',
  oculos: 'M2.5 10h19M5 10v3a3 3 0 0 0 6 0v-1h2v1a3 3 0 0 0 6 0v-3',
  abafador: 'M5 14a7 7 0 0 1 14 0M3 13h4v7H3zM17 13h4v7h-4z',
  mascara: 'M4 9.5c3-3 13-3 16 0v4.5c-3 4.5-13 4.5-16 0zM9 13h.01M15 13h.01M12 11.5v5',
  frasco: 'M9 3h6M10 3v6L4 19a1.4 1.4 0 0 0 1.2 2h13.6A1.4 1.4 0 0 0 20 19l-6-10V3M7 15h10',
  caveira: 'M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3zM9 12h.01M15 12h.01M10.5 21v-2.5M13.5 21v-2.5',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
  tempestade: 'M7 16h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7a4.5 4.5 0 0 0 1 9M13 13l-2 4h3l-2 4',
  cobra: 'M4 20c3.5 0 4-4 8-4s4.5 4 8 4M7 16c0-4 9-2.5 9-8a3 3 0 0 0-6 0M13 7.5h.01',
  cruz: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  coracao: 'M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.4 12 20 12 20zM6 12h3l1.5-2.5 2 5 1.5-2.5H18',
  cadeado: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  etiqueta: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  alerta: 'M12 3 2 20h20zM12 10v4M12 17.5v.01',
  pessoas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  lampada: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  prancheta: 'M8.5 3.5h7v3h-7zM6.5 5H5v16h14V5h-1.5M9 12l2 2 4-4M9 17h6',
  telefone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  empilhadeira: 'M3 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0M10 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0M3 16V9h6l3 5v2M9 9V5H5v4M16 3v15h5',
  guindaste: 'M3 21h18M6 21V4h2.5v17M8.5 4H21M18 4v6M16.8 10h2.4v2.4h-2.4zM6 8l4-4',
  tanque: 'M5 7c0-2.5 14-2.5 14 0v11c0 2.5-14 2.5-14 0zM5 7c0 2.5 14 2.5 14 0M5 12.5c0 2.5 14 2.5 14 0',
  lixo: 'M4 7h16M10 3h4M6 7l1 14h10l1-14M10 11v6M14 11v6',
  folha: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7',
  faca: 'M3 21l8.5-8.5M11.5 12.5l7-7.5c1.5-1.5 3.2 0 1.8 1.6L14 14M9.5 15.5l2 2',
  seringa: 'M18 2l4 4M20 4l-8.5 8.5M14 6.5l3.5 3.5M9.5 9.5l5 5-5 5H7v-2.5l-3-3zM2.5 21.5l4-4',
  floco: 'M12 2v20M3.5 7l17 10M3.5 17l17-10M9 4l3 2 3-2M9 20l3-2 3 2',
  pessoa: 'M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 11l7-2 7 2M12 9v6M8.5 22l3.5-7 3.5 7',
  caixa: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  computador: 'M3 4h18v12H3zM8 20h8M12 16v4',
  megafone: 'M3 10v4h3l7 4V6l-7 4zM16 9a3 3 0 0 1 0 6M19 7a6 6 0 0 1 0 10',
  escudo: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  proibido: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
  livro: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  detector: 'M7 3h10v18H7zM9.5 6h5v5h-5zM10 15h.01M14 15h.01M10 18h4',
  gota: 'M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z',
  documento: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  fala: 'M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5',
  lupa: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  aperto: 'M3 11l4-4 5 3 5-3 4 4-9 8zM9 13l2 2M12 12l2 2',
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  sirene: 'M6 18v-6a6 6 0 0 1 12 0v6M4 18h16v3H4zM12 3v2M4 7l1.5 1M20 7l-1.5 1M10 12a2 2 0 0 1 2-2',
  vento: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  ambulancia: 'M2 16V7h11v9M13 10h4l4 4v2h-8M6 18a2 2 0 1 0 0-.01M17 18a2 2 0 1 0 0-.01M7.5 9v4M5.5 11h4',
  termometro: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 10v6',
  predio: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3',
  bandeira: 'M5 21V4M5 4h12l-2.5 4 2.5 4H5',
  calendario: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2',
  cerebro: 'M12 5a3 3 0 0 0-5.6-1.5A3 3 0 0 0 4 8a3 3 0 0 0 0 6 3 3 0 0 0 3 4 3 3 0 0 0 5 1M12 5a3 3 0 0 1 5.6-1.5A3 3 0 0 1 20 8a3 3 0 0 1 0 6 3 3 0 0 1-3 4 3 3 0 0 1-5 1M12 5v14',
  bota: 'M7 3h5v9l7 3.5V20H4v-3l3-1zM4 18h15',
  ouvido: 'M7 9a5 5 0 0 1 10 0c0 3-3 3.5-3 6.5a2.5 2.5 0 0 1-5 .5M10 9.5a2 2 0 0 1 4 0',
  martelo: 'M14 4l6 6-2 2-6-6zM12 6 4 14l3 3 8-8M4 20l3-3',
  torneira: 'M4 8h9a3 3 0 0 1 3 3v2M8 5v3M5 5h6M16 17v.01M16 20v.01',
} as const;

export type IconeSlide = keyof typeof desenhos;

export function IconeSlide({ nome, className = 'h-6 w-6' }: { nome: IconeSlide; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={desenhos[nome] ?? desenhos.escudo} />
    </svg>
  );
}

// Selo redondo com o ícone do tema, com brilho verde-menta e pontinhos: vira a "figurinha" de cada slide.
export function SeloTema({ nome, claro = false, className = '' }: { nome: IconeSlide; claro?: boolean; className?: string }) {
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden="true">
      <div className={`absolute inset-0 rounded-full ${claro ? 'bg-white/10' : 'bg-success/10'}`} />
      <div className={`absolute inset-[12%] rounded-full ${claro ? 'bg-white/15' : 'bg-success/15'}`} />
      <div className={`absolute inset-[24%] flex items-center justify-center rounded-full shadow-lg ${claro ? 'bg-white text-primary' : 'bg-primary text-menta'}`}>
        <IconeSlide nome={nome} className="h-1/2 w-1/2" />
      </div>
      <span className="absolute left-[6%] top-[18%] h-[7%] w-[7%] rounded-full bg-menta" />
      <span className="absolute bottom-[10%] right-[12%] h-[5%] w-[5%] rounded-full bg-warning" />
      <span className="absolute right-[2%] top-[40%] h-[4%] w-[4%] rounded-full bg-success" />
    </div>
  );
}

// Figurinha do trabalhador: capacete amarelo, colete com faixa refletiva. "joia" mostra o polegar para cima (fechamento).
export function Trabalhador({ joia = false, className = '' }: { joia?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 210" className={className} aria-hidden="true">
      <circle cx="100" cy="108" r="96" fill="#6CF0C2" opacity="0.22" />
      <circle cx="100" cy="108" r="74" fill="#6CF0C2" opacity="0.25" />
      {/* corpo e colete */}
      <path d="M34 210c0-40 26-66 66-66s66 26 66 66z" fill="#0E4A5B" />
      <path d="M58 210v-50c10-10 24-16 42-16s32 6 42 16v50z" fill="#FF8C69" />
      <path d="M58 182h84v9H58z" fill="#F8F9FB" opacity="0.9" />
      <path d="M95 146h10v64H95z" fill="#E0704F" />
      <path d="M84 144l16 18 16-18" fill="none" stroke="#F8F9FB" strokeWidth="5" strokeLinejoin="round" />
      {/* pescoço e rosto */}
      <path d="M88 126h24v22H88z" fill="#B97A50" />
      <ellipse cx="100" cy="104" rx="31" ry="34" fill="#C98B5E" />
      <ellipse cx="69" cy="108" rx="6" ry="8" fill="#B97A50" />
      <ellipse cx="131" cy="108" rx="6" ry="8" fill="#B97A50" />
      <circle cx="89" cy="106" r="3.6" fill="#1F2937" />
      <circle cx="111" cy="106" r="3.6" fill="#1F2937" />
      <path d="M84 97q5-4 10 0M106 97q5-4 10 0" stroke="#1F2937" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M88 120q12 10 24 0" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="80" cy="116" r="4.5" fill="#E0704F" opacity="0.35" />
      <circle cx="120" cy="116" r="4.5" fill="#E0704F" opacity="0.35" />
      {/* capacete */}
      <path d="M64 90c0-26 16-42 36-42s36 16 36 42z" fill="#F5B83D" />
      <path d="M92 48.5h16v41H92z" fill="#E9A520" />
      <path d="M56 86h88a5 5 0 0 1 0 10H56a5 5 0 0 1 0-10z" fill="#E9A520" />
      <path d="M76 66q6-10 14-13" stroke="#FFF3D1" strokeWidth="4" fill="none" strokeLinecap="round" />
      {joia && (
        <g>
          <circle cx="160" cy="150" r="24" fill="#10B981" />
          <path d="M150 152h5v12h-5zM155 163h12a3 3 0 0 0 3-2.5l2-9a3 3 0 0 0-3-3.5h-7l1-6a3 3 0 0 0-5.5-1.5L155 151" fill="#fff" />
        </g>
      )}
    </svg>
  );
}
