import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Safety Nexo',
  description: 'Segurança do trabalho sem complicação para consultorias SST.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans text-text antialiased">{children}</body>
    </html>
  );
}
