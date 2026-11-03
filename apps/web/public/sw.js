// Service worker do Safety Nexo: guarda as telas e os arquivos do site para abrir sem internet.
// Os dados (empresas, checklists e o que foi preenchido no campo) ficam no próprio aparelho, pela tela /campo.
const VERSAO = 'sn-v1';
const ESSENCIAIS = ['/campo', '/manifest.webmanifest', '/logo.png', '/icone-192.png'];

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
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
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
