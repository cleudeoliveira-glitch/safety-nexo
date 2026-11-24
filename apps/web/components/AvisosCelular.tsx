'use client';

import { useEffect, useState } from 'react';
import { Aviso, Botao } from '@/components/ui';
import { admin } from '@/lib/api';

type Situacao = 'carregando' | 'sem-suporte' | 'iphone-fora-da-tela' | 'bloqueado' | 'desligado' | 'ligado';

function chaveParaBytes(base64: string) {
  const b = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function qualAparelho() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  return 'Computador';
}

const abertoPelaTelaDeInicio = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registro() {
  // O site já registra o sw.js ao abrir; aqui garante que ele existe mesmo se ainda não tiver terminado.
  return (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js'));
}

// Cartão do Painel ADM: liga os avisos na tela do celular e escolhe quais chegam.
export function AvisosCelular() {
  const [situacao, setSituacao] = useState<Situacao>('carregando');
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [aparelho, setAparelho] = useState('Computador');
  const [tipos, setTipos] = useState<{ id: string; nome: string }[]>([]);
  const [pref, setPref] = useState<Record<string, boolean>>({});
  const [qtosAparelhos, setQtosAparelhos] = useState<number | null>(null);

  async function conferir() {
    const qual = qualAparelho();
    setAparelho(qual);
    const temSuporte = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!temSuporte) {
      setSituacao(qual === 'iPhone' && !abertoPelaTelaDeInicio() ? 'iphone-fora-da-tela' : 'sem-suporte');
      return;
    }
    if (Notification.permission === 'denied') return setSituacao('bloqueado');
    const reg = await navigator.serviceWorker.getRegistration('/');
    const inscricao = await reg?.pushManager.getSubscription();
    setSituacao(inscricao && Notification.permission === 'granted' ? 'ligado' : 'desligado');
  }

  useEffect(() => {
    conferir().catch(() => setSituacao('sem-suporte'));
    admin.avisosCelular().then((r) => { setTipos(r.tipos ?? []); setPref(r.preferencias ?? {}); setQtosAparelhos(r.aparelhos.length); }).catch(() => undefined);
  }, []);

  async function trocarTipo(id: string, ligado: boolean) {
    setPref((p) => ({ ...p, [id]: ligado }));
    try { setPref(await admin.preferenciasAvisos({ [id]: ligado })); }
    catch (e) { setPref((p) => ({ ...p, [id]: !ligado })); setMsg({ tipo: 'erro', texto: (e as Error).message }); }
  }

  async function ligar() {
    setOcupado(true);
    setMsg(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setSituacao(permissao === 'denied' ? 'bloqueado' : 'desligado');
        return;
      }
      const { chavePublica } = await admin.avisosCelular();
      const reg = await registro();
      await navigator.serviceWorker.ready;
      let inscricao = await reg.pushManager.getSubscription();
      if (!inscricao) inscricao = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) });
      const j = inscricao.toJSON();
      await admin.ligarAvisosCelular({ endpoint: inscricao.endpoint, keys: { p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' }, aparelho });
      setSituacao('ligado');
      setQtosAparelhos((n) => (n ?? 0) + 1);
      setMsg({ tipo: 'ok', texto: 'Pronto! Este aparelho vai receber os avisos. Toque em "Mandar um teste" para conferir.' });
    } catch (e) {
      setMsg({ tipo: 'erro', texto: `Não deu para ligar: ${(e as Error).message}` });
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const inscricao = await reg?.pushManager.getSubscription();
      if (inscricao) {
        await admin.desligarAvisosCelular(inscricao.endpoint).catch(() => undefined);
        await inscricao.unsubscribe();
      }
      setSituacao('desligado');
      setMsg({ tipo: 'ok', texto: 'Avisos desligados neste aparelho.' });
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    setMsg(null);
    try {
      const r = await admin.testarAvisosCelular();
      setMsg({ tipo: 'ok', texto: `Teste enviado para ${r.enviados} de ${r.aparelhos} aparelho(s). Se a tela estiver bloqueada, o aviso aparece nela em alguns segundos.` });
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-primary">Avisos no celular</h2>
      <p className="mt-1 text-sm text-text/70">
        O aviso cai na tela do seu celular, mesmo bloqueada: cadastro novo, plano contratado, cliente entrando pela primeira vez, erro novo, cliente pedindo ajuda, norma para aprovar e um resumo do dia às 8h. Ligue em cada aparelho que você usa.
      </p>
      {qtosAparelhos !== null && (
        <p className={`mt-2 text-sm font-semibold ${qtosAparelhos ? 'text-success' : 'text-[#9a3412]'}`}>
          {qtosAparelhos ? `${qtosAparelhos} aparelho(s) seu(s) recebendo avisos.` : 'Nenhum aparelho seu recebe avisos ainda. Abra esta tela no celular e toque em "Ligar avisos neste aparelho".'}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {situacao === 'carregando' && <p className="text-sm text-text/60">Conferindo este aparelho…</p>}

        {situacao === 'iphone-fora-da-tela' && (
          <div className="rounded-card border border-border bg-background p-4 text-sm">
            <p className="font-semibold">No iPhone, falta um passo antes:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Abra este site no <strong>Safari</strong>.</li>
              <li>Toque no botão de <strong>compartilhar</strong> (o quadrado com a seta para cima).</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong> e depois <strong>Adicionar</strong>.</li>
              <li>Abra o Safety Nexo pelo <strong>ícone novo</strong> na tela do iPhone, entre na conta e volte a esta tela.</li>
            </ol>
            <p className="mt-2 text-text/60">O iPhone só deixa o site mandar avisos quando ele está na Tela de Início. Precisa do iOS 16.4 ou mais novo.</p>
          </div>
        )}

        {situacao === 'sem-suporte' && (
          <Aviso tipo="info">Este navegador não recebe avisos. No Android, use o Chrome. No iPhone, use o Safari e adicione o site à Tela de Início.</Aviso>
        )}

        {situacao === 'bloqueado' && (
          <Aviso tipo="info">
            Os avisos deste site foram bloqueados neste aparelho. Para liberar: {aparelho === 'iPhone' ? 'Ajustes > Notificações > Safety Nexo > Permitir Notificações.' : aparelho === 'Android' ? 'no Chrome, toque no cadeado ao lado do endereço > Permissões > Notificações > Permitir.' : 'clique no cadeado ao lado do endereço > Notificações > Permitir.'} Depois recarregue a página.
          </Aviso>
        )}

        {situacao === 'desligado' && <Botao onClick={ligar} disabled={ocupado}>{ocupado ? 'Ligando…' : 'Ligar avisos neste aparelho'}</Botao>}

        {situacao === 'ligado' && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-success">Ligado neste aparelho</span>
            <Botao onClick={testar} disabled={ocupado}>Mandar um teste</Botao>
            <Botao variante="secundario" onClick={desligar} disabled={ocupado}>Desligar</Botao>
          </div>
        )}

        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      </div>

      {tipos.length > 0 && (
        <details className="mt-4 rounded-card border border-border bg-background p-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary">Escolher o que chega no celular</summary>
          <p className="mt-2 text-xs text-text/60">Vale para todos os seus aparelhos.</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {tipos.map((t) => (
              <li key={t.id}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                  <input type="checkbox" className="h-5 w-5 accent-primary" checked={!!pref[t.id]} onChange={(e) => trocarTipo(t.id, e.target.checked)} />
                  {t.nome}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
