import { DOMParser } from '@xmldom/xmldom';
import { request } from 'https';
import { AMBIENTES, Ambiente, GRUPO_NAO_PERIODICOS, NAMESPACES, SOAP_ACTION } from './configuracao';

export type Credencial = { pfx: Buffer; senha: string };
const semDeclaracao = (xml: string) => xml.replace(/^<\?xml[^>]*\?>\s*/, '');

export function montarLote(empregadorCnpj: string, transmissor: { tipo: 'CNPJ' | 'CPF'; documento: string }, eventos: { idEvento: string; xml: string }[]) {
  return `<eSocial xmlns="${NAMESPACES.loteEnvio}"><envioLoteEventos grupo="${GRUPO_NAO_PERIODICOS}">`
    + `<ideEmpregador><tpInsc>1</tpInsc><nrInsc>${empregadorCnpj.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}</nrInsc></ideEmpregador>`
    + `<ideTransmissor><tpInsc>${transmissor.tipo === 'CNPJ' ? 1 : 2}</tpInsc><nrInsc>${transmissor.documento}</nrInsc></ideTransmissor>`
    + `<eventos>${eventos.map((e) => `<evento Id="${e.idEvento}">${semDeclaracao(e.xml)}</evento>`).join('')}</eventos>`
    + `</envioLoteEventos></eSocial>`;
}

function envelope(servico: string, operacao: string, parametro: string, corpo: string) {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${servico}">`
    + `<soap:Header/><soap:Body><v1:${operacao}><v1:${parametro}>${corpo}</v1:${parametro}></v1:${operacao}></soap:Body></soap:Envelope>`;
}

function postar(url: string, acao: string, corpo: string, credencial: Credencial): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: 'POST', pfx: credencial.pfx, passphrase: credencial.senha, timeout: 60_000,
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${acao}"`, 'Content-Length': Buffer.byteLength(corpo) },
    }, (res) => {
      const partes: Buffer[] = [];
      res.on('data', (p) => partes.push(p));
      res.on('end', () => {
        const texto = Buffer.concat(partes).toString('utf8');
        if ((res.statusCode ?? 500) >= 400 && !texto.includes('Envelope')) reject(new Error(`O eSocial respondeu com erro ${res.statusCode}.`));
        else resolve(texto);
      });
    });
    req.on('timeout', () => req.destroy(new Error('O eSocial não respondeu a tempo. Tente de novo em alguns minutos.')));
    req.on('error', (e) => reject(new Error(`O site do eSocial não respondeu agora. Os eventos continuam na fila; tente de novo mais tarde. (detalhe: ${e.message})`)));
    req.end(corpo);
  });
}

const texto = (doc: Document, tag: string) => doc.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() ?? null;

export type Ocorrencia = { codigo: string | null; descricao: string | null; tipo: string | null; localizacao: string | null };
function ocorrencias(no: Element | Document): Ocorrencia[] {
  return Array.from(no.getElementsByTagNameNS('*', 'ocorrencia')).map((o) => ({
    codigo: o.getElementsByTagNameNS('*', 'codigo')[0]?.textContent ?? null,
    descricao: o.getElementsByTagNameNS('*', 'descricao')[0]?.textContent ?? null,
    tipo: o.getElementsByTagNameNS('*', 'tipo')[0]?.textContent ?? null,
    localizacao: o.getElementsByTagNameNS('*', 'localizacao')[0]?.textContent ?? null,
  }));
}

export async function enviarLote(ambiente: Ambiente, lote: string, credencial: Credencial) {
  const resposta = await postar(AMBIENTES[ambiente].envio, SOAP_ACTION.envio, envelope(NAMESPACES.servicoEnvio, 'EnviarLoteEventos', 'loteEventos', lote), credencial);
  const doc = new DOMParser().parseFromString(resposta, 'text/xml') as unknown as Document;
  return { cdResposta: texto(doc, 'cdResposta'), descResposta: texto(doc, 'descResposta'), protocolo: texto(doc, 'protocoloEnvio'), ocorrencias: ocorrencias(doc), bruto: resposta };
}

export async function consultarLote(ambiente: Ambiente, protocolo: string, credencial: Credencial) {
  const consulta = `<eSocial xmlns="${NAMESPACES.consultaLote}"><consultaLoteEventos><protocoloEnvio>${protocolo}</protocoloEnvio></consultaLoteEventos></eSocial>`;
  const resposta = await postar(AMBIENTES[ambiente].consulta, SOAP_ACTION.consulta, envelope(NAMESPACES.servicoConsulta, 'ConsultarLoteEventos', 'consulta', consulta), credencial);
  const doc = new DOMParser().parseFromString(resposta, 'text/xml') as unknown as Document;
  // Cada evento volta com o próprio Id, o código de processamento e, se aceito, o número do recibo.
  const eventos = Array.from(doc.getElementsByTagNameNS('*', 'evento')).map((e) => ({
    idEvento: e.getAttribute('Id'),
    cdResposta: e.getElementsByTagNameNS('*', 'cdResposta')[0]?.textContent ?? null,
    descResposta: e.getElementsByTagNameNS('*', 'descResposta')[0]?.textContent ?? null,
    recibo: e.getElementsByTagNameNS('*', 'nrRecibo')[0]?.textContent ?? null,
    ocorrencias: ocorrencias(e),
  }));
  return { cdResposta: texto(doc, 'cdResposta'), descResposta: texto(doc, 'descResposta'), eventos, bruto: resposta };
}
