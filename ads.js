(function () {
  var AD_URL       = "https://asiafilm.org/4/5cb25910bc3663d4fc679372ff470733"; // My ad URL 
  var CHANCE       = 0.12;            // 12% chance per eligible click
  var COOLDOWN_MS  = 2.5 * 60000;     // 2.5 minutes between ads
  var MAX_PER_SESS = 20;               // hard cap per browser session
  var SKIP_CLICKS  = 3;               // let the visitor click around first

  // Disabled on these domains (subdomains included)
  var DISABLED_DOMAINS = [
    "template.net",
    "localhost"
  ];

  // Disabled on these pages (host + path, matches that page and anything under it)
  var DISABLED_PAGES = [
    "https://ik.imagekit.io/geekededucation/education.xml",
    "template.net/template"
  ];

  var host = location.hostname.toLowerCase().replace(/^www\./, "");
  var path = location.pathname.toLowerCase().replace(/\/+$/, "") || "/";

  var domainBlocked = DISABLED_DOMAINS.some(function (d) {
    d = d.toLowerCase();
    return host === d || host.endsWith("." + d);
  });

  var pageBlocked = DISABLED_PAGES.some(function (entry) {
    entry = entry.toLowerCase().replace(/\/+$/, "");
    var slash = entry.indexOf("/");
    var h = slash === -1 ? entry : entry.slice(0, slash);
    var p = slash === -1 ? "/" : entry.slice(slash);
    if (host !== h) return false;
    return path === p || path.indexOf(p + "/") === 0;
  });

  if (domainBlocked || pageBlocked) return;

  var clicks = 0;

  function store(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, val);
    } catch (e) {}
  }

  function onClick(e) {
    clicks++;
    if (clicks <= SKIP_CLICKS) return;

    // Don't hijack form fields, media controls, or exempted elements
    if (e.target && e.target.closest &&
        e.target.closest("input, textarea, select, video, audio, [data-no-ad]")) return;

    var shown = parseInt(store("adCount") || "0", 10);
    var last  = parseInt(store("adLast")  || "0", 10);
    var now   = Date.now();

    if (shown >= MAX_PER_SESS) return;
    if (now - last < COOLDOWN_MS) return;
    if (Math.random() > CHANCE) return;

    store("adCount", shown + 1);
    store("adLast", now);
    window.open(AD_URL, "_blank", "noopener");
  }

  // Main page clicks
  document.addEventListener("click", onClick, true);

  // Clicks inside same-origin iframes
  function hookFrame(f) {
    function hook() {
      try {
        var d = f.contentDocument;
        if (d && !d.__adHooked) {
          d.__adHooked = true;
          d.addEventListener("click", onClick, true);
        }
      } catch (err) {} // cross-origin frames throw and are skipped
    }
    hook();
    f.addEventListener("load", hook);
  }

  function hookFrames() {
    document.querySelectorAll("iframe").forEach(function (f) {
      if (!f.__adWatched) {
        f.__adWatched = true;
        hookFrame(f);
      }
    });
  }

  hookFrames();

  // Pick up iframes added to the page later
  if (window.MutationObserver) {
    new MutationObserver(hookFrames).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();
