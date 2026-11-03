import { cabecalhoHtml, documentoHtml, escape, folhaHtml, Moldura, rodapeHtml } from '../documentos/layout';

const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const periodo = (inicio: Date, fim: Date) => (data(inicio) === data(fim) ? data(inicio) : `${data(inicio)} a ${data(fim)}`);
const assinatura = (nome: string, papel: string) => `<div class="assinatura">${escape(nome)}<span>${escape(papel)}</span></div>`;

export type TurmaPdf = {
  nome: string; norma: string | null; cargaHoraria: number; conteudo: string[]; inicio: Date; fim: Date;
  local: string; instrutor: string; qualificacao: string; responsavelTecnico: string; validade: Date | null;
};
export type ParticipantePdf = { nome: string; cpf: string | null; cargo: string; codigo: string; qrDataUri: string; urlValidacao: string };

const titulo = (t: TurmaPdf) => (t.norma ? `${t.nome} (${t.norma})` : t.nome);

export function listaPresencaHtml(moldura: Moldura, turma: TurmaPdf, participantes: { nome: string; cpf: string | null; cargo: string; rosto?: string | null }[]) {
  return documentoHtml(
    moldura,
    `
    <section>
      <h2>${escape(titulo(turma))}</h2>
      <p>${periodo(turma.inicio, turma.fim)} · ${turma.cargaHoraria} horas · ${escape(turma.local)} · instrutor(a) ${escape(turma.instrutor)}</p>
    </section>
    <section>
      <h2>Lista de presença</h2>
      <table>
        <thead><tr><th style="width:30px">Nº</th><th>Nome</th><th>CPF</th><th>Função</th><th style="width:30%">Assinatura</th></tr></thead>
        <tbody>${participantes
          .map((p, i) => `<tr><td>${i + 1}</td><td>${escape(p.nome)}</td><td>${escape(p.cpf ?? '')}</td><td>${escape(p.cargo)}</td><td style="height:22px">${p.rosto ? `<small>Reconhecimento facial · ${escape(p.rosto)}</small>` : ''}</td></tr>`)
          .join('')}</tbody>
      </table>
    </section>
    <div class="assinaturas">${assinatura(turma.instrutor, 'Instrutor(a)')}${assinatura(turma.responsavelTecnico, 'Responsável técnico')}</div>`,
  );
}

// Um certificado por página, com o que a NR-01 pede e um QR Code para conferir a autenticidade.
export function certificadosHtml(moldura: Omit<Moldura, 'titulo'>, razaoSocial: string, turma: TurmaPdf, participantes: ParticipantePdf[]) {
  const pagina = (p: ParticipantePdf, ultima: boolean) => `
    <div class="${ultima ? '' : 'quebra'}">
      ${cabecalhoHtml({ titulo: 'Certificado de treinamento', logoEmpresa: moldura.logoEmpresa, infos: [] })}
      <p class="texto">Certificamos que <strong>${escape(p.nome)}</strong>${p.cpf ? `, CPF ${escape(p.cpf)}` : ''}, ${escape(p.cargo)} da
      ${escape(razaoSocial)}, concluiu o treinamento <strong>${escape(titulo(turma))}</strong>, com carga horária de
      <strong>${turma.cargaHoraria} horas</strong>, realizado em ${periodo(turma.inicio, turma.fim)}, em ${escape(turma.local)}.</p>
      ${turma.validade ? `<p><strong>Válido até:</strong> ${data(turma.validade)}</p>` : ''}
      <h2>Conteúdo programático</h2>
      <ol>${turma.conteudo.map((c) => `<li>${escape(c)}</li>`).join('')}</ol>
      <p><strong>Instrutor(a):</strong> ${escape(turma.instrutor)} · ${escape(turma.qualificacao)}</p>
      <div class="assinaturas">
        ${assinatura(p.nome, 'Participante')}
        ${assinatura(turma.instrutor, 'Instrutor(a)')}
        ${assinatura(turma.responsavelTecnico, 'Responsável técnico')}
      </div>
      <div class="validacao">
        <img src="${p.qrDataUri}" alt="QR Code" />
        <div>Confira a autenticidade lendo o QR Code ou acessando<br><strong>${escape(p.urlValidacao)}</strong><br>Código: ${escape(p.codigo)}</div>
      </div>
      ${rodapeHtml(moldura)}
    </div>`;
  return folhaHtml(
    participantes.length ? participantes.map((p, i) => pagina(p, i === participantes.length - 1)).join('') : '<p>Nenhum participante na turma.</p>',
    `.texto { font-size: 14px; line-height: 1.6; margin-top: 20px; } ol { line-height: 1.5; margin: 0 0 8px; }
     .assinaturas { grid-template-columns: 1fr 1fr 1fr; margin-top: 36px; }
     .validacao { display: flex; align-items: center; gap: 12px; margin-top: 24px; font-size: 10px; color: #6b7280; }
     .validacao img { width: 84px; height: 84px; }`,
  );
}
