import { documentoHtml, escape, Moldura } from '../documentos/layout';

type Dados = {
  codigo: string; tipo: string; foto: string; fotoItem: string | null; distancia: number; limiar: number;
  latitude: number | null; longitude: number | null; precisaoM: number | null; ip: string | null; aparelho: string | null;
  hash: string; createdAt: Date; url: string; qr: string;
  colaborador: { nome: string; cpf: string | null; cargo: string };
  item: [string, string][];
};

const quando = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' });
const num = (n: number, c = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

const DECLARACAO: Record<string, string> = {
  EPI: 'Declaro que recebi o EPI acima, gratuitamente, e a orientação sobre seu uso, guarda e conservação. Comprometo-me a usá-lo apenas para a finalidade a que se destina e a comunicar qualquer alteração que o torne impróprio para uso (NR-06).',
  DDS: 'Registro de presença no Diálogo Diário de Segurança acima.',
  TREINAMENTO: 'Registro de presença no treinamento acima.',
};

export function comprovanteHtml(m: Moldura, d: Dados) {
  const local = d.latitude != null && d.longitude != null
    ? `${num(d.latitude, 6)}, ${num(d.longitude!, 6)}${d.precisaoM != null ? ` (precisão de ${Math.round(d.precisaoM)} m)` : ''}`
    : 'não informado (o aparelho não liberou a localização)';
  const linhas: [string, string][] = [
    ['Funcionário', d.colaborador.nome], ['CPF', d.colaborador.cpf ?? '-'], ['Função', d.colaborador.cargo],
    ...d.item,
    ['Data e hora', quando(d.createdAt)], ['Local', local],
    ['Reconhecimento', `rosto confere com o cadastro (distância ${num(d.distancia, 3)}; aceita até ${num(d.limiar, 2)})`],
    ['IP', d.ip ?? '-'], ['Aparelho', d.aparelho ?? '-'],
  ];
  return documentoHtml(m, `
    <div class="fotos">
      <figure><img src="${d.foto}" alt="Foto do rosto"/><figcaption>Foto tirada na hora</figcaption></figure>
      ${d.fotoItem ? `<figure><img src="${d.fotoItem}" alt="Foto do EPI"/><figcaption>Foto do EPI entregue</figcaption></figure>` : ''}
    </div>
    <table>${linhas.map(([k, v]) => `<tr><th>${escape(k)}</th><td>${escape(v)}</td></tr>`).join('')}</table>
    <p class="declaracao">${escape(DECLARACAO[d.tipo] ?? '')}</p>
    <div class="selo">
      <img src="${d.qr}" alt="QR Code"/>
      <div>
        <strong>Assinatura por reconhecimento facial</strong><br>
        Código: ${escape(d.codigo)}<br>
        Confira em ${escape(d.url)}<br>
        <span class="hash">Hash SHA-256: ${escape(d.hash)}</span>
      </div>
    </div>
    <p class="meta">Biometria tratada com o consentimento do funcionário (Lei 13.709/2018, art. 11, I). A foto do cadastro não é guardada: o sistema compara só um código numérico do rosto.</p>`,
    `.fotos{display:flex;gap:16px;margin:8px 0 16px}.fotos figure{margin:0}.fotos img{width:200px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #ddd}
     .fotos figcaption{font-size:10px;color:#666;margin-top:4px}
     th{width:28%;text-align:left}.declaracao{margin-top:14px}
     .selo{display:flex;gap:14px;align-items:center;margin-top:16px;padding:12px;border:1px solid #10B981;border-radius:8px;font-size:11px}
     .selo img{width:90px;height:90px}.hash{font-family:monospace;font-size:9px;word-break:break-all;color:#555}`);
}
