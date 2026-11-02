import { documentoHtml, escape, Moldura } from '../documentos/layout';

export type Pessoa = { nome: string; cargo: string };
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const dataHora = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const assinatura = (nome: string, papel: string) => `<div class="assinatura">${escape(nome)}<span>${escape(papel)}</span></div>`;

// Lista de pessoas com coluna para assinatura: serve de ciência (APR/PT) e de presença (DDS).
function listaAssinaturas(pessoas: Pessoa[], vazio: string) {
  if (!pessoas.length) return `<p>${vazio}</p>`;
  return `<table>
    <thead><tr><th style="width:30px">Nº</th><th>Nome</th><th>Função</th><th style="width:35%">Assinatura</th></tr></thead>
    <tbody>${pessoas.map((p, i) => `<tr><td>${i + 1}</td><td>${escape(p.nome)}</td><td>${escape(p.cargo)}</td><td style="height:22px"></td></tr>`).join('')}</tbody>
  </table>`;
}

export type EtapaApr = { etapa: string; riscos: string; medidas: string; epis?: string };

export function aprHtml(moldura: Moldura, apr: { atividade: string; local: string; data: Date; responsavel: string; etapas: EtapaApr[] }, equipe: Pessoa[]) {
  const quebra = (t: string) => escape(t).replace(/\n/g, '<br>');
  return documentoHtml(
    moldura,
    `
    <section>
      <h2>Atividade</h2>
      <p><strong>${escape(apr.atividade)}</strong> · ${escape(apr.local)} · ${data(apr.data)}</p>
    </section>
    <section>
      <h2>Etapas, riscos e medidas de controle</h2>
      <table>
        <thead><tr><th style="width:30px">Nº</th><th>Etapa</th><th>Riscos</th><th>Medidas de controle</th><th>EPIs</th></tr></thead>
        <tbody>${apr.etapas
          .map((e, i) => `<tr><td>${i + 1}</td><td>${quebra(e.etapa)}</td><td>${quebra(e.riscos)}</td><td>${quebra(e.medidas)}</td><td>${quebra(e.epis ?? '')}</td></tr>`)
          .join('')}</tbody>
      </table>
    </section>
    <section>
      <h2>Ciência da equipe</h2>
      <p class="meta">Declaramos que participamos desta análise e conhecemos os riscos e as medidas de controle da atividade.</p>
      ${listaAssinaturas(equipe, 'Nenhum integrante da equipe registrado.')}
    </section>
    <div class="assinaturas">${assinatura(apr.responsavel, 'Responsável pela APR')}</div>`,
  );
}

export function permissaoHtml(
  moldura: Moldura,
  pt: { tipoNome: string; norma: string; atividade: string; local: string; inicio: Date; fim: Date; emitente: string; aprNumero: number | null; encerradaEm: Date | null },
  checklist: { item: string; ok: boolean }[],
  executantes: Pessoa[],
) {
  return documentoHtml(
    moldura,
    `
    <section>
      <h2>${escape(pt.tipoNome)} <span class="meta">${escape(pt.norma)}</span></h2>
      <p><strong>Atividade:</strong> ${escape(pt.atividade)} · <strong>Local:</strong> ${escape(pt.local)}</p>
      <p><strong>Válida de</strong> ${dataHora(pt.inicio)} <strong>até</strong> ${dataHora(pt.fim)}
      ${pt.aprNumero ? ` · <strong>APR vinculada:</strong> nº ${pt.aprNumero}` : ''}</p>
    </section>
    <section>
      <h2>Verificações antes de liberar</h2>
      <table>
        <thead><tr><th>Item</th><th class="c" style="width:60px">Sim</th><th class="c" style="width:60px">Não</th></tr></thead>
        <tbody>${checklist.map((c) => `<tr><td>${escape(c.item)}</td><td class="c">${c.ok ? '●' : ''}</td><td class="c">${c.ok ? '' : '●'}</td></tr>`).join('')}</tbody>
      </table>
      ${checklist.some((c) => !c.ok) ? '<p class="alerta">Há itens marcados como "não". Só libere o trabalho depois de resolvê-los.</p>' : ''}
    </section>
    <section>
      <h2>Executantes</h2>
      ${listaAssinaturas(executantes, 'Nenhum executante registrado.')}
    </section>
    <div class="assinaturas">
      ${assinatura(pt.emitente, 'Emitente da permissão')}
      ${assinatura('', 'Responsável pela área')}
    </div>
    <section class="encerramento">
      <h2>Encerramento</h2>
      <p>${pt.encerradaEm ? `Permissão encerrada em ${dataHora(pt.encerradaEm)}.` : 'Encerrada em ___/___/______ às ____:____. Área liberada, limpa e sem pendências.'}</p>
      <div class="assinaturas">${assinatura('', 'Responsável pelo encerramento')}</div>
    </section>`,
    '.c { text-align: center; } .alerta { color: #EF4444; font-weight: 600; } .encerramento { margin-top: 24px; }',
  );
}

export function ddsHtml(moldura: Moldura, dds: { tema: string; conteudo: string; data: Date; duracaoMin: number; ministrante: string }, participantes: Pessoa[]) {
  return documentoHtml(
    moldura,
    `
    <section>
      <h2>${escape(dds.tema)}</h2>
      <p class="meta">${data(dds.data)} · ${dds.duracaoMin} minutos · ministrado por ${escape(dds.ministrante)}</p>
      <p class="conteudo">${escape(dds.conteudo).replace(/\n/g, '<br>')}</p>
    </section>
    <section>
      <h2>Lista de presença</h2>
      ${listaAssinaturas(participantes, 'Nenhum participante registrado.')}
    </section>
    <div class="assinaturas">${assinatura(dds.ministrante, 'Ministrante')}</div>`,
    '.conteudo { font-size: 13px; line-height: 1.6; }',
  );
}
