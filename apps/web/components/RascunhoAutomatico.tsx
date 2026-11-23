'use client';

import { useEffect, useState } from 'react';

// Rascunho automático de todos os formulários das telas internas.
// Enquanto a pessoa digita, o que está nos campos fica guardado no próprio aparelho.
// Se a tela fechar, o celular bloquear ou a internet cair, ao voltar aparece "Continuar de onde parou?".
// O rascunho some quando o formulário é enviado, quando a pessoa descarta ou depois de 7 dias.
// Não guarda senha nem arquivo. Formulário com data-sem-rascunho fica de fora.

const PREFIXO = 'safety-nexo:rascunho:';
const VALIDADE = 7 * 24 * 3600_000;
const MINIMO_DE_CAMPOS = 2;

type Rascunho = { em: number; titulo: string; campos: Record<string, string | boolean> };

type Campo = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Campo que entra no rascunho: precisa de nome ou id, e não pode ser senha, arquivo, busca nem botão.
function camposDo(form: HTMLFormElement): Campo[] {
  return Array.from(form.elements).filter((el): el is Campo => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return false;
    if (!(el.name || el.id) || el.disabled) return false;
    if (el instanceof HTMLInputElement && ['password', 'file', 'submit', 'button', 'hidden', 'search', 'reset'].includes(el.type)) return false;
    return true;
  });
}
const chaveDoCampo = (el: Campo) => {
  if (el instanceof HTMLInputElement && el.type === 'radio') return `${el.name || el.id}=${el.value}`;
  return el.name && el.form?.querySelectorAll(`[name="${CSS.escape(el.name)}"]`).length === 1 ? el.name : el.id || el.name;
};
const valorDoCampo = (el: Campo) => (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value);

function lerCampos(form: HTMLFormElement): Record<string, string | boolean> {
  const r: Record<string, string | boolean> = {};
  for (const el of camposDo(form)) r[chaveDoCampo(el)] = valorDoCampo(el);
  return r;
}

// Muda o valor de um jeito que o React percebe (dispara o mesmo evento da digitação).
function colocarValor(el: Campo, valor: string | boolean) {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    if (el.checked !== valor) el.click();
    return;
  }
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, String(valor));
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  if (!(el instanceof HTMLSelectElement)) el.dispatchEvent(new Event('change', { bubbles: true }));
}

// Formulários de preencher da tela (os que têm poucos campos, como busca ou login, ficam de fora).
function formulariosDaTela(): HTMLFormElement[] {
  return Array.from(document.querySelectorAll<HTMLFormElement>('main form')).filter((f) => !f.hasAttribute('data-sem-rascunho') && camposDo(f).length >= MINIMO_DE_CAMPOS);
}
const chaveDoForm = (forms: HTMLFormElement[], f: HTMLFormElement) => `${PREFIXO}${window.location.pathname}${window.location.hash}#${forms.indexOf(f)}`;

function tituloDo(form: HTMLFormElement): string {
  const cartao = form.closest('section, div.rounded-card, div.rounded-2xl');
  return cartao?.querySelector('h2, h3')?.textContent?.trim() || document.querySelector('main h1')?.textContent?.trim() || 'formulário';
}

function lerRascunho(chave: string): Rascunho | null {
  try {
    const r = JSON.parse(localStorage.getItem(chave) ?? 'null') as Rascunho | null;
    if (!r || Date.now() - r.em > VALIDADE) { localStorage.removeItem(chave); return null; }
    return r;
  } catch { return null; }
}

// Apaga todos os rascunhos do aparelho (ao sair da conta).
export function apagarRascunhos() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIXO)).forEach((k) => localStorage.removeItem(k)); } catch {}
}

type Oferta = { chave: string; rascunho: Rascunho; form: HTMLFormElement };

export function RascunhoAutomatico({ caminho }: { caminho: string }) {
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [guardado, setGuardado] = useState<number | null>(null);

  useEffect(() => {
    setOferta(null);
    let ofereceu = false;
    const iniciais = new WeakMap<HTMLFormElement, string>();
    let espera: ReturnType<typeof setTimeout> | undefined;

    // Ao abrir a tela (e quando o formulário aparece depois de carregar), oferece o rascunho guardado.
    const procurar = () => {
      const forms = formulariosDaTela();
      for (const f of forms) {
        if (!iniciais.has(f)) iniciais.set(f, JSON.stringify(lerCampos(f)));
        if (ofereceu) continue;
        const chave = chaveDoForm(forms, f);
        const r = lerRascunho(chave);
        if (r && JSON.stringify(r.campos) !== iniciais.get(f)) { ofereceu = true; setOferta({ chave, rascunho: r, form: f }); }
      }
    };
    const observador = new MutationObserver(() => { clearTimeout(espera); espera = setTimeout(procurar, 300); });
    const main = document.querySelector('main') ?? document.body;
    observador.observe(main, { childList: true, subtree: true });
    const primeira = setTimeout(procurar, 400);

    // Guarda enquanto a pessoa preenche (meio segundo depois de parar de digitar).
    let salvar: ReturnType<typeof setTimeout> | undefined;
    const aoDigitar = (ev: Event) => {
      const form = (ev.target as HTMLElement | null)?.closest?.('form');
      if (!(form instanceof HTMLFormElement)) return;
      const forms = formulariosDaTela();
      if (!forms.includes(form)) return;
      clearTimeout(salvar);
      salvar = setTimeout(() => {
        const campos = lerCampos(form);
        const chave = chaveDoForm(forms, form);
        try {
          if (JSON.stringify(campos) === iniciais.get(form)) localStorage.removeItem(chave);
          else {
            // Avisa só na primeira vez que o rascunho é guardado, para não piscar a cada letra.
            const novo = localStorage.getItem(chave) === null;
            localStorage.setItem(chave, JSON.stringify({ em: Date.now(), titulo: tituloDo(form), campos }));
            if (novo) setGuardado(Date.now());
          }
        } catch {}
      }, 500);
    };
    // Enviou: o rascunho não serve mais.
    const aoEnviar = (ev: Event) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement)) return;
      const forms = formulariosDaTela();
      if (!forms.includes(form)) return;
      clearTimeout(salvar);
      try { localStorage.removeItem(chaveDoForm(forms, form)); } catch {}
      // Depois de salvar, o formulário volta ao começo: esse passa a ser o "vazio" dele.
      setTimeout(() => iniciais.set(form, JSON.stringify(lerCampos(form))), 1500);
      setOferta((o) => (o?.form === form ? null : o));
    };
    document.addEventListener('input', aoDigitar, true);
    document.addEventListener('change', aoDigitar, true);
    document.addEventListener('submit', aoEnviar, true);
    return () => {
      observador.disconnect(); clearTimeout(espera); clearTimeout(primeira); clearTimeout(salvar);
      document.removeEventListener('input', aoDigitar, true);
      document.removeEventListener('change', aoDigitar, true);
      document.removeEventListener('submit', aoEnviar, true);
    };
  }, [caminho]);

  // Some sozinho o aviso "Rascunho guardado".
  useEffect(() => { if (!guardado) return; const t = setTimeout(() => setGuardado(null), 2000); return () => clearTimeout(t); }, [guardado]);

  function continuar() {
    if (!oferta) return;
    const { form, rascunho } = oferta;
    for (const el of camposDo(form)) {
      const k = chaveDoCampo(el);
      if (k in rascunho.campos) colocarValor(el, rascunho.campos[k]);
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOferta(null);
  }
  function descartar() {
    if (!oferta) return;
    try { localStorage.removeItem(oferta.chave); } catch {}
    setOferta(null);
  }

  const quando = (t: number) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      {oferta && (
        <div role="dialog" aria-label="Rascunho guardado" className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-primary/30 bg-white p-4 shadow-xl md:bottom-6 md:left-auto md:right-6 md:mx-0">
          <p className="text-sm"><strong>Você tem um rascunho guardado</strong> em &quot;{oferta.rascunho.titulo}&quot;, de {quando(oferta.rascunho.em)}.</p>
          <p className="mt-0.5 text-xs text-text/60">Quer continuar de onde parou?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={descartar} className="min-h-[44px] rounded-card border border-border text-sm font-semibold text-text/80">Começar do zero</button>
            <button type="button" onClick={continuar} className="min-h-[44px] rounded-card bg-primary text-sm font-semibold text-white">Continuar</button>
          </div>
        </div>
      )}
      {guardado && !oferta && (
        <p role="status" className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-text/80 px-3 py-1 text-xs text-white md:bottom-6">Rascunho guardado no aparelho</p>
      )}
    </>
  );
}
