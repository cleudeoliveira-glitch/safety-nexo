import type { Metadata, Viewport } from 'next';
import { Moldura } from '@/components/Moldura';
import { RegistrarSw } from '@/components/RegistrarSw';
import { VigiaErros } from '@/components/VigiaErros';
import { PreviaDocumento } from '@/components/PreviaDocumento';
import { AvisoMotorLento } from '@/components/AvisoMotorLento';
import './globals.css';

export const metadata: Metadata = {
  title: 'Safety Nexo',
  description: 'Gestão inteligente de SST para consultorias e empresas.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icone-192.png', apple: '/icone-192.png' },
  // O sistema já é em português do Brasil: sem isso, o Chrome configurado em português de Portugal oferece
  // "traduzir" a página, e a tradução automática mexe nos textos e pode até travar a tela.
  other: { google: 'notranslate' },
};

export const viewport: Viewport = { themeColor: '#0E4A5B' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" translate="no">
      <body className="min-h-screen bg-background font-sans text-text antialiased">
        <RegistrarSw />
        <VigiaErros />
        <Moldura>{children}</Moldura>
        <PreviaDocumento />
        <AvisoMotorLento />
      </body>
    </html>
  );
}
