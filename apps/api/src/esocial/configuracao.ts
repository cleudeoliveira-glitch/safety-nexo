// Endereços do eSocial (Manual de Orientação ao Desenvolvedor v1.16).
export const AMBIENTES = {
  PRODUCAO_RESTRITA: {
    tpAmb: 2,
    envio: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
    consulta: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc',
  },
  PRODUCAO: {
    tpAmb: 1,
    envio: 'https://webservices.envio.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
    consulta: 'https://webservices.consulta.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc',
  },
} as const;
export type Ambiente = keyof typeof AMBIENTES;

// Versões dos esquemas: A CONFIRMAR com o pacote de XSD oficial (o manual só traz "vx_x_x").
export const NAMESPACES = {
  loteEnvio: 'http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1',
  consultaLote: 'http://www.esocial.gov.br/schema/lote/eventos/envio/consulta/retornoProcessamento/v1_0_0',
  servicoEnvio: 'http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0',
  servicoConsulta: 'http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0',
};
export const SOAP_ACTION = {
  envio: `${NAMESPACES.servicoEnvio}/ServicoEnviarLoteEventos/EnviarLoteEventos`,
  consulta: `${NAMESPACES.servicoConsulta}/ServicoConsultarLoteEventos/ConsultarLoteEventos`,
};
export const MAX_EVENTOS_POR_LOTE = 50;
export const GRUPO_NAO_PERIODICOS = 2; // S-2210, S-2220 e S-2240

// Id do evento: "ID" + tipo de inscrição + inscrição com 14 posições (CNPJ base completado com zeros)
// + data e hora (AAAAMMDDHHMMSS) + sequencial de 5 dígitos. Confere com o padrão TS_Id do XSD S-1.3: ID\d{1}[A-Z0-9]{12}\d{21}.
export function gerarIdEvento(tpInsc: 1 | 2, nrInsc: string, quando: Date, sequencial: number) {
  const p = (n: number, t = 2) => String(n).padStart(t, '0');
  const d = new Date(quando.getTime() - 3 * 3600_000); // horário de Brasília
  const carimbo = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `ID${tpInsc}${nrInsc.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(14, '0')}${carimbo}${p(sequencial, 5)}`;
}
