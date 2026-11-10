import { documentoHtml, escape, Moldura } from '../documentos/layout';

export type AssinaturaToque = { imagem: string; assinadoEm: Date; testemunha: string | null };
export type Pessoa = { nome: string; cargo: string; rosto?: string | null; toque?: AssinaturaToque | null; faltou?: boolean };
const hora = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
// Célula de assinatura: X ou assinatura feita na tela, rosto, falta ou espaço para assinar à mão.
export const NOTA_TOQUE = '<p class="meta">Cada trabalhador assinou na tela, com o próprio dedo. A foto, a data, a hora, o local e um código de conferência de cada assinatura ficam guardados no Safety Nexo. Se a consultoria tiver certificado digital, este PDF já sai assinado com ICP-Brasil.</p>';
export function celulaAssinatura(p: Pessoa) {
  if (p.toque) return `<img src="${p.toque.imagem}" alt="Assinatura" style="height:34px;max-width:180px"/><br><small>${hora(p.toque.assinadoEm)}${p.toque.testemunha ? ` · a rogo, testemunha: ${escape(p.toque.testemunha)}` : ''}</small>`;
  if (p.rosto) return `<small>Reconhecimento facial · ${escape(p.rosto)}</small>`;
  if (p.faltou) return '<strong style="color:#b91c1c">Faltou</strong>';
  return '';
}
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const dataHora = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const assinatura = (nome: string, papel: string) => `<div class="assinatura">${escape(nome)}<span>${escape(papel)}</span></div>`;

// Lista de pessoas com coluna para assinatura: serve de ciência (APR/PT) e de presença (DDS).
function listaAssinaturas(pessoas: Pessoa[], vazio: string) {
  if (!pessoas.length) return `<p>${vazio}</p>`;
  return `<table>
    <thead><tr><th style="width:30px">Nº</th><th>Nome</th><th>Função</th><th style="width:35%">Assinatura</th></tr></thead>
    <tbody>${pessoas.map((p, i) => `<tr><td>${i + 1}</td><td>${escape(p.nome)}</td><td>${escape(p.cargo)}</td><td style="height:22px">${celulaAssinatura(p)}</td></tr>`).join('')}</tbody>
  </table>${pessoas.some((p) => p.toque) ? NOTA_TOQUE : ''}`;
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

export type MedicaoGas = { hora: string; oxigenio: number; lie: number; h2s: number | null; co: number | null; outro: string | null; responsavel: string };

// Faixas usadas na liberação: oxigênio entre 19,5% e 23%, inflamáveis abaixo de 10% do LIE,
// H2S até 8 ppm e CO até 39 ppm (limites da NR-15 para 48 h semanais).
const foraDaFaixa = (m: MedicaoGas) => ({
  oxigenio: m.oxigenio < 19.5 || m.oxigenio > 23,
  lie: m.lie >= 10,
  h2s: m.h2s !== null && m.h2s > 8,
  co: m.co !== null && m.co > 39,
});
const num = (v: number | null, alerta: boolean) => (v === null ? '—' : `<span${alerta ? ' class="alerta"' : ''}>${v.toLocaleString('pt-BR')}</span>`);

function medicoesHtml(medicoes: MedicaoGas[]) {
  const linhas = medicoes.length
    ? medicoes.map((m) => {
        const f = foraDaFaixa(m);
        return `<tr><td>${dataHora(new Date(m.hora))}</td><td class="c">${num(m.oxigenio, f.oxigenio)}</td><td class="c">${num(m.lie, f.lie)}</td><td class="c">${num(m.h2s, f.h2s)}</td><td class="c">${num(m.co, f.co)}</td><td>${escape(m.outro ?? '')}</td><td>${escape(m.responsavel)}</td></tr>`;
      }).join('')
    : Array.from({ length: 4 }, () => '<tr><td style="height:22px"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
  const algumaFora = medicoes.some((m) => Object.values(foraDaFaixa(m)).some(Boolean));
  return `<section>
      <h2>Medição da atmosfera</h2>
      <p class="meta">Medir antes de entrar e repetir durante o trabalho. Só entre se o oxigênio estiver entre 19,5% e 23%, os inflamáveis abaixo de 10% do LIE e os gases tóxicos dentro do limite (H2S até 8 ppm, CO até 39 ppm).</p>
      <table>
        <thead><tr><th>Hora</th><th class="c">O2 (%)</th><th class="c">LIE (%)</th><th class="c">H2S (ppm)</th><th class="c">CO (ppm)</th><th>Outro gás</th><th>Quem mediu</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      ${algumaFora ? '<p class="alerta">Há medição fora da faixa segura. Ninguém entra até ventilar e medir de novo.</p>' : ''}
    </section>`;
}

export function permissaoHtml(
  moldura: Moldura,
  pt: { tipo?: string; tipoNome: string; norma: string; atividade: string; local: string; inicio: Date; fim: Date; emitente: string; aprNumero: number | null; encerradaEm: Date | null; supervisorEntrada?: string | null; vigia?: string | null },
  checklist: { item: string; ok: boolean }[],
  executantes: Pessoa[],
  medicoes: MedicaoGas[] = [],
) {
  const confinado = pt.tipo === 'ESPACO_CONFINADO';
  return documentoHtml(
    moldura,
    `
    <section>
      <h2>${escape(pt.tipoNome)} <span class="meta">${escape(pt.norma)}</span></h2>
      <p><strong>Atividade:</strong> ${escape(pt.atividade)} · <strong>Local:</strong> ${escape(pt.local)}</p>
      <p><strong>Válida de</strong> ${dataHora(pt.inicio)} <strong>até</strong> ${dataHora(pt.fim)}
      ${pt.aprNumero ? ` · <strong>APR vinculada:</strong> nº ${pt.aprNumero}` : ''}</p>
      ${confinado ? `<p><strong>Supervisor de entrada:</strong> ${escape(pt.supervisorEntrada ?? '') || '________________'} · <strong>Vigia:</strong> ${escape(pt.vigia ?? '') || '________________'}</p>` : ''}
    </section>
    <section>
      <h2>Verificações antes de liberar</h2>
      <table>
        <thead><tr><th>Item</th><th class="c" style="width:60px">Sim</th><th class="c" style="width:60px">Não</th></tr></thead>
        <tbody>${checklist.map((c) => `<tr><td>${escape(c.item)}</td><td class="c">${c.ok ? '●' : ''}</td><td class="c">${c.ok ? '' : '●'}</td></tr>`).join('')}</tbody>
      </table>
      ${checklist.some((c) => !c.ok) ? '<p class="alerta">Há itens marcados como "não". Só libere o trabalho depois de resolvê-los.</p>' : ''}
    </section>
    ${confinado ? medicoesHtml(medicoes) : ''}
    <section>
      <h2>${confinado ? 'Trabalhadores autorizados a entrar' : 'Executantes'}</h2>
      ${listaAssinaturas(executantes, 'Nenhum executante registrado.')}
    </section>
    <div class="assinaturas">
      ${assinatura(pt.emitente, 'Emitente da permissão')}
      ${confinado ? `${assinatura(pt.supervisorEntrada ?? '', 'Supervisor de entrada')}${assinatura(pt.vigia ?? '', 'Vigia')}` : assinatura('', 'Responsável pela área')}
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
