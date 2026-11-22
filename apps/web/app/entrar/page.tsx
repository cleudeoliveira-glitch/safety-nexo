'use client';

import Link from 'next/link';
import { useState } from 'react';
import { JaConectado } from '@/components/JaConectado';
import { DUVIDAS_PLANOS, DUVIDAS_SISTEMA, LinkWhatsApp, ListaDuvidas } from '@/components/DuvidasPlanos';
import { Icone, NomeIcone } from '@/components/Icone';
import { Aviso, Botao, Campo } from '@/components/ui';
import { entrar } from '@/lib/api';
import { PLANOS_SITE, reais, textoLimite } from '@/lib/planos';
import { salvarToken, salvarUsuario } from '@/lib/sessao';

// Tela de entrada. A caixinha de login fica como sempre (à direita no computador, no topo no celular)
// e o resto da página apresenta o Safety Nexo para quem ainda não conhece.

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

// No login, as dúvidas de quem ainda não conhece o sistema, mais as três de plano que mais aparecem.
const DUVIDAS_ENTRADA = [...DUVIDAS_SISTEMA.slice(0, 7), ...DUVIDAS_PLANOS.filter((d) => ['Preciso de cartão para testar?', 'Tem fidelidade ou multa?', 'Qual plano devo escolher?'].includes(d.pergunta))];

export default function Entrar() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    try {
      const acesso = await entrar({ email: String(dados.get('email')), senha: String(dados.get('senha')) });
      salvarToken(acesso.token);
      salvarUsuario(acesso.usuario);
      window.location.href = '/';
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:py-10">
        {/* Caixinha de login: no celular vem primeiro, no computador fica fixa à direita. */}
        <div className="lg:order-2">
          <form onSubmit={enviar} className="space-y-5 rounded-card border border-border bg-white p-6 shadow-sm sm:p-8 lg:sticky lg:top-8">
            <img src="/logo.png" alt="Safety Nexo" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-semibold text-primary">Entrar</h1>
              <p className="text-sm text-text/60">Gestão inteligente de SST.</p>
            </div>
            <JaConectado />
            <Campo id="email" name="email" type="email" rotulo="E-mail" required autoComplete="email" placeholder="Ex.: voce@empresa.com.br" />
            <div>
              <Campo id="senha" name="senha" type="password" rotulo="Senha" required autoComplete="current-password" placeholder="Sua senha" />
              <p className="mt-2 text-right text-sm">
                <Link href="/esqueci-senha" className="font-semibold text-primary hover:underline">Esqueci minha senha</Link>
              </p>
            </div>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao type="submit" disabled={enviando} className="w-full">{enviando ? 'Entrando…' : 'Entrar'}</Botao>
            <p className="text-center text-sm">
              Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-primary">Crie grátis</Link>
            </p>
            <a href="#conheca" className="flex items-center justify-center gap-1 text-center text-sm text-text/60 hover:text-primary lg:hidden">
              Conheça o Safety Nexo
              <Icone nome="seta" className="h-4 w-4 rotate-90" />
            </a>
          </form>
        </div>

        {/* Apresentação do sistema */}
        <div id="conheca" className="min-w-0 space-y-14 lg:order-1">
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
              <Link href="/cadastro" className="rounded-card bg-menta px-5 py-3 font-semibold text-primary-escuro hover:brightness-95">
                Testar 14 dias grátis
              </Link>
              <Link href="/planos" className="rounded-card border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">
                Ver os planos
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/60">Sem cartão de crédito. Sem instalar nada. Tudo liberado nos 14 dias.</p>
          </section>

          <section>
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

          <section>
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

          <section>
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

          <section>
            <h2 className="text-2xl font-semibold text-primary">Planos</h2>
            <p className="mt-2 text-text/70">Comece grátis. O que muda de um plano para outro é, principalmente, quantas empresas você atende.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {PLANOS_SITE.map((p) => (
                <Link
                  key={p.codigo}
                  href={`/cadastro?plano=${p.codigo}`}
                  className={`rounded-card border bg-white p-4 transition hover:border-primary ${p.destaque ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                >
                  {p.destaque && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">Mais escolhido</span>}
                  <span className="block font-semibold">{p.nome}</span>
                  <span className="mt-1 block text-xl font-semibold text-primary">
                    {p.precoMensal ? reais(p.precoMensal) : "R$ 0"}<span className="text-sm font-normal text-text/60">/mês</span>
                  </span>
                  <span className="mt-1 block text-xs text-text/60">{textoLimite(p.limiteEmpresas)}</span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm">
              <Link href="/planos" className="font-semibold text-primary hover:underline">Ver o que tem em cada plano</Link>
              <span className="text-text/60"> · No anual, 2 meses saem de graça.</span>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary">Dúvidas frequentes</h2>
            <div className="mt-4"><ListaDuvidas duvidas={DUVIDAS_ENTRADA} /></div>
            <p className="mt-3 text-sm text-text/60">
              Tem mais respostas na <Link href="/planos" className="font-semibold text-primary hover:underline">página dos planos</Link>. Ficou
              outra dúvida? <LinkWhatsApp>Fale com a gente no WhatsApp</LinkWhatsApp>.
            </p>
          </section>

          <footer className="border-t border-border pt-6 pb-4 text-center text-xs text-text/60">
            <Link href="/privacidade" className="hover:underline">Privacidade</Link> · <Link href="/termos" className="hover:underline">Termos de uso</Link>
            <span className="block mt-1">Safety Nexo · Gestão inteligente de SST</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
