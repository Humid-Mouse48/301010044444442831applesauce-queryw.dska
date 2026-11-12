// Goes in the same folder as index.html / reading.html (site root, or the repo folder on jsDelivr).
// Every path is relative to THIS file, so it works from any folder.

function uvStep(name, fn) {
  try {
    fn();
  } catch (e) {
    throw new Error('[uv-sw] ' + name + ' failed: ' + (e && e.message ? e.message : e));
  }
}

uvStep("importScripts('./uv/uv.bundle.js')", () => importScripts('./uv/uv.bundle.js'));

if (typeof self.Ultraviolet === 'undefined') {
  throw new Error('[uv-sw] uv.bundle.js loaded but self.Ultraviolet is undefined (wrong or corrupt bundle file)');
}

uvStep("importScripts('./uv/uv.config.js')", () => importScripts('./uv/uv.config.js'));

// Make the paths authoritative, based on where this worker file lives
const UV_ROOT = new URL('./', self.location.href).pathname;
Object.assign(self.__uv$config, {
  prefix: UV_ROOT + 'service/',
  handler: UV_ROOT + 'uv/uv.handler.js',
  client: UV_ROOT + 'uv/uv.client.js',
  bundle: UV_ROOT + 'uv/uv.bundle.js',
  config: UV_ROOT + 'uv/uv.config.js',
  sw: UV_ROOT + 'uv/uv.sw.js'
});

uvStep("importScripts('./uv/uv.sw.js')", () => importScripts('./uv/uv.sw.js'));

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
