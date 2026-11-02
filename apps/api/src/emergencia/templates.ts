import { documentoHtml, escape, Moldura } from '../documentos/layout';

export const NOME_CONTROLE: Record<string, string> = {
  AVCB: 'AVCB', CLCB: 'CLCB', EXTINTOR: 'Extintor', HIDRANTE: 'Hidrante', ILUMINACAO: 'Iluminação de emergência', ALARME: 'Alarme de incêndio', SPDA: 'SPDA (para-raios)', OUTRO: 'Outro',
};

// Procedimentos básicos de emergência contra incêndio, na ordem em que acontecem.
const PROCEDIMENTOS = [
  ['Alerta', 'Quem perceber o princípio de incêndio aciona o alarme ou avisa a brigada e a liderança imediatamente.'],
  ['Análise da situação', 'A brigada avalia o tamanho do problema e decide os próximos passos.'],
  ['Apoio externo', 'Acionar o Corpo de Bombeiros (193) e, havendo vítimas, o SAMU (192), informando endereço, ponto de referência e o que está acontecendo.'],
  ['Primeiros socorros', 'Atender as vítimas até a chegada do socorro especializado.'],
  ['Eliminar riscos', 'Desligar a energia e fechar o gás das áreas atingidas, quando for seguro.'],
  ['Abandono de área', 'Retirar todas as pessoas pelas rotas de fuga até o ponto de encontro, sem usar elevadores, conferindo se ninguém ficou para trás.'],
  ['Isolamento', 'Isolar a área para que ninguém volte ao local.'],
  ['Combate ao princípio de incêndio', 'Somente brigadistas treinados, com extintor adequado e rota de saída livre.'],
  ['Recepção do Corpo de Bombeiros', 'Uma pessoa aguarda na entrada e informa o que aconteceu, onde, se há vítimas e se há produtos perigosos.'],
  ['Investigação', 'Depois da emergência, registrar o ocorrido e corrigir as causas.'],
];

export type DadosPlano = {
  divisao: string; descricaoDivisao: string; risco: string; populacao: number[]; total: number | null; nivelTexto: string; observacao: string | null;
  brigadistas: { nome: string; cargo: string; nivel: string; validade: string }[];
  controles: { tipo: string; descricao: string; local: string | null; numero: string | null; validade: Date | null }[];
  pontoEncontro?: string; rotasFuga?: string; contatos?: string; coordenador?: string;
};

export function planoHtml(moldura: Moldura, d: DadosPlano): string {
  const risco = { BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto' }[d.risco] ?? d.risco;
  const data = (x: Date | null) => (x ? x.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
  return documentoHtml(
    moldura,
    `
    <section>
      <h2>1. Identificação da edificação</h2>
      <table><tbody>
        <tr><th>Ocupação (IT 17)</th><td>${escape(d.divisao)} · ${escape(d.descricaoDivisao)}</td></tr>
        <tr><th>Risco de incêndio</th><td>${risco}</td></tr>
        <tr><th>População fixa por turno</th><td>${d.populacao.length ? d.populacao.map((p, i) => `pavimento ${i + 1}: ${p}`).join(' · ') : '—'}</td></tr>
        <tr><th>Coordenador(a) da emergência</th><td>${escape(d.coordenador || '—')}</td></tr>
      </tbody></table>
      <h2>2. Brigada de incêndio</h2>
      <p><strong>Brigadistas necessários por turno:</strong> ${d.total ?? 'cálculo especial'} · <strong>Nível de treinamento:</strong> ${escape(d.nivelTexto)}</p>
      ${d.observacao ? `<p class="meta">${escape(d.observacao)}</p>` : ''}
      ${
        d.brigadistas.length
          ? `<table><thead><tr><th>Brigadista</th><th>Cargo</th><th>Treinamento</th><th>Válido até</th></tr></thead><tbody>${d.brigadistas
              .map((b) => `<tr><td>${escape(b.nome)}</td><td>${escape(b.cargo)}</td><td>${escape(b.nivel)}</td><td>${escape(b.validade)}</td></tr>`)
              .join('')}</tbody></table>`
          : '<p class="alerta">Nenhum brigadista com treinamento válido.</p>'
      }
      <h2>3. Equipamentos e documentos de proteção contra incêndio</h2>
      ${
        d.controles.length
          ? `<table><thead><tr><th>Item</th><th>Descrição</th><th>Local</th><th>Número</th><th>Validade</th></tr></thead><tbody>${d.controles
              .map((c) => `<tr><td>${NOME_CONTROLE[c.tipo] ?? c.tipo}</td><td>${escape(c.descricao)}</td><td>${escape(c.local)}</td><td>${escape(c.numero)}</td><td>${data(c.validade)}</td></tr>`)
              .join('')}</tbody></table>`
          : '<p>Nenhum item cadastrado.</p>'
      }
      <h2>4. Rotas de fuga e ponto de encontro</h2>
      <p><strong>Ponto de encontro:</strong> ${escape(d.pontoEncontro || 'a definir')}</p>
      ${d.rotasFuga ? `<p>${escape(d.rotasFuga).replace(/\n/g, '<br>')}</p>` : ''}
      <h2>5. Procedimentos em caso de emergência</h2>
      <ol>${PROCEDIMENTOS.map(([t, x]) => `<li><strong>${t}:</strong> ${x}</li>`).join('')}</ol>
      <h2>6. Telefones de emergência</h2>
      <p>Corpo de Bombeiros 193 · SAMU 192 · Polícia Militar 190 · Defesa Civil 199${d.contatos ? ` · ${escape(d.contatos)}` : ''}</p>
      <h2>7. Treinamentos e simulados</h2>
      <p>Os brigadistas fazem a atualização do treinamento a cada 12 meses (IT 17, item 4.4.1.4.2). Recomenda-se ao menos um simulado de abandono por ano com toda a população.</p>
    </section>
    <div class="assinaturas">
      <div class="assinatura">&nbsp;<span>Responsável técnico</span></div>
      <div class="assinatura">${escape(d.coordenador || '')}<span>Coordenador(a) da emergência</span></div>
    </div>`,
    `table { width: 100%; } tbody th { text-align: left; width: 30%; } ol { padding-left: 18px; } li { margin-bottom: 4px; } .alerta { color: #EF4444; }`,
  );
}
