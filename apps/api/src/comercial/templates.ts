import { documentoHtml, escape, Moldura } from '../documentos/layout';

export const reais = (centavos: number | null | undefined) =>
  centavos === null || centavos === undefined ? '—' : (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (d: Date | null | undefined) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const paragrafos = (t: string | null | undefined) => (t ?? '').split(/\n+/).filter(Boolean).map((p) => `<p>${escape(p)}</p>`).join('');

export type ItemProposta = { descricao: string; quantidade: number; valorCentavos: number };
export const totalItens = (itens: ItemProposta[]) => itens.reduce((s, i) => s + i.quantidade * i.valorCentavos, 0);

export function propostaHtml(m: Moldura, p: { numero: number; data: Date; validadeDias: number; clienteNome: string; clienteCnpj: string | null; clienteContato: string | null; itens: ItemProposta[]; observacoes: string | null }, consultoria: { nome: string; cnpj: string | null; cidade: string | null }) {
  const validade = new Date(p.data.getTime() + p.validadeDias * 86_400_000);
  const corpo = `
    <h2>Para</h2>
    <p><strong>${escape(p.clienteNome)}</strong>${p.clienteCnpj ? ` · CNPJ ${escape(p.clienteCnpj)}` : ''}${p.clienteContato ? `<br/>A/C ${escape(p.clienteContato)}` : ''}</p>
    <h2>Serviços propostos</h2>
    <table>
      <tr><th>Serviço</th><th style="width:60px">Qtd.</th><th style="width:110px">Valor unitário</th><th style="width:110px">Total</th></tr>
      ${p.itens.map((i) => `<tr><td>${escape(i.descricao)}</td><td>${i.quantidade}</td><td>${reais(i.valorCentavos)}</td><td>${reais(i.quantidade * i.valorCentavos)}</td></tr>`).join('')}
      <tr><td colspan="3" style="text-align:right"><strong>Total</strong></td><td><strong>${reais(totalItens(p.itens))}</strong></td></tr>
    </table>
    ${p.observacoes ? `<h2>Condições</h2>${paragrafos(p.observacoes)}` : ''}
    <p class="meta">Proposta válida até ${data(validade)}.</p>
    <div class="assinaturas">
      <div class="assinatura">${escape(consultoria.nome)}<span>${consultoria.cnpj ? `CNPJ ${escape(consultoria.cnpj)}` : 'Consultoria'}</span></div>
      <div class="assinatura">De acordo: ${escape(p.clienteNome)}<span>Nome, assinatura e data</span></div>
    </div>`;
  return documentoHtml({ ...m, infos: [['Proposta nº', p.numero], ['Data', data(p.data)], ['Cliente', p.clienteNome], ['Validade', `${p.validadeDias} dias`]] }, corpo);
}

// Modelo simples de contrato de prestação de serviços. Deve ser revisado pela consultoria antes de usar.
export function contratoHtml(m: Moldura, c: { numero: number; objeto: string; valorMensalCentavos: number | null; diaVencimento: number | null; inicio: Date; fim: Date | null; observacoes: string | null },
  partes: { consultoria: { nome: string; cnpj: string | null; cidade: string | null }; cliente: { razaoSocial: string; cnpj: string; representante: string | null } }) {
  const { consultoria, cliente } = partes;
  const prazo = c.fim ? `de ${data(c.inicio)} a ${data(c.fim)}` : `a partir de ${data(c.inicio)}, por prazo indeterminado`;
  const corpo = `
    <h2>Partes</h2>
    <p><strong>CONTRATADA:</strong> ${escape(consultoria.nome)}${consultoria.cnpj ? `, CNPJ ${escape(consultoria.cnpj)}` : ''}${consultoria.cidade ? `, com sede em ${escape(consultoria.cidade)}` : ''}.</p>
    <p><strong>CONTRATANTE:</strong> ${escape(cliente.razaoSocial)}, CNPJ ${escape(cliente.cnpj)}${cliente.representante ? `, representada por ${escape(cliente.representante)}` : ''}.</p>
    <h2>1. Objeto</h2>${paragrafos(c.objeto)}
    <h2>2. Prazo</h2><p>Este contrato vale ${prazo}.</p>
    <h2>3. Valor e pagamento</h2>
    <p>${c.valorMensalCentavos ? `A CONTRATANTE pagará ${reais(c.valorMensalCentavos)} por mês, com vencimento todo dia ${c.diaVencimento ?? 10}, por Pix ou outro meio combinado entre as partes.` : 'Os serviços serão cobrados conforme cada ordem de serviço aprovada pela CONTRATANTE.'}
    Serviços fora do objeto serão orçados à parte.</p>
    <h2>4. Obrigações da CONTRATANTE</h2>
    <p>Fornecer as informações e o acesso aos locais necessários, cumprir as medidas de prevenção indicadas nos programas e comunicar mudanças de processo, de pessoal e de riscos. A implementação das medidas é de responsabilidade da CONTRATANTE, como empregadora (NR-01).</p>
    <h2>5. Obrigações da CONTRATADA</h2>
    <p>Executar os serviços com técnica e dentro das normas vigentes, manter sigilo sobre as informações da CONTRATANTE e tratar os dados pessoais dos trabalhadores somente para os fins deste contrato (Lei 13.709/2018).</p>
    <h2>6. Rescisão</h2>
    <p>Qualquer das partes pode encerrar este contrato com aviso por escrito de 30 dias, pagando os serviços já realizados.</p>
    ${c.observacoes ? `<h2>7. Condições adicionais</h2>${paragrafos(c.observacoes)}` : ''}
    <p class="meta">${consultoria.cidade ? `${escape(consultoria.cidade)}, ` : ''}${data(new Date())}.</p>
    <div class="assinaturas">
      <div class="assinatura">${escape(consultoria.nome)}<span>CONTRATADA</span></div>
      <div class="assinatura">${escape(cliente.razaoSocial)}<span>CONTRATANTE</span></div>
      <div class="assinatura">Testemunha 1<span>Nome e CPF</span></div>
      <div class="assinatura">Testemunha 2<span>Nome e CPF</span></div>
    </div>`;
  return documentoHtml({ ...m, infos: [['Contrato nº', c.numero], ['Contratante', cliente.razaoSocial], ['Início', data(c.inicio)], ['Valor mensal', reais(c.valorMensalCentavos)]] }, corpo);
}

export function cobrancaHtml(m: Moldura, c: { descricao: string; valorCentavos: number; vencimento: Date; status: string }, cliente: { razaoSocial: string; cnpj: string }, pix: { copiaECola: string; qr: string; recebedor: string } | null) {
  const corpo = `
    <h2>Cobrança</h2>
    <table>
      <tr><th>Descrição</th><th style="width:120px">Vencimento</th><th style="width:120px">Valor</th></tr>
      <tr><td>${escape(c.descricao)}</td><td>${data(c.vencimento)}</td><td><strong>${reais(c.valorCentavos)}</strong></td></tr>
    </table>
    ${c.status === 'PAGA' ? '<p style="color:#10B981;font-weight:bold">Pagamento recebido. Obrigado!</p>' : pix ? `
    <h2>Pague com Pix</h2>
    <div style="display:flex;gap:24px;align-items:center">
      <img src="${pix.qr}" alt="QR Code Pix" style="width:170px;height:170px" />
      <div>
        <p>Abra o app do seu banco, escolha Pix e leia o QR Code, ou use o Pix copia e cola:</p>
        <p style="font-family:monospace;font-size:10px;word-break:break-all;background:#F8F9FB;padding:8px;border-radius:6px">${escape(pix.copiaECola)}</p>
        <p class="meta">Recebedor: ${escape(pix.recebedor)}</p>
      </div>
    </div>` : '<p>Combine a forma de pagamento com a consultoria.</p>'}`;
  return documentoHtml({ ...m, infos: [['Cliente', cliente.razaoSocial], ['CNPJ', cliente.cnpj], ['Vencimento', data(c.vencimento)], ['Valor', reais(c.valorCentavos)]] }, corpo);
}
