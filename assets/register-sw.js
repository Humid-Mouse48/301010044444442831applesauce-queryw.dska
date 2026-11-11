"use strict";
/*
 * Registers the Ultraviolet service worker and points BareMux at a Wisp server.
 * index.html calls registerSW() once and setTransport(url) whenever the Wisp pool
 * picks (or switches to) a server.
 *
 * Folders in the site root, named exactly like the npm packages (each keeps its dist folder):
 *   /uv/                                          (ultraviolet files, no dist)
 *   /bare-mux/dist/        index.js + worker.js
 *   /epoxy-transport/dist/ index.mjs   (or /libcurl-transport/dist/)
 *   /bare-as-module3/dist/ index.mjs   (Bare fallback)
 */

// "epoxy" or "libcurl"
const TRANSPORT = "epoxy";
const TRANSPORT_PATHS = {
  epoxy: "/epoxy-transport/dist/index.mjs",
  libcurl: "/libcurl-transport/dist/index.mjs"
};

// Used only when setTransport() is given an http(s):// Bare server instead of ws(s):// Wisp
const BARE_TRANSPORT_PATH = "/bare-as-module3/dist/index.mjs";

let bareMuxConn = null;

async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }
  const reg = await navigator.serviceWorker.register("/uv-sw.js", {
    scope: __uv$config.prefix,
    updateViaCache: "none"
  });
  reg.update().catch(() => {});

  // Wait for this registration to become active. (Don't use
  // navigator.serviceWorker.ready: the scope is /service/, not the page.)
  const worker = reg.installing || reg.waiting || reg.active;
  if (worker && worker.state !== "activated") {
    await new Promise((resolve, reject) => {
      const check = () => {
        if (worker.state === "activated") resolve();
        else if (worker.state === "redundant") reject(new Error("Service worker became redundant"));
      };
      worker.addEventListener("statechange", check);
      check();
    });
  }
  return reg;
}

async function setTransport(wispUrl) {
  if (typeof BareMux === "undefined") {
    throw new Error("BareMux not loaded - add /bare-mux/dist/index.js before register-sw.js");
  }
  bareMuxConn = bareMuxConn || new BareMux.BareMuxConnection("/bare-mux/dist/worker.js");

  if (/^wss?:\/\//i.test(wispUrl)) {
    const options = TRANSPORT === "libcurl"
      ? [{ websocket: wispUrl }]
      : [{ wisp: wispUrl }];
    await bareMuxConn.setTransport(TRANSPORT_PATHS[TRANSPORT], options);
  } else {
    // Bare server (https://...)
    await bareMuxConn.setTransport(BARE_TRANSPORT_PATH, [wispUrl]);
  }
}
