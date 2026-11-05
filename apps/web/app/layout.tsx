import type { Metadata, Viewport } from 'next';
import { Moldura } from '@/components/Moldura';
import { RegistrarSw } from '@/components/RegistrarSw';
import './globals.css';

export const metadata: Metadata = {
  title: 'Safety Nexo',
  description: 'Segurança do trabalho sem complicação para consultorias SST.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icone-192.png', apple: '/icone-192.png' },
};

export const viewport: Viewport = { themeColor: '#0E4A5B' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans text-text antialiased">
        <RegistrarSw />
        <Moldura>{children}</Moldura>
      </body>
    </html>
  );
}
