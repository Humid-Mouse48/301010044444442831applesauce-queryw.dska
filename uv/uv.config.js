// Goes in /uv/uv.config.js
// Works from any folder (jsDelivr repo path, Firebase root, ...): every path below is built from
// the folder this config was loaded from, so the service worker scope always matches the prefix.
(function () {
  var root = '/';
  try {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
      // page (or proxied page): <root>/uv/uv.config.js
      root = new URL('../', document.currentScript.src).pathname;
    } else if (typeof self.skipWaiting === 'function') {
      // service worker: <root>/uv-sw.js
      root = new URL('./', self.location.href).pathname;
    } else if (self.location && self.location.pathname.indexOf('/service/') > -1) {
      // worker created by a proxied page: <root>/service/<encoded url>
      root = self.location.pathname.slice(0, self.location.pathname.indexOf('/service/') + 1);
    }
  } catch (e) {}

  self.__uv$config = {
    prefix: root + 'service/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: root + 'uv/uv.handler.js',
    client: root + 'uv/uv.client.js',
    bundle: root + 'uv/uv.bundle.js',
    config: root + 'uv/uv.config.js',
    sw: root + 'uv/uv.sw.js',
  };
})();
