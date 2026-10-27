// Service worker do GEEK
// - Sem internet, abrir o app leva para /offline (capítulos baixados).
// - Arquivos do app (JS/CSS) guardados no download servem de reserva offline.
// - As páginas das HQs ficam em caches próprios ("geek-hq-<id>") criados pelo app.
const SHELL = "geek-shell";
const OFFLINE = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => Promise.all([OFFLINE, "/icone-192.png"].map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("geek-v")).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Páginas do site: rede primeiro; sem rede, a tela de baixados
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(async () => (await caches.match(OFFLINE, { cacheName: SHELL })) || Response.error()),
    );
    return;
  }

  // JS/CSS/fontes do app: rede primeiro, cópia guardada como reserva
  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icone")) {
    e.respondWith(fetch(req).catch(async () => (await caches.match(req, { ignoreSearch: true })) || Response.error()));
    return;
  }

  // Páginas de HQ baixadas
  if (url.pathname.startsWith("/offline-paginas/")) {
    e.respondWith(caches.match(url.pathname).then((r) => r || new Response("", { status: 404 })));
  }
});
