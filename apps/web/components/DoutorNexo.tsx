// Ícone do Diagnóstico: o "Doutor Nexo", médico com estetoscópio, cruz no gorro e linha de batimento, com borda dourada (premium).
export function DoutorNexo({ tamanho = 28, batimento = false, className = '' }: { tamanho?: number; batimento?: boolean; className?: string }) {
  const id = `ouro-${tamanho}-${batimento ? 1 : 0}`;
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" className={className} role="img" aria-label="Doutor Nexo">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#d4a017" />
          <stop offset="0.5" stopColor="#f8e08e" />
          <stop offset="1" stopColor="#c99212" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22.5" fill="#0B3B49" stroke={`url(#${id})`} strokeWidth="2.5" />
      <circle cx="24" cy="17" r="7" fill="#fff" />
      <path d="M10 40c1-8 7-12 14-12s13 4 14 12" fill="#fff" />
      <path d="M18 29v5a4 4 0 0 0 8 0" stroke="#0E4A5B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M31 30.5V29" stroke="#0E4A5B" strokeWidth="2" />
      <circle cx="31" cy="33" r="2.4" fill="#10B981" />
      <rect x="21.5" y="11" width="5" height="1.6" fill="#EF4444" />
      <rect x="23.2" y="9.3" width="1.6" height="5" fill="#EF4444" />
      {batimento && <path d="M5 24h5l2-4 3 8 2-4h3" stroke="#6CF0C2" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
