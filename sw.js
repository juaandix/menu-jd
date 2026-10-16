// Sube la versión cada vez que cambies archivos para que los móviles descarguen la nueva.
const CACHE = "menujd-v39";
// Fotos de productos: caché aparte que no se borra al cambiar de versión (se bajan una vez, al mostrarse).
const IMG_CACHE = "menujd-img-v1";
const ASSETS = [
  "./", "index.html", "styles.css", "data.js", "app.js", "manifest.webmanifest",
  "fonts/barlow-condensed-500.woff2", "fonts/barlow-condensed-600.woff2", "fonts/barlow-condensed-700.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // cache: "reload" salta la caché HTTP del navegador (GitHub Pages da 10 min): si no, la versión nueva podía guardar archivos viejos.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== IMG_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero (para recibir cambios), caché si no hay conexión. "no-cache" pregunta siempre al servidor, para no mezclar
// un index.html nuevo con un app.js viejo de la caché HTTP. Solo se guardan las respuestas buenas.
// Las peticiones a otros orígenes (p. ej. Google Calendar) se dejan pasar sin interceptar ni cachear.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // Fotos: caché primero (no cambian); si se sustituye una, hay que subir IMG_CACHE.
  if (url.pathname.includes("/img/p/") && url.pathname.endsWith(".webp")) {
    e.respondWith(caches.open(IMG_CACHE).then((c) => c.match(e.request).then((m) => m || fetch(e.request).then((res) => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match("index.html")))
  );
});
