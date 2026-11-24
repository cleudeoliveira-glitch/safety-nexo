'use client';

import Link from 'next/link';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { DUVIDAS_PLANOS, DUVIDAS_SISTEMA, LinkWhatsApp } from '@/components/DuvidasPlanos';
import { Icone, NomeIcone } from '@/components/Icone';
import { TelasPorDentro } from '@/components/TelasPorDentro';
import { PLANOS_DESTAQUE_LANDING, PLANOS_SITE, PlanoSite, precoAnual, reais } from '@/lib/planos';

// Página inicial para quem ainda não entrou: apresenta o sistema e leva à escolha do plano.
// O caminho é: conhecer → escolher o plano → criar a conta → pagar (planos pagos) → usar.
// Quem já tem conta usa o "Entrar" discreto no topo.
// Pedido do Rodrigo (24/11): vitrine enxuta, para bater o olho e chamar atenção, falando dos benefícios sem cara de venda
// escancarada. Por isso são poucas seções: topo → diferenciais em telas reais (carro-chefe) → benefícios → planos → dúvidas → fechamento.
// Nada aqui promete o que o sistema não faz: se uma função mudar, ajuste o texto.

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--fonte-titulo' });

const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE ?? '5562994343838').replace(/\D/g, '');
const LINK_WHATSAPP = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o Safety Nexo.')}`;

// Os benefícios que as telas do carro-chefe não mostram. Um título curto e uma linha cada.
const BENEFICIOS: { icone: NomeIcone; titulo: string; texto: string }[] = [
  { icone: 'sinal', titulo: 'Funciona no campo', texto: 'DDS, APR, inspeção e entrega de EPI pelo celular, até sem internet.' },
  { icone: 'sino', titulo: 'Nada vence sem aviso', texto: 'ASO, treinamentos, CA de EPI e documentos acompanhados no painel.' },
  { icone: 'qr', titulo: 'Registro que comprova', texto: 'Assinatura, foto, data e local. Todo PDF sai com QR code.' },
  { icone: 'pessoas', titulo: 'Várias empresas, um lugar', texto: 'Cada cliente com o próprio acesso para ver os documentos dele.' },
];

const MODULOS = ['EPI e campo', 'Treinamentos', 'PGR, PCMSO e LTCAT', 'Saúde e eSocial', 'Gestão de atividades', 'Psicossocial NR-01'];

// Na página inicial, só as dúvidas que mais aparecem. As outras ficam na página dos planos.
const PERGUNTAS = ['Preciso instalar alguma coisa?', 'E se eu estiver numa obra ou fazenda sem internet?', 'Os documentos saem com a minha logo?', 'Meu cliente consegue entrar e ver os documentos dele?', 'Preciso de cartão para testar?', 'Tem fidelidade ou multa?'];
const DUVIDAS_ENTRADA = PERGUNTAS.map((p) => [...DUVIDAS_SISTEMA, ...DUVIDAS_PLANOS].find((d) => d.pergunta === p)).filter((d): d is NonNullable<typeof d> => !!d);

export function Landing() {
  return (
    <main className={`${inter.className} ${jakarta.variable} min-h-screen bg-white text-text`}>
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="/" className="shrink-0"><img src="/logo.png" alt="Safety Nexo" className="h-9 w-auto" /></a>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="#por-dentro" className="hidden rounded-lg px-3 py-2 font-medium text-text/70 transition hover:text-primary md:inline">Por dentro</a>
            <a href="#planos" className="hidden rounded-lg px-3 py-2 font-medium text-text/70 transition hover:text-primary md:inline">Planos</a>
            <a href="#duvidas" className="hidden rounded-lg px-3 py-2 font-medium text-text/70 transition hover:text-primary md:inline">Dúvidas</a>
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

      {/* Topo: a mensagem principal e um print real ao lado (no computador). */}
      <section className="fundo-destaque relative overflow-hidden text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_70%_at_70%_40%,black,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-menta sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-menta" aria-hidden />
              Gestão inteligente de SST
            </p>
            <h1 className="fonte-titulo mt-6 text-[2.35rem] font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
              Toda a SST dos seus clientes num lugar{'\u00a0'}só.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
              Menos digitação, documentos sempre atualizados e cada vencimento sob controle.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro?plano=FREE"
                className="flex min-h-[3.5rem] items-center justify-center whitespace-nowrap rounded-xl bg-menta px-8 py-4 text-lg font-bold text-primary-escuro shadow-lg shadow-black/20 transition hover:brightness-95"
              >
                Começar grátis
              </Link>
              <a
                href="#por-dentro"
                className="flex min-h-[3.5rem] items-center justify-center whitespace-nowrap rounded-xl border border-white/40 bg-white/5 px-8 py-3.5 text-lg font-semibold text-white transition hover:bg-white hover:text-primary-escuro"
              >
                Ver por dentro
              </a>
            </div>
            <p className="mt-4 text-sm text-white/75">14 dias com tudo liberado, sem cartão.</p>
          </div>
          <div className="hidden overflow-hidden rounded-xl bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)] ring-1 ring-white/20 lg:block">
            <div className="flex items-center gap-1.5 border-b border-border bg-[#F4F6F8] px-3 py-2" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
            </div>
            <img src="/vitrine/tela-painel.webp" alt="Painel do Safety Nexo com a empresa em foco, pendências e vencimentos" className="block w-full" />
          </div>
        </div>
      </section>

      {/* Carro-chefe: os diferenciais em telas e documentos reais, logo depois do topo. */}
      <section id="por-dentro" className="scroll-mt-16 bg-[#F2F7F7]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
          <Titulo sobre="Veja por dentro" titulo="O que faz a diferença no seu dia" centro>
            Telas e documentos reais do sistema, com empresas de exemplo.
          </Titulo>
          <div className="mt-10"><TelasPorDentro /></div>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {MODULOS.map((m) => (
              <span key={m} className="rounded-full border border-primary/15 bg-white px-3.5 py-1.5 text-sm font-medium text-primary-escuro">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios. */}
      <section id="beneficios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <Titulo sobre="Por que usar" titulo="Menos retrabalho, mais controle" centro>
          Para consultorias, técnicos e engenheiros de SST, SESMT e clínicas do trabalho, em qualquer ramo.
        </Titulo>
        <ul className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="flex gap-4 lg:flex-col lg:gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                <Icone nome={b.icone} className="h-5 w-5" />
              </span>
              <div>
                <h3 className="fonte-titulo text-lg font-bold tracking-tight text-primary-escuro">{b.titulo}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-text/70">{b.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Planos. */}
      <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <Titulo sobre="Planos" titulo="Escolha o plano e comece hoje" centro>
          O que muda de um plano para outro é, principalmente, quantas empresas você atende. Todos começam com 14 dias de tudo liberado.
        </Titulo>
        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-3">
          {PLANOS_SITE.filter((p) => PLANOS_DESTAQUE_LANDING.includes(p.codigo)).map((p) => <CartaoPlanoVitrine key={p.codigo} p={p} />)}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            href="/planos"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-primary px-6 py-3 text-base font-semibold text-primary hover:bg-primary hover:text-white"
          >
            Ver todos os planos
          </Link>
          <p className="text-sm text-text/60">Também tem o Start (1 empresa, R$ 47) e o Ilimitado (empresas sem limite, R$ 397).</p>
        </div>
      </section>

      {/* Dúvidas. */}
      <section id="duvidas" className="scroll-mt-16 border-t border-black/5 bg-[#F7FAFA]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <Titulo sobre="Dúvidas" titulo="Perguntas que sempre aparecem" centro />
          <div className="mt-10 divide-y divide-black/[0.07] rounded-2xl border border-black/[0.07] bg-white">
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
          <p className="mt-5 text-center text-sm text-text/65">
            Mais respostas na <Link href="/planos" className="font-semibold text-primary hover:underline">página dos planos</Link> ou no <LinkWhatsApp>WhatsApp</LinkWhatsApp>.
          </p>
        </div>
      </section>

      {/* Fechamento. */}
      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="fundo-destaque relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-6 py-12 text-center text-white shadow-xl sm:px-12 sm:py-14">
          <h2 className="fonte-titulo text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto para tirar a SST da planilha?</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">Em poucos minutos você já cadastra a primeira empresa.</p>
          <Link
            href="/cadastro?plano=FREE"
            className="mt-8 inline-flex min-h-[3.25rem] items-center justify-center rounded-xl bg-menta px-9 py-3.5 text-lg font-bold text-primary-escuro shadow-lg shadow-black/20 hover:brightness-95"
          >
            Começar grátis
          </Link>
          <ul className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-2 text-sm text-white/80 sm:flex-row sm:justify-center sm:gap-6">
            {['14 dias com tudo liberado', 'Sem cartão para testar', 'Sem fidelidade'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Icone nome="check" className="h-4 w-4 text-menta" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Safety Nexo" className="h-7 w-auto" />
            <span className="text-sm text-text/60">Gestão inteligente de SST</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text/65">
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
function Titulo({ sobre, titulo, centro, children }: { sobre: string; titulo: string; centro?: boolean; children?: React.ReactNode }) {
  return (
    <div className={centro ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">{sobre}</p>
      <h2 className="fonte-titulo mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-primary-escuro sm:text-4xl">{titulo}</h2>
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
