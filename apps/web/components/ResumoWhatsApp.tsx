'use client';

import { useState } from 'react';

// "Mandar resumo": um toque e o resumo do que foi feito vai para o WhatsApp do cliente.
// No celular que permite, vai junto o PDF (pelo botão de compartilhar do próprio aparelho).
// No computador, ou se o aparelho não deixar anexar, abre o WhatsApp com o texto pronto.
export function ResumoWhatsApp({ texto, pdf, nomeArquivo }: { texto: string; pdf?: () => Promise<Blob>; nomeArquivo?: string }) {
  const [ocupado, setOcupado] = useState(false);

  async function mandar() {
    setOcupado(true);
    try {
      if (pdf && nomeArquivo && typeof navigator !== 'undefined' && 'canShare' in navigator) {
        const arquivo = new File([await pdf()], nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo], text: texto });
          return;
        }
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    } catch (e) {
      // Fechar a janela de compartilhar não é erro. Qualquer outro problema: manda só o texto.
      if ((e as Error).name !== 'AbortError') window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button type="button" onClick={mandar} disabled={ocupado}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-card border border-[#25D366] px-4 text-sm font-semibold text-[#128C7E] hover:bg-[#25D366]/10 disabled:opacity-60">
      <span aria-hidden="true">💬</span>{ocupado ? 'Preparando…' : 'Mandar resumo'}
    </button>
  );
}

// Textos prontos, curtos e com cara de gente.
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const diaHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const resumoDds = (empresa: string, d: { data: string; tema: string; local?: string | null; ministrante: string; participantes: unknown[]; duracaoMin: number }) =>
  `Olá! Segue o resumo do DDS de ${dia(d.data)} na ${empresa}.\n\n` +
  `Tema: ${d.tema}\n${d.local ? `Local: ${d.local}\n` : ''}Conduzido por: ${d.ministrante}\n` +
  `Participantes: ${d.participantes.length}\nDuração: ${d.duracaoMin} min\n\nA lista de presença está em anexo (ou com a gente, se não veio junto).`;

export const resumoPt = (empresa: string, p: { numero: number; tipoNome: string; atividade: string; local: string; inicio: string; fim: string; emitente: string; encerradaEm?: string | null }) =>
  `Olá! Permissão de trabalho nº ${p.numero} na ${empresa}.\n\n` +
  `Trabalho: ${p.tipoNome}\nAtividade: ${p.atividade}\nLocal: ${p.local}\nVálida de ${diaHora(p.inicio)} até ${diaHora(p.fim)}\nLiberada por: ${p.emitente}\n` +
  `${p.encerradaEm ? `Encerrada em ${diaHora(p.encerradaEm)}.` : 'Ainda em andamento.'}`;

export const resumoInspecao = (empresa: string, i: { titulo: string; data: string; local?: string | null; resumo: { conformes?: number; naoConformes: number } }) =>
  `Olá! Segue o resumo da inspeção "${i.titulo}" de ${dia(i.data)} na ${empresa}.\n\n` +
  `${i.local ? `Local: ${i.local}\n` : ''}${i.resumo.conformes !== undefined ? `Itens em ordem: ${i.resumo.conformes}\n` : ''}` +
  `Itens com problema: ${i.resumo.naoConformes}\n\n` +
  `${i.resumo.naoConformes ? 'Os problemas já vão para o plano de ação, com prazo e responsável.' : 'Tudo certo nesta inspeção.'} O relatório completo está em anexo.`;
