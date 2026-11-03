import { documentoHtml, escape, Moldura } from '../documentos/layout';

export type SignatarioFolha = { nome: string; cpf: string | null; papel: string; assinadoEm: Date; imagem: string; latitude: number | null; longitude: number | null; precisao: number | null; ip: string | null; presencial: boolean };

export const mascararCpf = (cpf: string | null) => {
  const d = (cpf ?? '').replace(/\D/g, '');
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
};
const quando = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' });
const local = (s: SignatarioFolha) => (s.latitude !== null && s.longitude !== null
  ? `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}${s.precisao ? ` (± ${Math.round(s.precisao)} m)` : ''}`
  : 'não autorizada pelo aparelho');

export function folhaHtml(m: Moldura, p: { titulo: string; codigo: string; hashOriginal: string; urlValidacao: string; qr: string; icp: string | null }, signatarios: SignatarioFolha[]) {
  const corpo = `
    <p>Documento: <strong>${escape(p.titulo)}</strong></p>
    <p class="meta">Código SHA-256 do arquivo original que foi assinado (guardado no arquivo de documentos):<br/><span style="font-family:monospace;font-size:9px;word-break:break-all">${escape(p.hashOriginal)}</span></p>
    ${signatarios.map((s) => `
      <div style="display:flex;gap:18px;align-items:center;border:1px solid #E5E7EB;border-radius:8px;padding:10px;margin:10px 0;page-break-inside:avoid">
        <img src="${s.imagem}" alt="assinatura" style="width:200px;height:80px;object-fit:contain;border-bottom:1px solid #111" />
        <div style="font-size:11px;line-height:1.5">
          <strong>${escape(s.nome)}</strong>${mascararCpf(s.cpf) ? ` · CPF ${mascararCpf(s.cpf)}` : ''}<br/>
          ${escape(s.papel)}<br/>
          Assinou em ${quando(s.assinadoEm)} (horário de Brasília) ${s.presencial ? 'no aparelho de quem pediu a assinatura' : 'pelo link enviado'}<br/>
          Localização: ${local(s)}${s.ip ? ` · IP ${escape(s.ip)}` : ''}
        </div>
      </div>`).join('')}
    <div style="display:flex;gap:16px;align-items:center;margin-top:16px;page-break-inside:avoid">
      <img src="${p.qr}" alt="QR de conferência" style="width:96px;height:96px" />
      <p style="font-size:10px">Confira as assinaturas em <strong>${escape(p.urlValidacao)}</strong><br/>Código de conferência: <strong>${escape(p.codigo)}</strong><br/>
      Assinaturas eletrônicas simples (Lei 14.063/2020, art. 4º, I; MP 2.200-2/2001, art. 10, § 2º).
      ${p.icp ? `<br/>Documento também assinado digitalmente com certificado ICP-Brasil de ${escape(p.icp)}.` : ''}</p>
    </div>`;
  return documentoHtml({ ...m, infos: [['Documento', p.titulo], ['Assinaturas', signatarios.length], ['Código', p.codigo]] }, corpo);
}
