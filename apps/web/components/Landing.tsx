'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { DUVIDAS_PLANOS, DUVIDAS_SISTEMA, LinkWhatsApp } from '@/components/DuvidasPlanos';
import { Icone, NomeIcone } from '@/components/Icone';
import { VitrineTopo } from '@/components/VitrineTopo';
import { PLANOS_DESTAQUE_LANDING, PLANOS_SITE, PlanoSite, precoAnual, reais } from '@/lib/planos';

// Página inicial para quem ainda não entrou: apresenta o sistema e leva à escolha do plano.
// O caminho é: conhecer → escolher o plano → criar a conta → pagar (planos pagos) → usar.
// Quem já tem conta usa o "Entrar" discreto no topo.
// Ordem da página (pedido do Rodrigo em 24/11): topo → resultados → como funciona → o que garante a entrega → módulos
// → telas e documentos reais → para quem é → planos → dúvidas → fechamento. Cada assunto aparece uma vez só.
// Nada aqui promete o que o sistema não faz: se uma função mudar, ajuste o texto.

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--fonte-titulo' });

const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE ?? '5562994343838').replace(/\D/g, '');
const LINK_WHATSAPP = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o Safety Nexo.')}`;

// O que muda na rotina de quem usa. Resultado, não lista de funções.
const RESULTADOS: { icone: NomeIcone; texto: string }[] = [
  { icone: 'relogio', texto: 'Menos retrabalho e menos digitação repetida' },
  { icone: 'documento', texto: 'Documentos ligados entre si e sempre atualizados' },
  { icone: 'sino', texto: 'Vencimentos, pendências, EPI e treinamentos sob controle' },
  { icone: 'caneta', texto: 'Registro digital do que foi feito em campo' },
  { icone: 'predio', texto: 'Tudo organizado por empresa, setor e função' },
  { icone: 'grade', texto: 'Várias empresas acompanhadas num lugar só' },
  { icone: 'coroa', texto: 'Entrega mais profissional para o seu cliente' },
];

// Como funciona, em três passos. Junta o que antes estava espalhado em "Para que serve" e nos benefícios.
const PASSOS: { titulo: string; texto: string; itens: string[] }[] = [
  {
    titulo: 'Cadastre a empresa uma vez',
    texto: 'Empresa, setores (GHE) e funções com os riscos de cada uma. Pelo CNAE, o grau de risco já vem junto.',
    itens: ['Mudou um risco no setor? A próxima emissão já sai atualizada', 'Serve para qualquer ramo de empresa'],
  },
  {
    titulo: 'Registre no campo',
    texto: 'DDS, APR, inspeção, presença em treinamento e entrega de EPI feitos no celular, na frente do trabalhador.',
    itens: ['Sem sinal na obra ou na fazenda? O celular guarda e envia quando a internet volta', 'Nada de ficha de papel para passar a limpo'],
  },
  {
    titulo: 'Entregue e acompanhe',
    texto: 'PGR, PCMSO, LTCAT e ordem de serviço saem em PDF com os mesmos dados, e o painel mostra o que precisa de atenção.',
    itens: ['Programas, laudos e documentos do dia a dia num lugar só', 'Cada empresa atendida separada, com o próprio histórico'],
  },
];

// O que dá segurança para entregar ao cliente e passar pela fiscalização.
const GARANTIAS: { icone: NomeIcone; titulo: string; texto: string }[] = [
  { icone: 'qr', titulo: 'Registro que comprova', texto: 'Assinatura com o dedo, foto, data e local. Entrega de EPI confirmada pelo rosto. Todo PDF sai com QR code para conferir se é verdadeiro.' },
  { icone: 'sino', titulo: 'Aviso antes de vencer', texto: 'ASO, treinamento, CA de EPI, extintor e documento. O painel mostra o que vence e você recebe um resumo por e-mail toda semana.' },
  { icone: 'pessoas', titulo: 'Cliente com acesso próprio', texto: 'Cada empresa atendida pode ganhar um login para ver os próprios documentos, vencimentos, DDS e entregas de EPI. Ela nunca vê as outras empresas.' },
];

// Módulos do sistema. No máximo 4 itens por módulo, sem repetir o que já foi dito acima.
const MODULOS: { icone: NomeIcone; titulo: string; resumo: string; itens: string[] }[] = [
  { icone: 'caixa', titulo: 'EPI e campo', resumo: 'Entrega, estoque e trabalho de risco pelo celular.', itens: ['Entrega de EPI com assinatura ou pelo rosto', 'Almoxarifado que avisa quando o CA vence', 'APR e permissão de trabalho', 'Inspeções das NRs com foto'] },
  { icone: 'formatura', titulo: 'Treinamentos', resumo: 'Do slide ao certificado, sem montar nada do zero.', itens: ['Slides prontos das NRs e roteiro do instrutor', 'Lista de presença com toque no celular', 'Certificado com QR code', 'Aviso antes de vencer a reciclagem'] },
  { icone: 'documento', titulo: 'Documentos (PGR, PCMSO, LTCAT)', resumo: 'Programas e laudos usando a mesma base.', itens: ['PGR com inventário de riscos e plano de ação', 'PCMSO com exames pelo risco e relatório anual', 'LTCAT e laudos de insalubridade e periculosidade', 'Ordem de serviço por função'] },
  { icone: 'coracao', titulo: 'Saúde e eSocial', resumo: 'Exames, afastamentos e os eventos de SST.', itens: ['ASO com aviso antes de vencer', 'Afastamentos e CAT', 'eSocial S-2210, S-2220 e S-2240', 'PPP'] },
  { icone: 'lista', titulo: 'Gestão de atividades', resumo: 'O que precisa ser feito, por quem e até quando.', itens: ['Plano de ação em quadro (5W2H)', 'Relatos e denúncia anônima pelo QR code', 'CIPA: dimensionamento, eleição pelo celular e atas', 'Mapa de risco por setor'] },
  { icone: 'cerebro', titulo: 'Psicossocial NR-01', resumo: 'A parte nova da NR-01, sem complicação.', itens: ['Questionário anônimo, respondido pelo celular', 'Resultado por setor, nunca por pessoa', 'Os fatores encontrados vão direto para o PGR'] },
];

// Prints reais do sistema (empresa de exemplo Padaria Pão Dourado) e páginas reais de documentos gerados (empresas de exemplo).
const TELAS_REAIS = [
  { img: '/vitrine/tela-painel.webp', celular: '/vitrine/topo-painel-celular.webp', titulo: 'Painel', texto: 'Empresa em foco, pendências, vencimentos e riscos por tipo.' },
  { img: '/vitrine/tela-ghe.webp', celular: '/vitrine/topo-ghe-celular.webp', titulo: 'GHE e riscos', texto: 'Cada grupo em 4 etapas, com o que falta para completar.' },
  { img: '/vitrine/tela-documentos.webp', celular: '/vitrine/topo-documentos-celular.webp', titulo: 'Emitir documento', texto: '36 modelos com busca por nome, sigla ou NR.' },
  { img: '/vitrine/tela-slides.webp', celular: '/vitrine/topo-slides-celular.webp', titulo: 'Treinamento', texto: 'Slides, roteiro do instrutor e prova de cada NR.' },
];

const DOCUMENTOS_REAIS = [
  { img: '/vitrine/pgr-capa.webp', titulo: 'PGR', texto: 'Capa' },
  { img: '/vitrine/pgr-matriz.webp', titulo: 'PGR', texto: 'Matriz de risco 5x5' },
  { img: '/vitrine/doc-pcmso.webp', titulo: 'PCMSO', texto: 'Capa' },
  { img: '/vitrine/doc-ltcat.webp', titulo: 'LTCAT', texto: 'Capa' },
  { img: '/vitrine/doc-os.webp', titulo: 'Ordem de serviço', texto: 'Por função' },
  { img: '/vitrine/doc-lista-presenca.webp', titulo: 'Treinamento', texto: 'Lista de presença' },
];

const PUBLICO: { icone: NomeIcone; titulo: string; texto: string }[] = [
  { icone: 'pasta', titulo: 'Consultorias de SST', texto: 'Várias empresas clientes, cada uma com seus dados e documentos.' },
  { icone: 'cracha', titulo: 'Técnicos e engenheiros autônomos', texto: 'Não precisa de CNPJ para criar a conta.' },
  { icone: 'escudo', titulo: 'Empresas com SESMT próprio', texto: 'A rotina de SST da casa organizada num lugar só.' },
  { icone: 'cruz', titulo: 'Médicos e clínicas do trabalho', texto: 'PCMSO, ASO e relatório anual ligados aos riscos.' },
];

const RAMOS = [
  'Indústria', 'Construção civil', 'Comércio e varejo', 'Clínicas, consultórios e odontologia', 'Agronegócio',
  'Transporte e logística', 'Restaurantes e padarias', 'Escritórios e serviços', 'Condomínios', 'Escolas',
];

// Tabela de comparação dos 5 planos. Tudo tirado de lib/planos.ts (lista "inclui" de cada plano). Se um plano mudar lá, ajuste aqui.
// Ordem das colunas: Grátis, Start, Essencial, Profissional, Ilimitado.
type Celula = string | boolean;
const COMPARACAO: { item: string; valores: [Celula, Celula, Celula, Celula, Celula] }[] = [
  { item: 'Empresas atendidas', valores: ['1 (até 10 funcionários)', '1', 'Até 5', 'Até 15', 'Sem limite'] },
  { item: 'Documentos', valores: ['1 PGR e as OS para testar', 'Todos', 'Todos', 'Todos', 'Todos'] },
  { item: 'PDF', valores: ['Com a marca "Versão Teste"', 'Com a logo da empresa', 'Logo da empresa e da consultoria', 'Logo da empresa e da consultoria', 'Logos, sem a marca Safety Nexo'] },
  { item: 'Treinamentos, campo sem internet e assinatura', valores: [false, true, true, true, true] },
  { item: 'eSocial (S-2210, S-2220, S-2240 e S-2230)', valores: [false, false, true, true, true] },
  { item: 'Proposta comercial com aprovação por link', valores: [false, false, true, true, true] },
  { item: 'Entrega de EPI pelo rosto', valores: [false, false, false, true, true] },
  { item: 'Contratos, serviços e cobrança por Pix', valores: [false, false, false, true, true] },
  { item: 'Equipe', valores: [false, false, false, 'Até 3 pessoas', 'Sem limite'] },
  { item: 'Pesquisas psicossociais por mês', valores: ['Demonstração', '2', '5', '15', 'Sem limite'] },
];

// Na página inicial, as dúvidas de quem ainda não conhece o sistema, mais as três de plano que mais aparecem.
const DUVIDAS_ENTRADA = [...DUVIDAS_SISTEMA.slice(0, 7), ...DUVIDAS_PLANOS.filter((d) => ['Preciso de cartão para testar?', 'Tem fidelidade ou multa?', 'Qual plano devo escolher?'].includes(d.pergunta))];

const MENU = [
  { href: '#como-funciona', nome: 'Como funciona' },
  { href: '#modulos', nome: 'Módulos' },
  { href: '#por-dentro', nome: 'Por dentro' },
  { href: '#planos', nome: 'Planos' },
  { href: '#duvidas', nome: 'Dúvidas' },
];

export function Landing() {
  return (
    <main className={`${inter.className} ${jakarta.variable} min-h-screen bg-white text-text`}>
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="/" className="shrink-0"><img src="/logo.png" alt="Safety Nexo" className="h-9 w-auto" /></a>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            {MENU.map((m) => (
              <a key={m.href} href={m.href} className="hidden rounded-lg px-3 py-2 font-medium text-text/70 transition hover:text-primary lg:inline">{m.nome}</a>
            ))}
            <a
              href={LINK_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              aria-label="Tirar dúvidas pelo WhatsApp"
              title="Tirar dúvidas pelo WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#128C4B] transition hover:bg-[#25D366]/10"
            >
              <IconeWhatsApp className="h-5 w-5" />
            </a>
            <Link href="/entrar" className="rounded-lg px-3 py-2 font-semibold text-text/75 hover:text-primary">Entrar</Link>
            <a href="#planos" className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-primary-escuro">Ver planos</a>
          </nav>
        </div>
      </header>

      <VitrineTopo />

      {/* Resultados: o que muda na rotina, logo depois do topo. */}
      <section aria-labelledby="resultados" className="border-b border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <Titulo id="resultados" sobre="O que muda na sua rotina" titulo="Mais controle da SST com menos esforço" />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {RESULTADOS.map((r) => (
              <li key={r.texto} className="flex items-start gap-3.5 rounded-2xl border border-black/[0.07] bg-[#F7FAFA] p-4 sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-black/5">
                  <Icone nome={r.icone} className="h-5 w-5" />
                </span>
                <span className="pt-0.5 text-[0.95rem] font-semibold leading-snug text-primary-escuro sm:text-base">{r.texto}</span>
              </li>
            ))}
            <li className="flex flex-col justify-between gap-4 rounded-2xl bg-primary-escuro p-5 text-white">
              <span className="text-base font-semibold leading-snug">Teste com tudo liberado por 14 dias.</span>
              <Link href="/cadastro?plano=FREE" className="inline-flex items-center gap-2 self-start font-bold text-menta hover:underline">
                Começar grátis <Icone nome="seta" className="h-4 w-4" />
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <div className="bg-[#F5F8F9]">
        {/* Como funciona: três passos. */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
          <Titulo sobre="Como funciona" titulo="Preencha uma vez. Use em tudo.">
            Os dados da empresa, dos setores e das funções alimentam os programas, os laudos e os registros do dia a dia. Você não digita a mesma coisa duas vezes.
          </Titulo>
          <ol className="mt-12 grid gap-5 lg:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="relative flex flex-col rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-7">
                <span className="fonte-titulo flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">{i + 1}</span>
                <h3 className="fonte-titulo mt-5 text-xl font-bold tracking-tight text-primary-escuro">{p.titulo}</h3>
                <p className="mt-2 text-base leading-relaxed text-text/70">{p.texto}</p>
                <ul className="mt-5 space-y-2.5 border-t border-black/5 pt-5 text-[0.95rem] text-text/75">
                  {p.itens.map((t) => (
                    <li key={t} className="flex gap-2.5"><Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{t}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        {/* Entrega: comprovação, vencimentos, documento com a marca e acesso do cliente. */}
        <section id="entrega" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:pb-24">
          <Titulo sobre="Entrega profissional" titulo="O que você entrega ao cliente se sustenta" />
          <div className="mt-10 grid gap-5 lg:grid-cols-5">
            <div className="fundo-destaque relative overflow-hidden rounded-2xl p-6 text-white sm:p-8 lg:col-span-3 lg:row-span-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-menta"><Icone nome="documento" className="h-5 w-5" /></span>
              <h3 className="fonte-titulo mt-5 text-2xl font-bold tracking-tight">Documento com a sua marca</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/85">
                A logo da empresa atendida vai no cabeçalho e a da sua consultoria no rodapé. Texto com a firmeza da norma, escrito para gente ler.
              </p>
              <p className="mt-2 text-sm text-white/65">A logo da consultoria entra a partir do plano Essencial.</p>
              <div className="-mb-6 mt-8 flex items-start justify-center gap-4 sm:-mb-8 sm:gap-6">
                <img src="/vitrine/pgr-capa.webp" alt="Capa de um PGR gerado no Safety Nexo" loading="lazy" className="w-[44%] max-w-[230px] rounded-md shadow-2xl ring-1 ring-black/10" />
                <img src="/vitrine/doc-pcmso.webp" alt="Capa de um PCMSO gerado no Safety Nexo" loading="lazy" className="mt-8 w-[44%] max-w-[230px] rounded-md shadow-2xl ring-1 ring-black/10" />
              </div>
            </div>
            {GARANTIAS.map((g) => (
              <div key={g.titulo} className="flex gap-4 rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6 lg:col-span-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><Icone nome={g.icone} className="h-5 w-5" /></span>
                <div>
                  <h3 className="fonte-titulo text-lg font-bold tracking-tight text-primary-escuro">{g.titulo}</h3>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-text/70">{g.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Módulos. */}
      <section id="modulos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <Titulo sobre="Módulos" titulo="Tudo o que a rotina de SST pede">
          Todos os módulos usam o mesmo cadastro da empresa. O que você registra em um aparece nos outros.
        </Titulo>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => (
            <div key={m.titulo} className="group flex flex-col rounded-2xl border border-black/[0.07] bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_40px_-24px_rgba(8,47,58,0.35)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Icone nome={m.icone} className="h-5 w-5" /></span>
                <h3 className="fonte-titulo text-lg font-bold leading-tight tracking-tight text-primary-escuro">{m.titulo}</h3>
              </div>
              <p className="mt-3 text-[0.95rem] text-text/65">{m.resumo}</p>
              <ul className="mt-4 space-y-2.5 border-t border-black/5 pt-4 text-[0.95rem] text-text/80">
                {m.itens.map((i) => (
                  <li key={i} className="flex gap-2.5"><Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{i}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <PorDentro />

      {/* Para quem é. */}
      <section id="para-quem" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <Titulo sobre="Para quem é" titulo="Feito para quem vive SST" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLICO.map((p) => (
            <div key={p.titulo} className="rounded-2xl border border-black/[0.07] bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><Icone nome={p.icone} className="h-5 w-5" /></span>
              <h3 className="mt-4 text-base font-bold leading-snug text-primary-escuro">{p.titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text/65">{p.texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm font-semibold text-text/60">Atende empresas de qualquer ramo, como:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {RAMOS.map((r) => (
            <span key={r} className="rounded-full border border-black/[0.08] bg-[#F7FAFA] px-3.5 py-1.5 text-sm text-text/75">{r}</span>
          ))}
        </div>
      </section>

      <SecaoPlanos />

      {/* Dúvidas. */}
      <section id="duvidas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <Titulo sobre="Dúvidas" titulo="Perguntas que sempre aparecem" />
            <p className="mt-4 text-base leading-relaxed text-text/70">
              Tem mais respostas na <Link href="/planos" className="font-semibold text-primary hover:underline">página dos planos</Link>.
            </p>
            <a
              href={LINK_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-[3rem] items-center gap-2.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-5 py-3 font-semibold text-[#0F6E3B] transition hover:bg-[#25D366]/20"
            >
              <IconeWhatsApp className="h-5 w-5" /> Falar no WhatsApp
            </a>
          </div>
          <div className="divide-y divide-black/[0.07] rounded-2xl border border-black/[0.07] bg-white">
            {DUVIDAS_ENTRADA.map((d) => (
              <details key={d.pergunta} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-primary-escuro transition hover:bg-[#F7FAFA] sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span>{d.pergunta}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/[0.07] text-primary transition group-open:rotate-45" aria-hidden>
                    <Icone nome="mais" className="h-4 w-4" />
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[0.95rem] leading-relaxed text-text/70 sm:px-6">{d.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Fechamento. */}
      <section className="px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="fundo-destaque relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(60%_80%_at_80%_20%,black,transparent)]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div>
              <h2 className="fonte-titulo text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto para tirar a SST da planilha?</h2>
              <p className="mt-4 max-w-xl text-lg text-white/85">Em poucos minutos você já cadastra a primeira empresa.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro?plano=FREE"
                  className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl bg-menta px-8 py-3.5 text-lg font-bold text-primary-escuro shadow-lg shadow-black/20 hover:brightness-95"
                >
                  Começar grátis
                </Link>
                <a
                  href="#planos"
                  className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl border border-white/40 px-8 py-3.5 text-lg font-semibold text-white hover:bg-white hover:text-primary-escuro"
                >
                  Ver planos
                </a>
              </div>
            </div>
            <ul className="space-y-4 rounded-2xl bg-black/15 p-6 ring-1 ring-white/10 sm:p-7">
              {['14 dias com tudo liberado', 'Sem cartão para testar', 'Sem fidelidade e sem multa'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-base font-semibold sm:text-lg">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-menta text-primary-escuro"><Icone nome="check" className="h-4 w-4" /></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-[#F5F8F9]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <img src="/logo.png" alt="Safety Nexo" className="h-8 w-auto" />
            <p className="mt-2 text-sm text-text/60">Gestão inteligente de SST</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text/65">
            <a href="#planos" className="hover:text-primary">Planos</a>
            <a href="#duvidas" className="hover:text-primary">Dúvidas</a>
            <Link href="/entrar" className="hover:text-primary">Entrar</Link>
            <Link href="/privacidade" className="hover:text-primary">Privacidade</Link>
            <Link href="/termos" className="hover:text-primary">Termos de uso</Link>
            <LinkWhatsApp>WhatsApp</LinkWhatsApp>
          </nav>
        </div>
      </footer>
    </main>
  );
}

// Telas e documentos reais, em duas abas.
function PorDentro() {
  const [aba, setAba] = useState<'telas' | 'documentos'>('telas');
  const [tela, setTela] = useState(0);
  const t = TELAS_REAIS[tela];
  return (
    <section id="por-dentro" className="scroll-mt-20 bg-primary-escuro text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-menta">Veja por dentro</p>
            <h2 className="fonte-titulo mt-2 text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl">Telas e documentos de verdade</h2>
            <p className="mt-3 text-base text-white/70 sm:text-lg">Tirados do Safety Nexo com empresas de exemplo. Nada de imagem ilustrativa.</p>
          </div>
          <div className="inline-flex self-start rounded-xl bg-white/10 p-1 ring-1 ring-white/10" role="tablist">
            {(['telas', 'documentos'] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={aba === a}
                onClick={() => setAba(a)}
                className={`min-h-[2.75rem] rounded-lg px-5 text-sm font-semibold transition ${aba === a ? 'bg-white text-primary-escuro shadow' : 'text-white/75 hover:text-white'}`}
              >
                {a === 'telas' ? 'Telas do sistema' : 'Documentos gerados'}
              </button>
            ))}
          </div>
        </div>

        {aba === 'telas' ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:gap-8">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {TELAS_REAIS.map((x, i) => (
                <button
                  key={x.titulo}
                  type="button"
                  onClick={() => setTela(i)}
                  className={`shrink-0 rounded-xl px-4 py-3 text-left transition lg:px-5 lg:py-4 ${i === tela ? 'bg-white/[0.12] ring-1 ring-menta/50' : 'hover:bg-white/[0.06]'}`}
                >
                  <span className={`block text-sm font-semibold sm:text-base ${i === tela ? 'text-menta' : 'text-white'}`}>{x.titulo}</span>
                  <span className="mt-1 hidden text-sm leading-snug text-white/60 lg:block">{x.texto}</span>
                </button>
              ))}
            </div>
            <figure>
              <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10">
                <div className="hidden items-center gap-1.5 border-b border-border bg-[#F4F6F8] px-3 py-2 md:flex" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                </div>
                <picture>
                  <source media="(max-width: 767px)" srcSet={t.celular} />
                  <img src={t.img} alt={`${t.titulo}: ${t.texto}`} loading="lazy" className="block w-full" />
                </picture>
              </div>
              <figcaption className="mt-3 text-sm text-white/65 lg:hidden">{t.texto}</figcaption>
            </figure>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {DOCUMENTOS_REAIS.map((d) => (
              <figure key={d.img} className="group">
                <div className="overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-white/10 transition group-hover:-translate-y-1">
                  <img src={d.img} alt={`${d.titulo}: ${d.texto}`} loading="lazy" className="block aspect-[210/297] w-full object-cover object-top" />
                </div>
                <figcaption className="mt-3">
                  <span className="block text-sm font-semibold sm:text-base">{d.titulo}</span>
                  <span className="block text-sm text-white/60">{d.texto}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Planos: 3 cartões em destaque e a tabela com os 5 planos para comparar. Valores e regras vêm de lib/planos.ts.
function SecaoPlanos() {
  const destaque = PLANOS_SITE.filter((p) => PLANOS_DESTAQUE_LANDING.includes(p.codigo));
  return (
    <section id="planos" className="scroll-mt-20 border-y border-black/5 bg-[#F5F8F9]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Titulo sobre="Planos" titulo="Escolha o plano e comece hoje" centro>
          O que muda de um plano para outro é, principalmente, quantas empresas você atende. Todos começam com 14 dias de tudo liberado.
        </Titulo>

        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-3">
          {destaque.map((p) => <CartaoPlanoVitrine key={p.codigo} p={p} />)}
        </div>

        <div className="mt-16">
          <h3 className="fonte-titulo text-center text-xl font-bold tracking-tight text-primary-escuro sm:text-2xl">Compare os 5 planos</h3>
          <p className="mt-2 text-center text-sm text-text/60 md:hidden">Arraste a tabela para o lado para ver todos.</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.07]">
                  <th className="sticky left-0 z-10 w-[132px] bg-white px-3 py-4 sm:w-[26%] sm:px-4 align-bottom font-semibold text-text/60">
                    <span className="sr-only">Item</span>
                  </th>
                  {PLANOS_SITE.map((p) => (
                    <th key={p.codigo} className={`px-3 py-4 align-bottom ${p.destaque ? 'bg-primary/[0.05]' : ''}`}>
                      {p.destaque && <span className="mb-1.5 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Mais escolhido</span>}
                      <span className="block text-base font-bold text-primary-escuro">{p.nome}</span>
                      <span className="mt-1 block text-lg font-bold text-text">{p.precoMensal ? reais(p.precoMensal) : 'R$ 0'}<span className="text-xs font-normal text-text/55">/mês</span></span>
                      <span className="block text-xs font-normal text-text/55">{p.precoMensal ? `ou ${reais(precoAnual(p))} por ano` : 'Sem cartão'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARACAO.map((linha) => (
                  <tr key={linha.item} className="border-b border-black/[0.05] last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-3.5 text-[13px] font-medium text-text/80 shadow-[1px_0_0_rgba(0,0,0,0.06)] sm:px-4 sm:text-sm">{linha.item}</th>
                    {linha.valores.map((v, i) => (
                      <td key={i} className={`px-3 py-3.5 text-text/80 ${PLANOS_SITE[i].destaque ? 'bg-primary/[0.05]' : ''}`}>
                        {v === true ? (
                          <Icone nome="check" className="h-5 w-5 text-emerald-600" />
                        ) : v === false ? (
                          <span className="text-text/30" aria-label="Não incluso">—</span>
                        ) : (
                          v
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-4" />
                  {PLANOS_SITE.map((p) => (
                    <td key={p.codigo} className={`px-3 py-4 ${p.destaque ? 'bg-primary/[0.05]' : ''}`}>
                      <Link
                        href={`/cadastro?plano=${p.codigo}`}
                        className={`flex min-h-[2.75rem] items-center justify-center rounded-lg px-3 text-center text-sm font-semibold transition ${
                          p.destaque ? 'bg-primary text-white hover:bg-primary-escuro' : 'border border-primary/40 text-primary hover:bg-primary hover:text-white'
                        }`}
                      >
                        {p.precoMensal === 0 ? 'Começar grátis' : 'Quero este'}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-text/65">No anual, você paga 10 mensalidades e usa 12 meses. O anual é combinado pelo <LinkWhatsApp>WhatsApp</LinkWhatsApp>.</p>
            <Link
              href="/planos"
              className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-primary px-6 py-3 text-base font-semibold text-primary hover:bg-primary hover:text-white"
            >
              Ver todos os planos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CartaoPlanoVitrine({ p }: { p: PlanoSite }) {
  const destaque = !!p.destaque;
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${
        destaque ? 'bg-primary-escuro text-white shadow-[0_30px_60px_-25px_rgba(8,47,58,0.6)] md:-my-3 md:py-10' : 'border border-black/[0.08] bg-white'
      }`}
    >
      {destaque && (
        <span className="absolute -top-3.5 left-6 rounded-full bg-menta px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-primary-escuro shadow-sm">Mais escolhido</span>
      )}
      <h3 className={`fonte-titulo text-xl font-bold ${destaque ? 'text-white' : 'text-primary-escuro'}`}>{p.nome}</h3>
      <p className={`mt-1 text-sm ${destaque ? 'text-white/70' : 'text-text/60'}`}>{p.paraQuem}</p>
      <p className="mt-6 flex items-baseline gap-1">
        <span className="fonte-titulo text-4xl font-extrabold tracking-tight">{p.precoMensal ? reais(p.precoMensal) : 'R$ 0'}</span>
        <span className={destaque ? 'text-white/60' : 'text-text/55'}>/mês</span>
      </p>
      <p className={`mt-1 min-h-[1.25rem] text-sm ${destaque ? 'text-white/70' : 'text-text/60'}`}>
        {p.precoMensal ? (
          <>ou <strong className={destaque ? 'text-white' : 'text-text/85'}>{reais(precoAnual(p))} por ano</strong> <span className={`whitespace-nowrap font-semibold ${destaque ? 'text-menta' : 'text-emerald-700'}`}>(2 meses grátis)</span></>
        ) : (
          'Sem cartão e sem prazo para acabar'
        )}
      </p>
      <p className={`mt-6 flex flex-1 items-start gap-2.5 border-t pt-5 text-base font-semibold leading-snug ${destaque ? 'border-white/15' : 'border-black/[0.07] text-primary-escuro'}`}>
        <Icone nome="check" className={`mt-0.5 h-5 w-5 shrink-0 ${destaque ? 'text-menta' : 'text-emerald-600'}`} />
        <span>{p.resultado}</span>
      </p>
      <Link
        href={`/cadastro?plano=${p.codigo}`}
        className={`mt-6 flex min-h-[3rem] items-center justify-center rounded-xl px-5 py-3 text-center text-base font-semibold transition ${
          destaque ? 'bg-menta text-primary-escuro hover:brightness-95' : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
        }`}
      >
        {p.precoMensal === 0 ? 'Começar grátis' : `Quero o ${p.nome}`}
      </Link>
    </div>
  );
}

// Título de seção padrão da página inicial: rótulo pequeno, título grande e texto de apoio.
function Titulo({ id, sobre, titulo, centro, children }: { id?: string; sobre: string; titulo: string; centro?: boolean; children?: React.ReactNode }) {
  return (
    <div className={centro ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">{sobre}</p>
      <h2 id={id} className="fonte-titulo mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-primary-escuro sm:text-4xl">{titulo}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-text/70 sm:text-lg">{children}</p>}
    </div>
  );
}

function IconeWhatsApp({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.04 3C9.4 3 4 8.36 4 14.96c0 2.1.56 4.16 1.62 5.97L4 29l8.3-1.6a12.1 12.1 0 0 0 3.74.6C22.66 28 28 22.64 28 16.04 28 9.4 22.66 3 16.04 3Zm0 22.8c-1.2 0-2.38-.2-3.5-.6l-.25-.09-4.92.95.98-4.76-.16-.26a9.8 9.8 0 0 1-1.5-5.08C6.7 9.66 10.88 5.2 16.04 5.2c5.12 0 9.76 4.5 9.76 10.84 0 5.36-4.38 9.76-9.76 9.76Zm5.38-7.3c-.3-.15-1.74-.86-2-.96-.28-.1-.48-.15-.68.15-.2.29-.78.96-.95 1.16-.18.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.45.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.74-.71 1.99-1.4.25-.68.25-1.27.17-1.4-.07-.12-.27-.2-.57-.34Z" />
    </svg>
  );
}
