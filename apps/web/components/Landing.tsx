'use client';

import Link from 'next/link';
import { DUVIDAS_PLANOS, DUVIDAS_SISTEMA, LinkWhatsApp, ListaDuvidas } from '@/components/DuvidasPlanos';
import { Icone, NomeIcone } from '@/components/Icone';
import { BotaoPlanoSite, GradePlanos } from '@/components/Planos';
import { CarrosselTelas } from '@/components/CarrosselTelas';
import { PLANOS_DESTAQUE_LANDING } from '@/lib/planos';

// Página inicial para quem ainda não entrou: apresenta o sistema e leva à escolha do plano.
// O caminho é: conhecer → escolher o plano → criar a conta → pagar (planos pagos) → usar.
// Quem já tem conta usa o "Entrar" discreto no topo.

const BENEFICIOS: { icone: NomeIcone; titulo: string; texto: string }[] = [
  { icone: 'predio', titulo: 'Preenche uma vez, usa em tudo', texto: 'Você cadastra a empresa, os setores e as funções. PGR, PCMSO, LTCAT, ordem de serviço e ficha de EPI aproveitam os mesmos dados, sem digitar de novo.' },
  { icone: 'sinal', titulo: 'Funciona no campo, sem internet', texto: 'DDS, APR, inspeção, presença em treinamento e entrega de EPI feitos no celular, na obra ou na fazenda. Envia sozinho quando o sinal volta.' },
  { icone: 'caneta', titulo: 'Prova que se sustenta', texto: 'Assinatura com o dedo, foto, data e local. Entrega de EPI pelo rosto. Todo PDF sai com QR code para conferir se é verdadeiro.' },
  { icone: 'sino', titulo: 'Avisa antes de vencer', texto: 'ASO, treinamento, CA de EPI, extintor e documento: o painel mostra o que vence e você recebe o resumo por e-mail toda semana.' },
  { icone: 'documento', titulo: 'Documento com a sua cara', texto: 'Logo do cliente no cabeçalho, a da sua consultoria no rodapé. Texto com a seriedade da norma, escrito para gente ler.' },
  { icone: 'pessoas', titulo: 'Cliente acompanha de perto', texto: 'Cada empresa atendida ganha um login para ver os próprios documentos e vencimentos. Ele enxerga o trabalho que você faz.' },
];

const PUBLICO = ['Consultorias de SST', 'Técnicos e engenheiros autônomos', 'Empresas com SESMT próprio', 'Médicos e clínicas do trabalho'];

const RAMOS = [
  'Indústria', 'Construção civil', 'Comércio e varejo', 'Clínicas, consultórios e odontologia', 'Agronegócio',
  'Transporte e logística', 'Restaurantes e padarias', 'Escritórios e serviços', 'Condomínios', 'Escolas',
];

// O que o sistema resolve, separado pela dor de quem trabalha com SST. No máximo 4 itens por bloco.
const BLOCOS: { icone: NomeIcone; titulo: string; dor: string; itens: string[] }[] = [
  { icone: 'caixa', titulo: 'EPI e campo', dor: 'Ficha de papel molhada na obra nunca mais.', itens: ['Entrega de EPI com assinatura no celular ou pelo rosto', 'Almoxarifado que avisa quando o CA vence', 'APR, permissão de trabalho e inspeção no celular', 'Funciona sem internet e envia quando o sinal volta'] },
  { icone: 'formatura', titulo: 'Treinamentos', dor: 'Slide pronto e presença registrada na hora.', itens: ['Slides prontos das NRs', 'Lista de presença com toque no celular', 'Certificado com QR code para conferir', 'Aviso antes de vencer a reciclagem'] },
  { icone: 'documento', titulo: 'Documentos (PGR, PCMSO, LTCAT)', dor: 'Mudou o risco, todos os documentos acompanham.', itens: ['PGR com inventário de riscos e plano de ação', 'PCMSO com exames pelo risco e relatório anual', 'LTCAT e laudo de insalubridade e periculosidade', 'Ordem de serviço por função, com os mesmos dados'] },
  { icone: 'votar', titulo: 'CIPA', dor: 'Da conta de quantos membros até a ata assinada.', itens: ['Dimensionamento pelo CNAE e nº de funcionários', 'Eleição com voto pelo celular', 'Reuniões e atas', 'Mapa de risco por setor'] },
  { icone: 'coracao', titulo: 'Saúde e eSocial', dor: 'Nenhum ASO vencido passa despercebido.', itens: ['ASO com aviso antes de vencer', 'Afastamentos e CAT', 'eSocial S-2210, S-2220 e S-2240', 'PPP'] },
  { icone: 'cerebro', titulo: 'Psicossocial NR-01', dor: 'A parte nova da NR-01, sem complicação.', itens: ['Questionário anônimo, respondido pelo celular', 'Resultado por setor, nunca por pessoa', 'Os fatores encontrados vão direto para o PGR'] },
];

const FAIXA_PROVA = ['Sem planilha', 'Sem copiar e colar', 'Funciona sem internet no campo'];

// Na página inicial, as dúvidas de quem ainda não conhece o sistema, mais as três de plano que mais aparecem.
const DUVIDAS_ENTRADA = [...DUVIDAS_SISTEMA.slice(0, 7), ...DUVIDAS_PLANOS.filter((d) => ['Preciso de cartão para testar?', 'Tem fidelidade ou multa?', 'Qual plano devo escolher?'].includes(d.pergunta))];

export function Landing() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/"><img src="/logo.png" alt="Safety Nexo" className="h-9 w-auto" /></a>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="#recursos" className="hidden rounded-xl px-3 py-2 text-text/75 hover:text-primary md:inline">O que ele faz</a>
            <a href="#documentos" className="hidden rounded-xl px-3 py-2 text-text/75 hover:text-primary md:inline">Módulos</a>
            <a href="#planos" className="hidden rounded-xl px-3 py-2 text-text/75 hover:text-primary sm:inline">Planos</a>
            <a href="#duvidas" className="hidden rounded-xl px-3 py-2 text-text/75 hover:text-primary md:inline">Dúvidas</a>
            <Link href="/entrar" className="rounded-xl px-3 py-2 font-semibold text-text/75 hover:text-primary">Entrar</Link>
            <a href="#planos" className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-escuro">Ver planos</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-20 px-4 py-6 sm:px-6 sm:py-10 lg:space-y-28 lg:py-12">
        <section className="fundo-destaque overflow-hidden rounded-3xl px-6 pt-12 text-white shadow-xl sm:px-12 sm:pt-16 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:py-20 lg:pr-0">
          <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-menta">Gestão inteligente de SST</p>
          <h1 className="mt-4 max-w-3xl text-[2.1rem] font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Toda a SST dos seus clientes num lugar só.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
            Cadastre uma vez e PGR, PCMSO, LTCAT e OS saem atualizados juntos. Funciona no campo sem internet.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/cadastro?plano=FREE"
              className="flex min-h-[3.25rem] items-center justify-center whitespace-nowrap rounded-xl bg-menta px-7 py-3.5 text-lg font-bold text-primary-escuro shadow-lg shadow-black/20 transition hover:brightness-95"
            >
              Começar grátis
            </Link>
            <a
              href="#recursos"
              className="flex min-h-[3.25rem] items-center justify-center whitespace-nowrap rounded-xl border-2 border-white/60 px-7 py-3 text-lg font-semibold text-white transition hover:bg-white hover:text-primary-escuro"
            >
              Ver o que ele faz
            </a>
          </div>
          <p className="mt-3 text-sm text-white/75">14 dias com tudo liberado, sem falar com ninguém.</p>
          </div>
          <div className="mt-12 lg:mt-0 lg:w-[125%]">
            <CarrosselTelas />
          </div>
        </section>

        <section id="recursos" className="scroll-mt-24">
          <Titulo sobre="Para que serve" titulo="Menos papel e retrabalho, mais tempo para a segurança">
            Você cadastra a empresa uma vez, monta os setores (GHE) com os riscos de cada função, e o sistema gera os programas, os laudos e os
            documentos do dia a dia já ligados entre si. Mudou um risco no setor? PGR, PCMSO, LTCAT e ordem de serviço saem atualizados na
            próxima emissão.
          </Titulo>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 sm:block">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icone nome={b.icone} className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold leading-tight sm:mt-4">{b.titulo}</h3>
                </div>
                <p className="mt-2 text-base leading-relaxed text-text/70">{b.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="publico" className="scroll-mt-24">
          <Titulo sobre="Para quem é" titulo="Feito para quem vive SST">
            Atende empresas de qualquer ramo. Você informa o CNAE e o sistema já traz o grau de risco.
          </Titulo>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {PUBLICO.map((p) => (
              <span key={p} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white sm:text-base">{p}</span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {RAMOS.map((r) => (
              <span key={r} className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm text-text/80">{r}</span>
            ))}
          </div>
        </section>

        <section id="documentos" className="scroll-mt-24">
          <Titulo sobre="Módulos" titulo="O que ele resolve no seu dia">
            Tudo em PDF, com a logo da empresa atendida e a da sua consultoria.
          </Titulo>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BLOCOS.map((g) => (
              <div key={g.titulo} className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                    <Icone nome={g.icone} className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold leading-tight">{g.titulo}</h3>
                </div>
                <p className="mt-3 text-base font-medium text-primary">{g.dor}</p>
                <ul className="mt-4 space-y-2.5 text-base text-text/75">
                  {g.itens.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <Icone nome="check" className="mt-1 h-4 w-4 shrink-0 text-success" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="prova" className="scroll-mt-24">
          <Titulo sobre="Veja por dentro" titulo="É assim que fica no sistema">
            Telas e documento de verdade, gerados no Safety Nexo com uma empresa de exemplo.
          </Titulo>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <figure className="flex flex-col rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-1 items-center justify-center rounded-xl bg-background p-3 sm:p-6">
                <img src="/vitrine/painel-o-que-fazer-hoje.webp" alt="Painel do Safety Nexo com a lista O que fazer hoje" className="w-full rounded-xl shadow-md" />
              </div>
              <figcaption className="mt-4">
                <span className="block text-lg font-semibold">Painel &quot;O que fazer hoje&quot;</span>
                <span className="mt-1 block text-base text-text/70">Abriu o sistema, já sabe o que está vencido e o que falta em cada empresa.</span>
              </figcaption>
            </figure>
            <figure className="flex flex-col rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-background px-4 py-6">
                <img src="/vitrine/pgr-capa.webp" alt="Primeira página de um PGR gerado no Safety Nexo" className="w-[58%] -rotate-3 rounded-md border border-border shadow-lg" />
                <img src="/vitrine/pgr-inventario.webp" alt="Inventário de riscos de um PGR gerado no Safety Nexo" className="-ml-[22%] mt-12 w-[64%] rotate-2 rounded-md border border-border shadow-xl" />
              </div>
              <figcaption className="mt-4">
                <span className="block text-lg font-semibold">PGR gerado no sistema</span>
                <span className="mt-1 block text-base text-text/70">Inventário de riscos, matriz e plano de ação saindo prontos em PDF.</span>
              </figcaption>
            </figure>
          </div>
          <ul className="mt-6 grid gap-3 rounded-2xl bg-primary-escuro px-6 py-5 text-white sm:grid-cols-3 sm:px-8">
            {FAIXA_PROVA.map((f) => (
              <li key={f} className="flex items-center justify-center gap-2.5 text-base font-semibold sm:text-lg">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-menta text-primary-escuro">
                  <Icone nome="check" className="h-4 w-4" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section id="planos" className="scroll-mt-24">
          <Titulo sobre="Planos" titulo="Escolha o plano e comece hoje" centro>
            O que muda de um plano para outro é, principalmente, quantas empresas você atende. Todos começam com 14 dias de tudo liberado.
          </Titulo>
          <div className="mt-12">
            <GradePlanos codigos={PLANOS_DESTAQUE_LANDING} semDetalhes acao={(p) => <BotaoPlanoSite p={p} href={`/cadastro?plano=${p.codigo}`} />} />
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/planos"
              className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-primary px-6 py-3 text-base font-semibold text-primary hover:bg-primary hover:text-white"
            >
              Ver todos os planos
            </Link>
            <p className="mt-3 text-sm text-text/65">Também tem o Start (1 empresa, R$ 47) e o Ilimitado (empresas sem limite, R$ 397).</p>
          </div>
        </section>

        <section id="duvidas" className="scroll-mt-24">
          <Titulo sobre="Dúvidas" titulo="Perguntas que sempre aparecem" />
          <div className="mt-6"><ListaDuvidas duvidas={DUVIDAS_ENTRADA} /></div>
          <p className="mt-4 text-base text-text/70">
            Tem mais respostas na <Link href="/planos" className="font-semibold text-primary hover:underline">página dos planos</Link>. Ficou
            outra dúvida? <LinkWhatsApp>Fale com a gente no WhatsApp</LinkWhatsApp>.
          </p>
        </section>

        <section className="fundo-destaque rounded-3xl px-6 py-12 text-center text-white shadow-xl sm:px-10 sm:py-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pronto para tirar a SST da planilha?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">Em poucos minutos você já cadastra a primeira empresa.</p>
          <Link
            href="/cadastro?plano=FREE"
            className="mt-8 inline-flex min-h-[3.25rem] items-center justify-center rounded-xl bg-menta px-8 py-3.5 text-lg font-bold text-primary-escuro shadow-lg shadow-black/20 hover:brightness-95"
          >
            Começar grátis
          </Link>
          <p className="mt-3 text-sm text-white/75">14 dias com tudo liberado, sem falar com ninguém.</p>
        </section>

        <footer className="border-t border-border pb-4 pt-6 text-center text-sm text-text/60">
          <Link href="/privacidade" className="hover:underline">Privacidade</Link> · <Link href="/termos" className="hover:underline">Termos de uso</Link>
          <span className="mt-1 block">Safety Nexo · Gestão inteligente de SST</span>
        </footer>
      </div>
    </main>
  );
}

// Título de seção padrão da página inicial: rótulo pequeno, título grande e texto de apoio.
function Titulo({ sobre, titulo, centro, children }: { sobre: string; titulo: string; centro?: boolean; children?: React.ReactNode }) {
  return (
    <div className={centro ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">{sobre}</p>
      <h2 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-primary sm:text-4xl">{titulo}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-text/75 sm:text-lg">{children}</p>}
    </div>
  );
}
