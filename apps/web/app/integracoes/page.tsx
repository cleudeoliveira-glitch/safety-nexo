'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icone, NomeIcone } from '@/components/Icone';
import { Aviso } from '@/components/ui';
import { conta, Integracoes } from '@/lib/api';
import { aoMudarFoco, empresasDaConta, escolherFoco } from '@/lib/empresaFoco';
import { lerToken } from '@/lib/sessao';

type Situacao = 'ligado' | 'pronto' | 'falta' | 'atencao';
const SELO: Record<Situacao, [string, string]> = {
  ligado: ['Ligado', 'bg-success/10 text-success'],
  pronto: ['Pronto para usar', 'bg-primary/10 text-primary'],
  atencao: ['Ligado em parte', 'bg-warning/15 text-[#c2410c]'],
  falta: ['Falta ligar', 'bg-text/10 text-text/60'],
};
type Cartao = { nome: string; icone: NomeIcone; situacao: Situacao; texto: string; detalhe?: string; link?: { href: string; rotulo: string } };

// Integrações: tudo o que o Safety Nexo conecta, num lugar só, com o que já está ligado e o que falta.
export default function PaginaIntegracoes() {
  const [dados, setDados] = useState<Integracoes | null>(null);
  const [erro, setErro] = useState('');
  const [empresaId, setEmpresaId] = useState('');

  useEffect(() => {
    if (!lerToken()) { window.location.href = '/entrar'; return; }
    conta.integracoes().then(setDados).catch((e: Error) => setErro(e.message));
    empresasDaConta().then((l) => setEmpresaId(escolherFoco(l))).catch(() => undefined);
    return aoMudarFoco(setEmpresaId);
  }, []);

  const naEmpresa = (rota: string) => (empresaId ? `/empresas/${empresaId}${rota}` : '/empresas/nova');
  const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

  const cartoes: Cartao[] = dados ? [
    {
      nome: 'eSocial (SST)', icone: 'nuvem',
      situacao: dados.certificado?.valido ? 'ligado' : dados.certificado ? 'atencao' : 'falta',
      texto: 'Envia os eventos S-2210, S-2220, S-2230 e S-2240 direto ao governo, com o certificado digital da consultoria.',
      detalhe: dados.certificado ? `Certificado de ${dados.certificado.titular}, ${dados.certificado.valido ? 'válido até' : 'venceu em'} ${data(dados.certificado.validoAte)}.` : 'Envie o certificado A1 (.pfx) para transmitir.',
      link: { href: naEmpresa('/esocial'), rotulo: 'Abrir eSocial' },
    },
    {
      nome: 'Assinatura digital ICP-Brasil', icone: 'caneta',
      situacao: dados.certificado?.valido ? 'ligado' : 'falta',
      texto: 'Os documentos assinados saem também com o certificado ICP-Brasil da consultoria. O trabalhador assina pelo link no celular.',
      detalhe: dados.certificado?.valido ? 'Usa o mesmo certificado do eSocial.' : 'Usa o certificado do eSocial: envie o certificado lá. Sem ele, a assinatura pelo link continua funcionando.',
      link: { href: naEmpresa('/assinaturas'), rotulo: 'Abrir assinaturas' },
    },
    {
      nome: 'RH e folha (planilha)', icone: 'upload', situacao: 'pronto',
      texto: 'Traz os funcionários de TOTVS, Senior, Sólides ou qualquer sistema de RH pela planilha exportada. Ninguém precisa digitar de novo.',
      detalhe: `${dados.uso.colaboradores} colaborador(es) cadastrado(s) nas suas empresas.`,
      link: { href: naEmpresa('/conectores#rh'), rotulo: 'Importar funcionários' },
    },
    {
      nome: 'Terceirizadas', icone: 'aperto', situacao: 'pronto',
      texto: 'Documentos e trabalhadores das prestadoras de serviço, com aviso de documento vencido.',
      detalhe: `${dados.uso.terceiros} terceirizada(s) cadastrada(s).`,
      link: { href: naEmpresa('/conectores#terceiros'), rotulo: 'Abrir terceirizadas' },
    },
    {
      nome: 'Inteligência artificial', icone: 'brilho', situacao: dados.ia.ligada ? 'ligado' : 'falta',
      texto: 'Lê PGR antigo em PDF, analisa fotos de inspeção e de relatos, sugere APR e ajuda na investigação de acidentes.',
      detalhe: dados.ia.ligada ? 'Funcionando.' : 'Desligada por enquanto: tem custo por uso. Liga com a chave da IA no servidor (Render).',
      link: { href: naEmpresa('/importar-pdf'), rotulo: 'Trazer PGR antigo' },
    },
    {
      nome: 'E-mail semanal de avisos', icone: 'sino',
      situacao: !dados.email.ligado ? 'falta' : dados.email.dominioProprio && dados.email.avisosEmail ? 'ligado' : 'atencao',
      texto: 'Toda segunda às 8h: pendências, vencimentos e mudanças nas normas de cada empresa.',
      detalhe: !dados.email.ligado ? 'Falta a chave do serviço de e-mail no servidor.'
        : !dados.email.avisosEmail ? 'Você desligou o e-mail semanal. Ligue de novo em Mudanças nas normas.'
          : dados.email.dominioProprio ? 'Funcionando com o domínio próprio.' : 'Funcionando, mas só chega aos clientes depois de verificar um domínio próprio no serviço de e-mail.',
      link: { href: '/normas', rotulo: 'Ver o e-mail' },
    },
    {
      nome: 'Pix nas cobranças', icone: 'cifrao', situacao: dados.pix ? 'ligado' : 'falta',
      texto: 'As cobranças saem com QR code do Pix da consultoria, pronto para o cliente pagar.',
      detalhe: dados.pix ? 'Chave Pix cadastrada.' : 'Cadastre a chave Pix em Comercial.',
      link: { href: '/comercial', rotulo: 'Abrir Comercial' },
    },
    {
      nome: 'QR code de relatos', icone: 'qr', situacao: 'pronto',
      texto: 'O trabalhador lê o QR code e conta um quase acidente ou algo perigoso, com foto, sem precisar de login.',
      detalhe: `${dados.uso.relatos} relato(s) recebido(s).`,
      link: { href: naEmpresa('/prevencao#relatos'), rotulo: 'Abrir relatos' },
    },
    {
      nome: 'WhatsApp', icone: 'fala', situacao: 'pronto',
      texto: 'Os links de assinatura, de votação da CIPA e do espaço do trabalhador já abrem prontos para mandar pelo WhatsApp.',
      detalhe: 'O envio automático (sem tocar no botão) tem custo por mensagem e ficou para depois.',
    },
    {
      nome: 'Armazenamento na nuvem', icone: 'pasta', situacao: dados.armazenamentoNuvem ? 'ligado' : 'atencao',
      texto: 'Logos, PDFs, fotos e documentos ficam guardados com segurança, com versão de cada arquivo.',
      detalhe: dados.armazenamentoNuvem ? 'Guardando na nuvem.' : 'Guardando no disco do servidor: pode se perder quando ele reinicia.',
    },
  ] : [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Integrações</h1>
        <p className="text-sm text-text/60">Tudo o que o Safety Nexo conecta com outros sistemas, num lugar só. Veja o que já está ligado e o que falta.</p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!dados && !erro && <div className="h-40 animate-pulse rounded-card bg-white" />}
      <div className="grid gap-4 md:grid-cols-2">
        {cartoes.map((c) => {
          const [rotulo, cor] = SELO[c.situacao];
          return (
            <section key={c.nome} className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#168a7f] text-white shadow-sm">
                  <Icone nome={c.icone} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">{c.nome}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}>{rotulo}</span>
                  </div>
                  <p className="mt-1 text-sm text-text/70">{c.texto}</p>
                  {c.detalhe && <p className="mt-2 text-xs text-text/60">{c.detalhe}</p>}
                </div>
              </div>
              {c.link && <Link href={c.link.href} className="mt-4 self-start rounded-card border border-border px-3.5 py-2 text-sm font-semibold hover:border-primary hover:text-primary">{c.link.rotulo}</Link>}
            </section>
          );
        })}
      </div>
    </main>
  );
}
