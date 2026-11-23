'use client';

import { RascunhoAutomatico } from '@/components/RascunhoAutomatico';
import { OQueFalta } from '@/components/OQueFalta';
import { DitadoVoz } from '@/components/DitadoVoz';
import { BotaoLuvaSol, aplicarLuvaSol } from '@/components/LuvaSol';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AjudaDaTela, BotaoAjudaTopo } from '@/components/AjudaDaTela';
import { WhatsAppDuvidas } from '@/components/WhatsAppDuvidas';
import { libera, planoMinimo, usePlano } from '@/lib/plano';
import { Icone } from '@/components/Icone';
import type { Empresa } from '@/lib/api';
import { aoMudarFoco, empresasDaConta, escolherFoco, salvarFoco } from '@/lib/empresaFoco';
import { enderecoDoItem, ItemMenu, MENU, TELAS_DO_MENU } from '@/lib/menu';
import { lerToken, lerUsuario, sair, Usuario } from '@/lib/sessao';

// Telas abertas por quem não entrou no sistema (ou de tela cheia) ficam sem o menu.
const SEM_MENU = [/^\/relato\//, /^\/proposta\//, /^\/votar\//, /^\/meu\//, /^\/entrar/, /^\/cadastro/, /^\/esqueci-senha/, /^\/redefinir-senha/, /^\/planos/, /^\/assinar\//, /^\/assinatura\//, /^\/validar/, /^\/psicossocial\//, /^\/campo/, /\/lista\//];

const CHAVE_FECHADOS = 'safety-nexo:menu-fechados';

// Aba em que cada tela abre quando o endereço vem sem "#".
const ABA_INICIAL: Record<string, string> = { operacao: 'apr', saude: 'aet', prevencao: 'relatos', conectores: 'rh', cultura: 'sipat' };

function empresaDoEndereco(caminho: string): string | null {
  const m = caminho.match(/^\/empresas\/([^/#?]+)/);
  return m && m[1] !== 'nova' ? m[1] : null;
}

export function Moldura({ children }: { children: React.ReactNode }) {
  const caminho = usePathname() ?? '/';
  const [logado, setLogado] = useState<boolean | null>(null);

  useEffect(() => {
    setLogado(!!lerToken());
  }, [caminho]);
  useEffect(() => { aplicarLuvaSol(); }, []);

  if (SEM_MENU.some((r) => r.test(caminho)) || !logado) return <>{children}<WhatsAppDuvidas caminho={caminho} /></>;

  return (
    <div className="min-h-screen md:pl-72">
      <Menu caminho={caminho} />
      <div className="min-w-0 pb-20">
        {/* O painel já tem o próprio "Como usar?" no alto. */}
        <FaixaPlano />
        <AjudaDaTela caminho={caminho} barra={caminho !== '/'} />
        {children}
        <RascunhoAutomatico caminho={caminho} />
        <OQueFalta />
        <DitadoVoz />
      </div>
      <WhatsAppDuvidas caminho={caminho} />
    </div>
  );
}

// Faixa no alto quando o plano venceu: aviso na tolerância e "só para consulta" depois dela.
function FaixaPlano() {
  const plano = usePlano();
  const [cliente, setCliente] = useState(false);
  useEffect(() => { setCliente(lerUsuario()?.papel === 'EMPRESA'); }, []);
  if (!plano?.situacao || plano.situacao === 'EM_DIA') return null;
  const dia = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '');
  const ultimoDia = plano.consultaDesde ? dia(new Date(new Date(plano.consultaDesde).getTime() - 86400000).toISOString()) : '';
  const consulta = plano.situacao === 'CONSULTA';
  if (cliente && !consulta) return null;
  return (
    <div className={`${consulta ? 'bg-danger/10 text-danger' : 'bg-warning/15 text-[#9a3412]'} px-4 py-2.5 text-sm`} role="status">
      {cliente ? (
        <span>Por enquanto este acesso está só para consulta: você pode ver e baixar tudo. Fale com a sua consultoria.</span>
      ) : consulta ? (
        <span><strong>Conta só para consulta.</strong> O plano venceu em {dia(plano.pagoAte)}. Você vê e baixa tudo, mas para criar ou mudar algo é preciso pagar. Nada foi apagado. <Link href="/plano" className="font-semibold underline">Pagar agora</Link></span>
      ) : (
        <span><strong>O seu plano venceu em {dia(plano.pagoAte)}.</strong> Tudo funciona normalmente até {ultimoDia}; depois a conta fica só para consulta até o pagamento. <Link href="/plano" className="font-semibold underline">Pagar agora</Link></span>
      )}
    </div>
  );
}

function Menu({ caminho }: { caminho: string }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [empresaId, setEmpresaId] = useState('');
  const [aberto, setAberto] = useState(false); // gaveta no celular
  const [fechados, setFechados] = useState<string[]>([]);
  const [ancora, setAncora] = useState('');
  const [erro, setErro] = useState(false);
  const [abertoItem, setAbertoItem] = useState(''); // item com partes aberto por clique

  useEffect(() => {
    setUsuario(lerUsuario());
    try {
      setFechados(JSON.parse(localStorage.getItem(CHAVE_FECHADOS) ?? '[]'));
    } catch {}
    return aoMudarFoco(setEmpresaId);
  }, []);

  // Recarrega a lista quando aparece uma empresa nova no endereço (logo depois de cadastrar).
  useEffect(() => {
    const doEndereco = empresaDoEndereco(caminho);
    const pedida = doEndereco ?? new URLSearchParams(window.location.search).get('empresa');
    const recarregar = !!doEndereco && !!empresas && !empresas.some((e) => e.id === doEndereco);
    empresasDaConta(recarregar)
      .then((lista) => {
        setErro(false);
        setEmpresas(lista);
        const id = escolherFoco(lista, pedida ?? lerUsuario()?.empresaId);
        setEmpresaId(id);
        if (id) salvarFoco(id);
      })
      .catch(() => setErro(true));
    setAberto(false);
    setAncora(window.location.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho]);

  useEffect(() => {
    const ler = () => { setAncora(window.location.hash); setAberto(false); };
    window.addEventListener('hashchange', ler);
    return () => window.removeEventListener('hashchange', ler);
  }, []);

  // Deixa o item da tela aberta à vista no menu, mesmo lá embaixo.
  useEffect(() => {
    document.querySelector('aside nav [aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [caminho, ancora, empresaId, empresas]);

  const cliente = usuario?.papel === 'EMPRESA';
  const plano = usePlano();
  const empresa = empresas?.find((e) => e.id === empresaId);

  function trocarEmpresa(id: string) {
    setEmpresaId(id);
    salvarFoco(id);
    const atual = empresaDoEndereco(caminho);
    if (atual) router.push(caminho.replace(`/empresas/${atual}`, `/empresas/${id}`) + window.location.hash);
  }

  function alternarGrupo(titulo: string) {
    const novo = fechados.includes(titulo) ? fechados.filter((t) => t !== titulo) : [...fechados, titulo];
    setFechados(novo);
    try {
      localStorage.setItem(CHAVE_FECHADOS, JSON.stringify(novo));
    } catch {}
  }

  function ativo(item: ItemMenu): boolean {
    const destino = enderecoDoItem(item, empresaId);
    if (!empresaId && !item.geral) return false;
    const [rota, hash] = destino.split('#');
    if (rota !== caminho) return false;
    if (!hash) return !ancora || !TELAS_DO_MENU.some((i) => enderecoDoItem(i, empresaId) === `${rota}${ancora}`);
    return ancora === `#${hash}` || (!ancora && primeiraAba(rota) === hash);
  }

  // Sem "#" no endereço, a tela abre na primeira aba: ela fica marcada no menu.
  function primeiraAba(rota: string) {
    const tela = rota.split('/').pop() ?? '';
    if (ABA_INICIAL[tela]) return ABA_INICIAL[tela];
    const item = TELAS_DO_MENU.find((i) => enderecoDoItem(i, empresaId).startsWith(`${rota}#`));
    return item ? item.rota.split('#')[1] : '';
  }

  const visivel = (i: ItemMenu) => !(cliente && i.soConsultoria);
  const partesVisiveis = (item: ItemMenu) => (item.partes ?? []).filter(visivel);

  // Mesma tela, outra aba: avisa a tela para trocar de aba.
  // No celular, fecha a gaveta do menu em todo toque num item. Antes ela só fechava quando mudava a tela;
  // trocando de aba na mesma tela (ex.: SIPAT -> 5S) a gaveta ficava aberta e cobria tudo, parecendo travada.
  function avisarAba() {
    setAberto(false);
    setTimeout(() => {
      setAncora(window.location.hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 60);
  }

  function linkDoItem(item: ItemMenu, filho: boolean) {
    const marcado = ativo(item);
    const travado = !empresaId && !item.geral;
    const doPlano = !libera(plano, item.recurso); // o plano não libera: abre "Meu plano"
    return (
      <Link
        href={doPlano ? `/plano?recurso=${item.recurso}` : enderecoDoItem(item, empresaId)}
        title={doPlano ? `Faz parte do plano ${planoMinimo(item.recurso!)} ou maior` : travado ? 'Cadastre uma empresa para abrir' : undefined}
        onClick={avisarAba}
        aria-current={marcado ? 'page' : undefined}
        className={`group flex items-center gap-3 rounded-lg transition ${filho ? 'py-1.5 pl-3 pr-2.5 text-[13px]' : 'px-2.5 py-2 text-sm'} ${
          marcado
            ? 'bg-white text-primary shadow-sm'
            : travado
              ? 'text-white/45 hover:bg-white/5'
              : filho
                ? 'text-white/75 hover:bg-white/10 hover:text-white'
                : 'text-white/85 hover:bg-white/10 hover:text-white'
        }`}
      >
        {filho ? (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${marcado ? 'bg-success' : 'bg-menta/60'}`} />
        ) : (
          <Icone nome={item.icone} className={`h-[18px] w-[18px] shrink-0 ${marcado ? 'text-success' : 'text-menta/80 group-hover:text-menta'}`} />
        )}
        <span className="truncate font-medium">{item.nome}</span>
        {doPlano && <Icone nome="cadeado" className="ml-auto h-4 w-4 shrink-0 text-white/50" />}
      </Link>
    );
  }

  // Item com partes: abre a lista logo abaixo e leva à primeira parte.
  function itemComPartes(item: ItemMenu, partes: ItemMenu[]) {
    const dentro = partes.some(ativo);
    const expandido = dentro || abertoItem === item.nome;
    const primeira = partes[0];
    const travado = !empresaId && !primeira.geral;
    const doPlano = !libera(plano, primeira.recurso);
    return (
      <>
        <Link
          href={doPlano ? `/plano?recurso=${primeira.recurso}` : enderecoDoItem(primeira, empresaId)}
          title={travado ? 'Cadastre uma empresa para abrir' : undefined}
          onClick={() => { setAbertoItem(item.nome); avisarAba(); }}
          aria-expanded={expandido}
          className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
            dentro ? 'bg-white/10 text-white' : travado ? 'text-white/45 hover:bg-white/5' : 'text-white/85 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icone nome={item.icone} className={`h-[18px] w-[18px] shrink-0 ${dentro ? 'text-menta' : 'text-menta/80 group-hover:text-menta'}`} />
          <span className="truncate font-medium">{item.nome}</span>
          <Icone nome="seta" className={`ml-auto h-3.5 w-3.5 shrink-0 text-white/40 transition ${expandido ? 'rotate-90' : ''}`} />
        </Link>
        {expandido && (
          <ul className="mb-1 ml-[1.15rem] mt-0.5 space-y-0.5 border-l border-white/15 pl-2">
            {partes.map((p) => <li key={p.nome}>{linkDoItem(p, true)}</li>)}
          </ul>
        )}
      </>
    );
  }

  const conteudo = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-md shadow-black/20">
          <img src="/logo.png" alt="" className="h-7 w-auto" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight tracking-tight text-white">Safety Nexo</p>
          <p className="text-xs text-white/60">Gestão inteligente de SST</p>
        </div>
        <button type="button" onClick={() => setAberto(false)} className="ml-auto rounded-lg p-1.5 text-white/70 hover:bg-white/10 md:hidden" aria-label="Fechar menu">
          <Icone nome="fechar" />
        </button>
      </div>

      <div className="mx-4 rounded-xl bg-white/[0.07] p-3 ring-1 ring-white/10" data-tour="empresa">
        <label htmlFor="menu-empresa" className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Empresa em foco
        </label>
        {empresas && empresas.length > 0 ? (
          <select
            id="menu-empresa"
            value={empresaId}
            onChange={(e) => trocarEmpresa(e.target.value)}
            disabled={cliente}
            className="mt-1 w-full cursor-pointer truncate rounded-lg border-0 bg-white/95 px-2.5 py-2 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-menta disabled:cursor-default"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.razaoSocial}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-1 text-sm text-white/80">
            {erro ? 'Não consegui falar com o servidor. Tente de novo em instantes.' : empresas ? 'Nenhuma empresa cadastrada ainda.' : 'Carregando…'}
          </p>
        )}
        {!cliente && (
          <Link
            href="/empresas/nova"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-menta px-3 py-2 text-sm font-bold text-primary-escuro transition hover:brightness-105"
          >
            <Icone nome="mais" className="h-4 w-4" /> Nova empresa
          </Link>
        )}
        <Link
          href={libera(plano, 'offline') ? '/campo' : '/plano?recurso=offline'}
          title={libera(plano, 'offline') ? 'Para usar na obra, mesmo sem internet' : `Faz parte do plano ${planoMinimo('offline')} ou maior`}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/10"
        >
          <Icone nome="sinal" className="h-4 w-4" /> Modo campo
          {!libera(plano, 'offline') && <Icone nome="cadeado" className="h-4 w-4 text-white/60" />}
        </Link>
      </div>

      {empresas && !empresa && !cliente && (
        <p className="mx-4 mt-3 rounded-lg bg-warning/15 px-3 py-2 text-xs text-white/90 ring-1 ring-warning/30">
          Os módulos abaixo abrem depois que você cadastrar a primeira empresa.
        </p>
      )}

      <nav className="menu-rolagem mt-3 flex-1 overflow-y-auto px-3 pb-4" aria-label="Menu principal">
        {MENU.map((grupo) => {
          const itens = grupo.itens.filter((i) => (i.partes ? partesVisiveis(i).length > 0 : visivel(i)));
          if (!itens.length) return null;
          const fechado = !!grupo.titulo && fechados.includes(grupo.titulo);
          return (
            <div key={grupo.titulo || 'inicio'} className="mt-3">
              {grupo.titulo && (
                <button
                  type="button"
                  onClick={() => alternarGrupo(grupo.titulo)}
                  aria-expanded={!fechado}
                  className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/45 hover:text-white/70"
                >
                  {grupo.titulo}
                  <Icone nome="seta" className={`h-3.5 w-3.5 transition ${fechado ? '' : 'rotate-90'}`} />
                </button>
              )}
              {!fechado && (
                <ul className="mt-0.5 space-y-0.5">
                  {itens.map((item) => {
                    const partes = partesVisiveis(item);
                    return (
                      <li key={item.nome}>
                        {partes.length > 1 ? itemComPartes(item, partes) : linkDoItem(partes[0] ? { ...partes[0], nome: item.nome, icone: item.icone } : item, false)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        {usuario?.adminPlataforma && (
          <Link
            href="/admin"
            className={`mb-1 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold transition ${
              caminho === '/admin' || caminho.startsWith('/admin/') ? 'bg-white text-primary' : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Icone nome="coroa" className="h-[18px] w-[18px]" /> Painel ADM da plataforma
          </Link>
        )}
        <Link href="/ajuda" className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${caminho === '/ajuda' ? 'bg-white text-primary' : 'text-white/85 hover:bg-white/10'}`}>
          <Icone nome="interrogacao" className="h-[18px] w-[18px] text-menta/80" /> Central de ajuda
        </Link>
        <div className="mt-1 px-1"><BotaoLuvaSol claro /></div>
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-black/15 px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-menta text-sm font-bold text-primary-escuro">
            {(usuario?.nome ?? '?').trim().charAt(0).toUpperCase()}
          </span>
          <Link href="/perfil" className="min-w-0 flex-1 rounded hover:opacity-90" title="Meu perfil">
            <p className="truncate text-sm font-semibold text-white">{usuario?.nome ?? 'Minha conta'}</p>
            <p className="text-xs text-white/50">{cliente ? 'Empresa cliente' : 'Consultoria'} · meu perfil</p>
          </Link>
        </div>
        {/* Sair bem à vista: para entrar com outra conta (ex.: ver o sistema como um cliente vê). */}
        <button type="button" onClick={sair} className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
          <Icone nome="sair" className="h-[18px] w-[18px] text-menta/80" /> Sair da conta
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Celular: barra no topo com o botão do menu. */}
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-primary px-4 py-3 text-white shadow md:hidden">
        <button type="button" onClick={() => setAberto(true)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Abrir menu">
          <Icone nome="menu" className="h-6 w-6" />
        </button>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
          <img src="/logo.png" alt="" className="h-5 w-auto" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Safety Nexo</p>
          {empresa && <p className="truncate text-xs text-white/70">{empresa.razaoSocial}</p>}
        </div>
        <BotaoAjudaTopo caminho={caminho} />
      </header>

      <aside className="fundo-menu fixed inset-y-0 left-0 z-40 hidden w-72 md:block">{conteudo}</aside>

      {aberto && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setAberto(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="fundo-menu absolute inset-y-0 left-0 w-[85%] max-w-xs shadow-2xl" onClick={(e) => {
            // Tocou num link (qualquer um, até o da tela já aberta): a gaveta fecha.
            if ((e.target as HTMLElement).closest('a')) setAberto(false);
            e.stopPropagation();
          }}>
            {conteudo}
          </aside>
        </div>
      )}

    </>
  );
}
