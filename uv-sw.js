// Goes in the site ROOT (next to index.html) so it can control /service/
// Same behaviour as before, but it reports WHICH step failed instead of a generic error.

function uvStep(name, fn) {
  try {
    fn();
  } catch (e) {
    throw new Error('[uv-sw] ' + name + ' failed: ' + (e && e.message ? e.message : e));
  }
}

uvStep("importScripts('/uv/uv.bundle.js')", () => importScripts('/uv/uv.bundle.js'));

if (typeof self.Ultraviolet === 'undefined') {
  throw new Error('[uv-sw] uv.bundle.js loaded but self.Ultraviolet is undefined (wrong or corrupt bundle file)');
}
console.log('[uv-sw] Ultraviolet.BareClient is', typeof self.Ultraviolet.BareClient,
            '| Ultraviolet.codec is', typeof self.Ultraviolet.codec);

uvStep("importScripts('/uv/uv.config.js')", () => importScripts('/uv/uv.config.js'));

// Force every Ultraviolet file path to the /uv/ folder, even if the deployed
// uv.config.js is stale or has different paths.
Object.assign(self.__uv$config, {
  handler: '/uv/uv.handler.js',
  client: '/uv/uv.client.js',
  bundle: '/uv/uv.bundle.js',
  config: '/uv/uv.config.js',
  sw: '/uv/uv.sw.js'
});

uvStep("importScripts('/uv/uv.sw.js')", () => importScripts('/uv/uv.sw.js'));

let sw;
uvStep('new UVServiceWorker()', () => { sw = new UVServiceWorker(); });

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const proxied = typeof sw.route === 'function'
      ? sw.route(event)
      : event.request.url.startsWith(location.origin + __uv$config.prefix);
    return proxied ? await sw.fetch(event) : await fetch(event.request);
  })());
});
