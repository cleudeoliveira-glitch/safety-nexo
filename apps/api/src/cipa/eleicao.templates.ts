import { cabecalhoHtml, documentoHtml, escape, folhaHtml, Moldura, rodapeHtml } from '../documentos/layout';
import { CONTEUDO_TREINAMENTO, participacao, Situacao } from './eleicao';

export type Pessoa = { nome: string; cpf: string | null; cargo: string };
export type CandidatoApurado = Pessoa & { votos: number | null; posicao: number; situacao: Situacao; vice: boolean };
export type Indicado = Pessoa & { titular: boolean; presidente: boolean };

export type DadosEleicao = {
  moldura: Omit<Moldura, 'titulo'>;
  razaoSocial: string;
  eleicao: {
    editalEm: Date;
    inscricaoInicio: Date;
    inscricaoFim: Date;
    eleicaoEm: Date;
    localVotacao: string;
    horarioVotacao: string;
    posseEm: Date | null;
    treinamentoInicio: Date | null;
    treinamentoFim: Date | null;
    instrutor: string | null;
  };
  vagas: { efetivos: number; suplentes: number };
  candidatos: CandidatoApurado[];
  indicados: Indicado[];
  participacao: ReturnType<typeof participacao>;
  cargaHoraria: number | null;
  fimMandato: Date | null;
};

const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '___/___/______');
const porExtenso = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const assinatura = (nome: string, papel: string) => `<div class="assinatura">${escape(nome)}<span>${escape(papel)}</span></div>`;
const moldura = (d: DadosEleicao, titulo: string): Moldura => ({ ...d.moldura, titulo });
const NOME_SITUACAO: Record<Situacao, string> = { TITULAR: 'Titular', SUPLENTE: 'Suplente', NAO_ELEITO: 'Não eleito' };

export function editalHtml(d: DadosEleicao): string {
  const e = d.eleicao;
  return documentoHtml(
    moldura(d, 'Edital de convocação para eleição da CIPA'),
    `
    <p>A <strong>${escape(d.razaoSocial)}</strong>, em cumprimento à NR-05, convoca os empregados para a eleição dos seus
    representantes na Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA).</p>
    <h2>Vagas</h2>
    <p>${d.vagas.efetivos} titular(es) e ${d.vagas.suplentes} suplente(s) representantes dos empregados, com mandato de um ano, permitida uma reeleição.</p>
    <h2>Inscrições</h2>
    <p>De <strong>${data(e.inscricaoInicio)}</strong> a <strong>${data(e.inscricaoFim)}</strong>. A inscrição é individual e livre a todos os
    empregados, independentemente de setor ou local de trabalho, com fornecimento de comprovante. Os inscritos têm garantia de emprego até a eleição.</p>
    <h2>Eleição</h2>
    <p>Dia <strong>${data(e.eleicaoEm)}</strong>, das ${escape(e.horarioVotacao)}, em ${escape(e.localVotacao)}. O voto é secreto.
    A relação dos inscritos será divulgada antes da eleição.</p>
    <p class="data">Publicado em ${porExtenso(e.editalEm)}.</p>
    <div class="assinaturas">${assinatura(d.razaoSocial, 'Organização')}</div>`,
    '.data { margin-top: 24px; }',
  );
}

// Ficha em branco com comprovante destacável (5.5.3, c).
export function fichaInscricaoHtml(d: DadosEleicao): string {
  const linha = (rotulo: string) => `<tr><th style="width:30%">${rotulo}</th><td>&nbsp;</td></tr>`;
  const ficha = `
    <table>${['Nome', 'CPF', 'Função', 'Setor', 'Data de admissão', 'Data da inscrição'].map(linha).join('')}</table>
    <p>Declaro que desejo me candidatar a representante dos empregados na CIPA, gestão com eleição em ${data(d.eleicao.eleicaoEm)}.</p>
    <div class="assinaturas">${assinatura('Candidato(a)', 'Assinatura')}${assinatura('Recebido por', 'Organização')}</div>`;
  return documentoHtml(
    moldura(d, 'Ficha de inscrição de candidato à CIPA'),
    `${ficha}
    <div class="corte">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
    <h2>Comprovante de inscrição</h2>
    <p>Recebemos a inscrição de ________________________________________________ como candidato(a) à CIPA da
    ${escape(d.razaoSocial)}, em ___/___/______.</p>
    <div class="assinaturas">${assinatura('Recebido por', 'Organização')}</div>`,
    '.corte { margin: 32px 0 8px; color: #6b7280; white-space: nowrap; overflow: hidden; }',
  );
}

export function inscritosHtml(d: DadosEleicao): string {
  const nomes = [...d.candidatos].sort((a, b) => a.nome.localeCompare(b.nome));
  return documentoHtml(
    moldura(d, 'Relação de candidatos inscritos na CIPA'),
    `<p>Inscrições de ${data(d.eleicao.inscricaoInicio)} a ${data(d.eleicao.inscricaoFim)}. Eleição em ${data(d.eleicao.eleicaoEm)}, ${escape(d.eleicao.localVotacao)}.</p>
    <table>
      <thead><tr><th style="width:40px">Nº</th><th>Nome</th><th>Função</th></tr></thead>
      <tbody>${nomes.map((c, i) => `<tr><td>${i + 1}</td><td>${escape(c.nome)}</td><td>${escape(c.cargo)}</td></tr>`).join('')}</tbody>
    </table>`,
  );
}

// Quatro cédulas por folha, para recortar.
export function cedulasHtml(d: DadosEleicao): string {
  const nomes = [...d.candidatos].sort((a, b) => a.nome.localeCompare(b.nome));
  const cedula = `
    <div class="cedula">
      ${d.moldura.logoEmpresa ? `<img src="${d.moldura.logoEmpresa}" alt="" />` : ''}
      <h3>Cédula de votação · CIPA</h3>
      <p class="meta">${escape(d.razaoSocial)} · eleição de ${data(d.eleicao.eleicaoEm)}</p>
      <p class="meta">Marque um X em <strong>apenas um</strong> candidato.</p>
      <ul>${nomes.map((c) => `<li><span class="caixa"></span>${escape(c.nome)}</li>`).join('')}</ul>
      <div class="rubrica">Rubrica da mesa: __________________</div>
    </div>`;
  return folhaHtml(
    `<div class="grade">${cedula.repeat(4)}</div>`,
    `body { margin: 16px; }
     .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
     .cedula { border: 1px dashed #9ca3af; border-radius: 8px; padding: 12px; min-height: 440px; }
     .cedula img { height: 32px; }
     .cedula h3 { margin: 6px 0 2px; color: #0E4A5B; font-size: 14px; }
     .cedula ul { list-style: none; padding: 0; margin: 10px 0; }
     .cedula li { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #eef0f3; }
     .caixa { width: 14px; height: 14px; border: 1.5px solid #374151; display: inline-block; flex: none; }
     .rubrica { margin-top: 12px; font-size: 10px; color: #6b7280; }`,
  );
}

export function ataEleicaoHtml(d: DadosEleicao): string {
  const p = d.participacao;
  const eleitos = d.candidatos.filter((c) => c.situacao !== 'NAO_ELEITO');
  const naoEleitos = d.candidatos.filter((c) => c.situacao === 'NAO_ELEITO');
  const tabela = (lista: CandidatoApurado[], comSituacao: boolean) => `
    <table>
      <thead><tr><th style="width:40px">Ordem</th><th>Nome</th><th>Função</th><th style="width:60px">Votos</th>${comSituacao ? '<th>Situação</th>' : ''}</tr></thead>
      <tbody>${lista
        .map(
          (c) =>
            `<tr><td>${c.posicao}º</td><td>${escape(c.nome)}</td><td>${escape(c.cargo)}</td><td>${c.votos ?? 0}</td>${comSituacao ? `<td>${NOME_SITUACAO[c.situacao]}</td>` : ''}</tr>`,
        )
        .join('')}</tbody>
    </table>`;

  return documentoHtml(
    moldura(d, 'Ata de eleição e apuração da CIPA'),
    `
    <p>Em ${porExtenso(d.eleicao.eleicaoEm)}, das ${escape(d.eleicao.horarioVotacao)}, em ${escape(d.eleicao.localVotacao)}, realizou-se a eleição
    dos representantes dos empregados para a CIPA da <strong>${escape(d.razaoSocial)}</strong>, por voto secreto, conforme a NR-05.</p>
    ${
      p
        ? `<p>Votaram <strong>${p.votantes}</strong> de ${p.empregados} empregados (<strong>${p.percentual.toLocaleString('pt-BR')}%</strong>).
           ${p.valida ? 'A participação atingiu o mínimo de 50% e a apuração foi realizada.' : '<span class="alerta">A participação ficou abaixo de 50%: pela NR-05 (5.5.4), a votação deve ser prorrogada antes da apuração.</span>'}</p>`
        : ''
    }
    <p>A apuração foi feita em horário normal de trabalho, acompanhada por representantes da organização e dos empregados.
    Em caso de empate, prevaleceu o candidato com maior tempo de serviço no estabelecimento (5.5.7).</p>
    <h2>Eleitos</h2>
    ${eleitos.length ? tabela(eleitos, true) : '<p>Nenhum candidato com votos registrados.</p>'}
    ${naoEleitos.length ? `<h2>Não eleitos, em ordem de votos (5.5.8)</h2>${tabela(naoEleitos, false)}` : ''}
    <div class="assinaturas">
      ${assinatura('', 'Presidente da comissão eleitoral')}
      ${assinatura('', 'Vice-presidente da comissão eleitoral')}
      ${assinatura('', 'Representante da organização')}
      ${assinatura('', 'Representante dos empregados')}
    </div>`,
    '.alerta { color: #EF4444; }',
  );
}

export function ataPosseHtml(d: DadosEleicao): string {
  const eleitos = d.candidatos.filter((c) => c.situacao !== 'NAO_ELEITO');
  const linhas = (lista: { nome: string; cargo: string; papel: string }[]) =>
    lista.map((m) => `<tr><td>${escape(m.nome)}</td><td>${escape(m.cargo)}</td><td>${escape(m.papel)}</td></tr>`).join('');
  const organizacao = d.indicados.map((m) => ({ ...m, papel: `${m.titular ? 'Titular' : 'Suplente'}${m.presidente ? ' · Presidente' : ''}` }));
  const empregados = eleitos.map((m) => ({ ...m, papel: `${NOME_SITUACAO[m.situacao]}${m.vice ? ' · Vice-presidente' : ''}` }));
  const todos = [...organizacao, ...empregados];

  return documentoHtml(
    moldura(d, 'Ata de posse da CIPA'),
    `
    <p>Em ${d.eleicao.posseEm ? porExtenso(d.eleicao.posseEm) : '____ de ______________ de ______'}, foram empossados os membros da CIPA da
    <strong>${escape(d.razaoSocial)}</strong>, para o mandato de ${data(d.eleicao.posseEm)} a ${data(d.fimMandato)}, conforme a NR-05.
    O presidente foi designado pela organização e o vice-presidente escolhido pelos representantes eleitos dos empregados (5.4.5).</p>
    <h2>Representantes da organização (designados)</h2>
    <table><thead><tr><th>Nome</th><th>Função</th><th>Na CIPA</th></tr></thead><tbody>${linhas(organizacao) || '<tr><td colspan="3">Nenhum indicado registrado.</td></tr>'}</tbody></table>
    <h2>Representantes dos empregados (eleitos)</h2>
    <table><thead><tr><th>Nome</th><th>Função</th><th>Na CIPA</th></tr></thead><tbody>${linhas(empregados) || '<tr><td colspan="3">Nenhum eleito registrado.</td></tr>'}</tbody></table>
    <p>Cópias desta ata e da ata de eleição serão entregues aos membros titulares e suplentes (5.4.8).</p>
    <div class="assinaturas">${todos.map((m) => assinatura(m.nome, m.papel)).join('')}</div>`,
  );
}

// Um certificado por página, cada um com as logos da empresa e da consultoria.
export function certificadosHtml(d: DadosEleicao): string {
  const eleitos = d.candidatos.filter((c) => c.situacao !== 'NAO_ELEITO');
  const membros: Pessoa[] = [...d.indicados, ...eleitos];
  const e = d.eleicao;
  const pagina = (m: Pessoa, ultima: boolean) => `
    <div class="${ultima ? '' : 'quebra'}">
      ${cabecalhoHtml({ titulo: 'Certificado de treinamento da CIPA', logoEmpresa: d.moldura.logoEmpresa, infos: [] })}
      <p class="texto">Certificamos que <strong>${escape(m.nome)}</strong>${m.cpf ? `, CPF ${escape(m.cpf)}` : ''}, ${escape(m.cargo)} da
      ${escape(d.razaoSocial)}, concluiu o treinamento para membros da Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA),
      conforme o item 5.7 da NR-05, com carga horária de <strong>${d.cargaHoraria ?? '___'} horas</strong>,
      realizado de ${data(e.treinamentoInicio)} a ${data(e.treinamentoFim)}.</p>
      <h2>Conteúdo programático</h2>
      <ol>${CONTEUDO_TREINAMENTO.map((c) => `<li>${escape(c)}</li>`).join('')}</ol>
      <div class="assinaturas">${assinatura(e.instrutor ?? '', 'Instrutor(a)')}${assinatura(m.nome, 'Participante')}</div>
      ${rodapeHtml(d.moldura)}
    </div>`;
  return folhaHtml(
    membros.length ? membros.map((m, i) => pagina(m, i === membros.length - 1)).join('') : '<p>Nenhum membro registrado.</p>',
    '.texto { font-size: 14px; line-height: 1.6; margin-top: 24px; } ol { line-height: 1.6; }',
  );
}
