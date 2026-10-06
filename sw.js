// Backrooms — offline cache: page = network-first with a short timeout (updates arrive, but a dead or
// whitelisted mobile network never leaves the game hanging), assets = cache-first
const CACHE = 'backrooms-v14';
const ASSETS = ['./', './index.html', './three.min.js', './peerjs.min.js', './qr.min.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];
const NAV_TIMEOUT = 3500;
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith('backrooms-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  const put = (res) => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); } return res; };
  if (req.mode === 'navigate') {
    const cached = () => caches.match('./index.html', { ignoreSearch: true }).then((r) => r || caches.match('./'));
    const net = fetch(req).then(put);
    e.waitUntil(net.catch(() => { })); // let a slow network response still refresh the cache for next launch
    e.respondWith(new Promise((resolve) => {
      let done = false; const fin = (r) => { if (!done && r) { done = true; resolve(r); } };
      const t = setTimeout(() => cached().then(fin), NAV_TIMEOUT);
      net.then((r) => { clearTimeout(t); fin(r); }, () => { clearTimeout(t); cached().then((r) => { if (r) fin(r); else if (!done) { done = true; resolve(Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then(put)));
});
