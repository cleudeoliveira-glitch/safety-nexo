'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dicionario } from '@/components/Dicionario';
import { Icone } from '@/components/Icone';
import type { Empresa } from '@/lib/api';
import { aoMudarFoco, empresasDaConta, escolherFoco, salvarFoco } from '@/lib/empresaFoco';
import { enderecoDoItem, ItemMenu, MENU } from '@/lib/menu';
import { lerToken, lerUsuario, sair, Usuario } from '@/lib/sessao';

// Telas abertas por quem não entrou no sistema (ou de tela cheia) ficam sem o menu.
const SEM_MENU = [/^\/relato\//, /^\/proposta\//, /^\/votar\//, /^\/meu\//, /^\/entrar/, /^\/cadastro/, /^\/planos/, /^\/assinar\//, /^\/assinatura\//, /^\/validar/, /^\/psicossocial\//, /^\/campo/, /\/lista\//];

const CHAVE_FECHADOS = 'safety-nexo:menu-fechados';

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

  if (SEM_MENU.some((r) => r.test(caminho)) || !logado) return <>{children}</>;

  return (
    <div className="min-h-screen md:pl-72">
      <Menu caminho={caminho} />
      <div className="min-w-0">{children}</div>
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
  const [dicionario, setDicionario] = useState(false);
  const [erro, setErro] = useState(false);

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
    const ler = () => setAncora(window.location.hash);
    window.addEventListener('hashchange', ler);
    return () => window.removeEventListener('hashchange', ler);
  }, []);

  // Deixa o item da tela aberta à vista no menu, mesmo lá embaixo.
  useEffect(() => {
    document.querySelector('aside nav [aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [caminho, ancora, empresaId, empresas]);

  const cliente = usuario?.papel === 'EMPRESA';
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
    if (!hash) return !ancora || !MENU.some((g) => g.itens.some((i) => enderecoDoItem(i, empresaId) === `${rota}${ancora}`));
    return ancora === `#${hash}` || (!ancora && primeiraAba(rota) === hash);
  }

  // Sem "#" no endereço, a tela abre na primeira aba: ela fica marcada no menu.
  function primeiraAba(rota: string) {
    const item = MENU.flatMap((g) => g.itens).find((i) => enderecoDoItem(i, empresaId).startsWith(`${rota}#`));
    return item ? item.rota.split('#')[1] : '';
  }

  const conteudo = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-md shadow-black/20">
          <img src="/logo.png" alt="" className="h-7 w-auto" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight tracking-tight text-white">Safety Nexo</p>
          <p className="text-xs text-white/60">Segurança do trabalho</p>
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
      </div>

      {empresas && !empresa && !cliente && (
        <p className="mx-4 mt-3 rounded-lg bg-warning/15 px-3 py-2 text-xs text-white/90 ring-1 ring-warning/30">
          Os módulos abaixo abrem depois que você cadastrar a primeira empresa.
        </p>
      )}

      <nav className="menu-rolagem mt-3 flex-1 overflow-y-auto px-3 pb-4" aria-label="Menu principal">
        {MENU.map((grupo) => {
          const itens = grupo.itens.filter((i) => !(cliente && i.soConsultoria));
          if (!itens.length) return null;
          const fechado = fechados.includes(grupo.titulo);
          return (
            <div key={grupo.titulo} className="mt-3">
              <button
                type="button"
                onClick={() => alternarGrupo(grupo.titulo)}
                aria-expanded={!fechado}
                className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/45 hover:text-white/70"
              >
                {grupo.titulo}
                <Icone nome="seta" className={`h-3.5 w-3.5 transition ${fechado ? '' : 'rotate-90'}`} />
              </button>
              {!fechado && (
                <ul className="mt-0.5 space-y-0.5">
                  {itens.map((item) => {
                    const marcado = ativo(item);
                    const travado = !empresaId && !item.geral;
                    return (
                      <li key={item.nome}>
                        <Link
                          href={enderecoDoItem(item, empresaId)}
                          title={travado ? 'Cadastre uma empresa para abrir' : undefined}
                          onClick={() => {
                            // Mesma tela, outra aba: avisa a tela para trocar de aba.
                            setTimeout(() => {
                              setAncora(window.location.hash);
                              window.dispatchEvent(new HashChangeEvent('hashchange'));
                            }, 60);
                          }}
                          aria-current={marcado ? 'page' : undefined}
                          className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
                            marcado
                              ? 'bg-white text-primary shadow-sm'
                              : travado
                                ? 'text-white/45 hover:bg-white/5'
                                : 'text-white/85 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icone nome={item.icone} className={`h-[18px] w-[18px] shrink-0 ${marcado ? 'text-success' : 'text-menta/80 group-hover:text-menta'}`} />
                          <span className="truncate font-medium">{item.nome}</span>
                        </Link>
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
              caminho === '/admin' ? 'bg-white text-primary' : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Icone nome="coroa" className="h-[18px] w-[18px]" /> Painel ADM da plataforma
          </Link>
        )}
        <button type="button" onClick={() => setDicionario(true)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/10">
          <Icone nome="livro" className="h-[18px] w-[18px] text-menta/80" /> Dicionário SST
        </button>
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-black/15 px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-menta text-sm font-bold text-primary-escuro">
            {(usuario?.nome ?? '?').trim().charAt(0).toUpperCase()}
          </span>
          <Link href="/perfil" className="min-w-0 flex-1 rounded hover:opacity-90" title="Meu perfil">
            <p className="truncate text-sm font-semibold text-white">{usuario?.nome ?? 'Minha conta'}</p>
            <p className="text-xs text-white/50">{cliente ? 'Empresa cliente' : 'Consultoria'} · meu perfil</p>
          </Link>
          <button type="button" onClick={sair} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" title="Sair" aria-label="Sair">
            <Icone nome="sair" className="h-[18px] w-[18px]" />
          </button>
        </div>
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
      </header>

      <aside className="fundo-menu fixed inset-y-0 left-0 z-40 hidden w-72 md:block">{conteudo}</aside>

      {aberto && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setAberto(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="fundo-menu absolute inset-y-0 left-0 w-[85%] max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {conteudo}
          </aside>
        </div>
      )}

      {dicionario && <Dicionario onFechar={() => setDicionario(false)} />}
    </>
  );
}
