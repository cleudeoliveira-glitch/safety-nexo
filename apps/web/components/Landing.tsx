'use client';

import Link from 'next/link';
import { DUVIDAS_PLANOS, DUVIDAS_SISTEMA, LinkWhatsApp, ListaDuvidas } from '@/components/DuvidasPlanos';
import { Icone, NomeIcone } from '@/components/Icone';
import { PLANOS_SITE, reais, textoLimite } from '@/lib/planos';

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

const DOCUMENTOS: { grupo: string; itens: string[] }[] = [
  { grupo: 'Programas e laudos', itens: ['PGR com inventário de riscos e plano de ação', 'PCMSO com relatório anual', 'LTCAT', 'Laudo de insalubridade e periculosidade (LIP)', 'AET e AEP (ergonomia, NR-17)', 'PGRTR (trabalho rural)', 'PPP'] },
  { grupo: 'Dia a dia da segurança', itens: ['APR e permissões de trabalho (altura, quente, espaço confinado, içamento, escavação)', 'Ordem de serviço por função', 'Ficha de EPI e almoxarifado', 'DDS com 150 temas prontos', 'Inspeções e checklists das NRs'] },
  { grupo: 'Pessoas e saúde', itens: ['Treinamentos das NRs com slides e certificado', 'CIPA: dimensionamento, eleição e atas', 'Brigada e plano de emergência', 'Avaliação psicossocial (NR-01)', 'ASO, afastamentos e CAT', 'eSocial S-2210, S-2220 e S-2240'] },
];

// Na página inicial, as dúvidas de quem ainda não conhece o sistema, mais as três de plano que mais aparecem.
const DUVIDAS_ENTRADA = [...DUVIDAS_SISTEMA.slice(0, 7), ...DUVIDAS_PLANOS.filter((d) => ['Preciso de cartão para testar?', 'Tem fidelidade ou multa?', 'Qual plano devo escolher?'].includes(d.pergunta))];

export function Landing() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/"><img src="/logo.png" alt="Safety Nexo" className="h-9 w-auto" /></a>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="#recursos" className="hidden rounded-card px-3 py-2 text-text/70 hover:text-primary md:inline">Recursos</a>
            <a href="#documentos" className="hidden rounded-card px-3 py-2 text-text/70 hover:text-primary md:inline">Documentos</a>
            <a href="#planos" className="hidden rounded-card px-3 py-2 text-text/70 hover:text-primary sm:inline">Planos</a>
            <a href="#duvidas" className="hidden rounded-card px-3 py-2 text-text/70 hover:text-primary md:inline">Dúvidas</a>
            <Link href="/entrar" className="rounded-card px-3 py-2 font-semibold text-text/70 hover:text-primary">Entrar</Link>
            <a href="#planos" className="rounded-card bg-primary px-4 py-2 font-semibold text-white hover:opacity-90">Ver planos</a>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-8 sm:px-6 lg:py-12">
          <section className="rounded-card bg-primary-escuro px-6 py-10 text-white sm:px-10 sm:py-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-menta">Gestão inteligente de SST</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
              Toda a segurança do trabalho dos seus clientes, num lugar só.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
              O Safety Nexo foi feito por quem vive SST há mais de 13 anos. Você elabora PGR, PCMSO, LTCAT e os demais documentos, cuida
              do dia a dia em campo e acompanha os vencimentos de cada empresa, sem planilha espalhada e sem copiar e colar entre arquivos
              do Word.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#planos" className="rounded-card bg-menta px-5 py-3 font-semibold text-primary-escuro hover:brightness-95">
                Escolher meu plano
              </a>
              <a href="#recursos" className="rounded-card border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">
                Ver o que ele faz
              </a>
            </div>
            <p className="mt-4 text-sm text-white/60">14 dias com tudo liberado para testar. Sem instalar nada.</p>
          </section>

          <section id="recursos" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold text-primary">Para que serve</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-text/75">
              Para o profissional de SST parar de perder tempo com papel e retrabalho. Você cadastra a empresa uma vez, monta os setores
              (GHE) com os riscos de cada função, e o sistema gera os programas, os laudos e os documentos do dia a dia já ligados entre
              si. Mudou um risco no setor? PGR, PCMSO, LTCAT e ordem de serviço já saem atualizados na próxima emissão.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {BENEFICIOS.map((b) => (
                <div key={b.titulo} className="rounded-card border border-border bg-white p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary/10 text-primary">
                    <Icone nome={b.icone} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-semibold">{b.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text/70">{b.texto}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="publico" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold text-primary">Para quem é</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {PUBLICO.map((p) => (
                <span key={p} className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-white">{p}</span>
              ))}
            </div>
            <p className="mt-5 text-text/75">Atende empresas de qualquer ramo. Você informa o CNAE e o sistema já traz o grau de risco. Alguns ramos em que ele é usado:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {RAMOS.map((r) => (
                <span key={r} className="rounded-full border border-border bg-white px-3 py-1.5 text-sm">{r}</span>
              ))}
            </div>
          </section>

          <section id="documentos" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold text-primary">Documentos que o sistema elabora</h2>
            <p className="mt-2 text-text/70">Todos em PDF, com a logo da empresa atendida e a da sua consultoria.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {DOCUMENTOS.map((g) => (
                <div key={g.grupo} className="rounded-card border border-border bg-white p-5">
                  <h3 className="font-semibold">{g.grupo}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-text/75">
                    {g.itens.map((i) => (
                      <li key={i} className="flex gap-2">
                        <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="planos" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold text-primary">Planos</h2>
            <p className="mt-2 text-text/70">Escolha o plano, crie a sua conta e comece a usar. O que muda de um plano para outro é, principalmente, quantas empresas você atende.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {PLANOS_SITE.map((p) => (
                <div
                  key={p.codigo}
                  className={`flex flex-col rounded-card border bg-white p-5 ${p.destaque ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                >
                  {p.destaque && <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Mais escolhido</span>}
                  <span className="font-semibold">{p.nome}</span>
                  <span className="mt-1 text-2xl font-semibold text-primary">
                    {p.precoMensal ? reais(p.precoMensal) : 'R$ 0'}<span className="text-sm font-normal text-text/60">/mês</span>
                  </span>
                  <span className="mt-1 text-sm font-semibold text-text/80">{textoLimite(p.limiteEmpresas)}</span>
                  <span className="mt-2 flex-1 text-sm text-text/65">{p.paraQuem}</span>
                  <Link
                    href={`/cadastro?plano=${p.codigo}`}
                    className={`mt-4 block rounded-card px-4 py-2.5 text-center text-sm font-semibold ${p.destaque ? 'bg-primary text-white hover:opacity-90' : 'border border-border hover:border-primary hover:text-primary'}`}
                  >
                    {p.precoMensal ? `Quero o ${p.nome}` : 'Começar grátis'}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">
              <Link href="/planos" className="font-semibold text-primary hover:underline">Comparar tudo o que vem em cada plano</Link>
              <span className="text-text/60"> · No anual, 2 meses saem de graça.</span>
            </p>
          </section>

          <section id="duvidas" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold text-primary">Dúvidas frequentes</h2>
            <div className="mt-4"><ListaDuvidas duvidas={DUVIDAS_ENTRADA} /></div>
            <p className="mt-3 text-sm text-text/60">
              Tem mais respostas na <Link href="/planos" className="font-semibold text-primary hover:underline">página dos planos</Link>. Ficou
              outra dúvida? <LinkWhatsApp>Fale com a gente no WhatsApp</LinkWhatsApp>.
            </p>
          </section>

          <section className="rounded-card bg-primary px-6 py-10 text-center text-white sm:px-10">
            <h2 className="text-2xl font-semibold sm:text-3xl">Pronto para tirar a SST da planilha?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">Escolha o seu plano e, em poucos minutos, você já cadastra a primeira empresa.</p>
            <a href="#planos" className="mt-6 inline-block rounded-card bg-menta px-6 py-3 font-semibold text-primary-escuro hover:brightness-95">Escolher meu plano</a>
          </section>

          <footer className="border-t border-border pt-6 pb-4 text-center text-xs text-text/60">
            <Link href="/privacidade" className="hover:underline">Privacidade</Link> · <Link href="/termos" className="hover:underline">Termos de uso</Link>
            <span className="block mt-1">Safety Nexo · Gestão inteligente de SST</span>
          </footer>
      </div>
    </main>
  );
}
