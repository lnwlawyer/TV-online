const scope = new URL(self.registration.scope);
const cachePrefix = 'online-tv-shell:' + scope.pathname + ':';
const cacheName = cachePrefix + 'v04';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const shell = new URL('index.html', scope);
    const response = await fetch(shell, {cache:'reload'});
    if (!response.ok) throw new Error('Could not load application shell');
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map(match => new URL(match[1], shell))
      .filter(url => url.origin === scope.origin && url.pathname.startsWith(scope.pathname));
    await cache.addAll([...new Set([
      ...assets.map(url => url.href),
      ...['icon-192.png','icon-512.png','verified-live.m3u','verified-vod.m3u','stream-credits.json']
        .map(path => new URL(path, scope).href)
    ])]);
    await cache.put(shell, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (/\.(m3u8|ts|mp4|m4s)$/i.test(url.pathname)) return;
  event.respondWith((async () => {
    try { return await fetch(request); }
    catch {
      const cache = await caches.open(cacheName);
      return await cache.match(request)
        || (request.mode === 'navigate' && await cache.match(new URL('index.html', scope)))
        || Response.error();
    }
  })());
});
