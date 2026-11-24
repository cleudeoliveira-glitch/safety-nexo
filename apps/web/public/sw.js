// Service worker do Safety Nexo: guarda as telas e os arquivos do site para abrir sem internet.
// Os dados (empresas, checklists e o que foi preenchido no campo) ficam no próprio aparelho, pela tela /campo.
// Os modelos do reconhecimento facial também ficam guardados, para usar o rosto sem internet.
// Também recebe os avisos do Painel ADM (cadastro, plano, erro novo, pedido de cliente, norma, resumo do dia), que aparecem com a tela bloqueada.
const VERSAO = 'sn-v5';
const ESSENCIAIS = ['/campo', '/material', '/calculadoras', '/manifest.webmanifest', '/logo.png', '/icone-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // a API não passa por aqui

  // Arquivos do site com nome versionado: do cache primeiro.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/modelos-rosto/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((c) => c || fetch(req).then((r) => { const copia = r.clone(); caches.open(VERSAO).then((cache) => cache.put(req, copia)); return r; })));
    return;
  }

  // Telas: da internet primeiro; sem internet, a última cópia guardada; se não houver, a tela de campo.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const copia = r.clone(); caches.open(VERSAO).then((cache) => cache.put(req, copia)); return r; })
        .catch(() => caches.match(req).then((c) => c || caches.match('/campo'))),
    );
  }
});

// Aviso que chega pelo celular (mesmo com o site fechado e a tela bloqueada).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(d.titulo || 'Safety Nexo', {
      body: d.corpo || 'Você tem uma novidade no Safety Nexo.',
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || '/admin' },
    }),
  );
});

// Tocou no aviso: abre (ou traz para frente) o site na tela certa.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || '/admin', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (j.url.startsWith(self.location.origin) && 'focus' in j) { j.navigate(destino).catch(() => undefined); return j.focus(); }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
