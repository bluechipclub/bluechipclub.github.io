// Besucherzähler (ohne Cookies). Zählt Aufrufe, sichtbare Verweildauer, Scrolltiefe und Klicks.
(function () {
  try { if (localStorage.getItem("bcc-nicht-zaehlen") === "1") return; } catch (e) {}
  if (/[?&]nichtzaehlen=1/.test(location.search)) { try { localStorage.setItem("bcc-nicht-zaehlen", "1"); } catch (e) {} return; }
  var Z = "https://bcc-zaehler.sparehour-vesper.workers.dev/e";
  var sid = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  var seite = location.pathname.replace(/index\.html$/, "") || "/";
  var sichtbar = 0, seit = document.visibilityState === "visible" ? performance.now() : 0, scroll = 0;
  function send(o) {
    o.sid = sid; o.p = seite;
    var b = JSON.stringify(o);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(Z, new Blob([b], { type: "text/plain" }))) return;
    } catch (e) {}
    try { fetch(Z, { method: "POST", body: b, keepalive: true, mode: "cors", headers: { "content-type": "text/plain" } }); } catch (e) {}
  }
  function dauer() { return (sichtbar + (seit ? performance.now() - seit : 0)) / 1000; }
  function ping() { send({ a: "ping", d: dauer(), sc: scroll }); }
  function misst(ev) {
    var el = ev && ev.target && ev.target.nodeType === 1 ? ev.target : document.scrollingElement || document.documentElement;
    if (el.clientHeight < innerHeight * 0.6) return;
    var max = el.scrollHeight - el.clientHeight;
    var p = max > 0 ? Math.round((el.scrollTop / max) * 100) : 100;
    if (p > scroll) scroll = Math.min(100, p);
  }
  send({ a: "start", r: document.referrer });
  document.addEventListener("scroll", misst, { passive: true, capture: true });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") { seit = performance.now(); }
    else { if (seit) sichtbar += performance.now() - seit; seit = 0; ping(); }
  });
  addEventListener("pagehide", ping);
  setInterval(function () { if (document.visibilityState === "visible") ping(); }, 15000);
  setTimeout(ping, 5000);
  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest("[data-zahl],a,button,[role=button],summary,label,[onclick]");
    if (!el) return;
    var t = el.getAttribute("data-zahl") || el.getAttribute("aria-label") || (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() || el.getAttribute("title") || el.getAttribute("href") || el.tagName.toLowerCase();
    send({ a: "klick", z: t.slice(0, 60) });
  }, true);
})();
