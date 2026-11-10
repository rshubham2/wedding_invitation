/*
 * Keepsake: invites that open as a short film and end on the invitation card itself (Zardozi's
 * velvet envelope, Kanjivaram's silk, Phulkari's parcel, Sheesh Mahal's mirror hall). A layout for
 * the invite engine (engine.js loads it when theme.json says "layout": "keepsake"). It adds:
 *
 *  - The "keepsake" opening. The gate is the film's first frame. A design sealed in wax shows the
 *    couple's seal pressed into it (opening.seal, as the envelope opening presses it); the tap
 *    cracks the seal in two and its halves fall away, then the film plays (made once in Flow, the
 *    same for every couple), and at its last frame the couple's names are written onto the card's
 *    blank centre in gold (opening.names, a box in fractions of the frame).
 *  - The first screen: the film's last frame, laid out exactly as the gate laid it out (the same
 *    fit as the engine's fitGate, with the same focus), with the names in the same place. So when
 *    the gate fades, nothing moves. A design may keep it alive with a short looping film
 *    (opening.loop: Sheesh Mahal's mirrors catching the light), played muted behind the names.
 *  - Glints (opening.glints): small stars that bloom on the art now and then, drawn in code.
 *
 * opening: { type: "keepsake", film, first, last, aspect, focus, tap, from, to, rate, hold,
 *   names: {left, top, right, bottom}, tone: "dark" | "light", seal: {cx, cy, r}, sealFace,
 *   loop, glints: [{left, top, right, bottom}], hint }
 */
(() => {
  const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.decoding = "async"; i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  const ready = (img) => new Promise((ok, bad) => { if (img.complete && img.naturalWidth) ok(img); else { img.addEventListener("load", () => ok(img), { once: true }); img.addEventListener("error", bad, { once: true }); } });
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const pct = (v) => `${(v * 100).toFixed(3)}%`;
  const params = new URLSearchParams(location.search);
  const quiet = () => params.has("quiet") || document.documentElement.classList.contains("quiet");
  const still = () => quiet() || matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The engine's fitGate, so the first screen lays the last frame out exactly as the gate did: cover
  // the screen, keep the focus in view, and where a little is missing above and below, mirror the edge.
  function fitBox(W, H, aspect, focus) {
    const [aw, ah] = String(aspect || "9 / 16").split("/").map(Number);
    const [fx0, fy0, fx1, fy1] = focus || [0.25, 0.25, 0.75, 0.75];
    const cover = Math.max(W / aw, H / ah), whole = Math.min(W / aw, H / ah);
    const s = Math.max(whole, Math.min(H / (ah * cover) >= 0.88 ? cover : whole, W / ((fx1 - fx0) * aw)));
    const w = Math.round(aw * s), h = Math.round(ah * s);
    const place = (len, view, f0, f1) => {
      if (len <= view + 1) return Math.round((view - len) / 2);
      const at = Math.max(-f0 * len, Math.min((view - len) / 2, view - f1 * len));
      return Math.round(Math.min(0, Math.max(view - len, at)));
    };
    const x = place(w, W, fx0, fx1), y = place(h, H, fy0, fy1);
    const framed = w < W - 1 || h < H - 1;
    return { x, y, w, h, framed, mirrored: framed && w >= W - 1 && H - h <= 0.5 * h };
  }
  const focusOf = (o) => (o.focus || [0.2, 0.2, 0.8, 0.8]).map(clamp01);

  // ───────── The words on the card ─────────
  function wordsHTML(a) {
    const { data, esc, u, lang, two, divider, fmt, mainDate, pick } = a;
    const [n1, n2] = lang === "mr" ? two(data.her.mr || data.her.hi || data.her.en, data.him.mr || data.him.hi || data.him.en) : two(data.her.en, data.him.en);
    // The video invite keeps the date back for its scratch, right after (engine.js heroDate).
    const d = mainDate(), shown = a.heroDate ? a.heroDate() : d;
    const when = [shown && esc(fmt(shown, { day: "numeric", month: "long", year: "numeric" })), pick(data.city) && esc(pick(data.city))].filter(Boolean).join("<br>");
    const tone = a.theme.opening?.tone === "light" ? "light" : "dark";
    // A design's emblem over the words (opening.emblem names its art, Shubho Drishti's prajapati
    // butterfly), which comes before them (Gautam, 1 November 2026).
    const emblem = a.theme.opening?.emblem ? a.art(a.theme.opening.emblem) : null;
    return `<div class="ks-words ink-${tone}${emblem ? " has-emblem" : ""}" lang="${lang}" data-clarity-mask="true">
      ${emblem ? `<img class="ks-emblem" src="${emblem}" alt="" aria-hidden="true">` : ""}
      <p class="ks-pre">${esc(u.welcome)}</p>
      <div class="ks-names"><p class="ks-name">${esc(n1)}</p><p class="ks-amp">${esc(u.amp)}</p><p class="ks-name">${esc(n2)}</p></div>
      <span class="ks-rule">${divider()}</span>
      ${d && when ? `<p class="ks-date">${when}</p>` : ""}
    </div>`;
  }

  // Long names shrink to their line and the block to its card: a scale, never a wrap mid-name.
  // The script face often arrives after the first measure (the engine adds its stylesheet late, and
  // fonts.ready can settle before that), so the names are measured again whenever a face finishes
  // loading and whenever their own box changes size.
  function watchFit(words, fit) {
    if (!words) return;
    document.fonts?.addEventListener?.("loadingdone", fit);
    // A fit that changes nothing changes no size, so this settles after one round.
    const names = words.querySelector(".ks-names, .pb-names");
    if (names && window.ResizeObserver) new ResizeObserver(() => fit()).observe(names);
    setTimeout(fit, 1500); setTimeout(fit, 4000);
  }

  function fitWords(words) {
    if (!words || !words.isConnected) return;
    words.style.setProperty("--k", "1");
    const box = words.getBoundingClientRect();
    if (!box.width) return;
    let k = 1;
    for (const n of words.querySelectorAll(".ks-name")) {
      const need = n.scrollWidth;
      if (need > box.width) k = Math.min(k, (box.width / need) * 0.98);
    }
    k = Math.max(0.5, k);
    words.style.setProperty("--k", k.toFixed(3));
    // Then the whole block to the card's height.
    const inner = [...words.children].reduce((h, c) => h + c.getBoundingClientRect().height, 0);
    if (inner > box.height && inner) words.style.setProperty("--k", Math.max(0.45, k * (box.height / inner) * 0.97).toFixed(3));
  }

  function placeWords(words, o) {
    const n = o.names || { left: 0.25, top: 0.32, right: 0.75, bottom: 0.68 };
    Object.assign(words.style, { left: pct(n.left), top: pct(n.top), width: pct(n.right - n.left), height: pct(n.bottom - n.top) });
  }

  // ───────── Glints: small stars that bloom on the art, in code ─────────
  function glints(host, zones, { every = 900, size = [10, 22] } = {}) {
    if (!zones?.length || still()) return () => {};
    let on = true, t;
    const one = () => {
      if (!on || document.hidden) return;
      const z = zones[Math.floor(Math.random() * zones.length)];
      const g = el("i", "ks-glint", host);
      const s = size[0] + Math.random() * (size[1] - size[0]);
      Object.assign(g.style, { left: pct(z.left + Math.random() * (z.right - z.left)), top: pct(z.top + Math.random() * (z.bottom - z.top)), width: `${s}px`, height: `${s}px` });
      g.addEventListener("animationend", () => g.remove(), { once: true });
    };
    const tick = () => { one(); if (Math.random() < 0.4) setTimeout(one, 160); t = setTimeout(tick, every * (0.6 + Math.random() * 0.8)); };
    t = setTimeout(tick, 400);
    return () => { on = false; clearTimeout(t); };
  }

  // ───────── Fireworks over the art, in code ─────────
  // opening.fireworks (Ayodhya, 3 November 2026): { from, launch, sky: [l, t, r, b], low: [[l, t, r, b], …] },
  // in fractions of the frame. From `from` seconds into the film, rockets rise from behind the art
  // (`launch` is the height they leave from) and open across the sky, before the names are written
  // there. Once they are (writeAt), smaller ones open low, under and beside the names, and the first
  // screen carries on with a small one now and then. One canvas under the words, whose shade dims
  // anything that drifts behind them.
  // Mostly gold, as Diwali's are, with saffron, rose and a pale silver now and then.
  const FW_INK = [["255,196,96", "255,238,196"], ["255,196,96", "255,238,196"], ["255,148,58", "255,216,150"], ["255,128,146", "255,214,222"], ["255,232,196", "255,255,246"]];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function fireworks(canvas, fw) {
    const g = canvas?.getContext("2d");
    if (!g) return null;
    const sparks = [], rockets = [];
    let W = 0, H = 0, raf = 0, then = 0;
    const size = () => {
      const r = canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      if (!r.width || (r.width === W && r.height === H)) return;
      W = r.width; H = r.height;
      canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
      g.setTransform(d, 0, 0, d, 0, 0);
    };
    // Kept in widths of the frame, down as well as across, so every burst is round.
    const tall = () => (W ? H / W : 16 / 9);
    function burst(x, y, r) {
      const [deep, bright] = FW_INK[Math.floor(Math.random() * FW_INK.length)];
      const n = Math.round(34 + r * 300), drag = 2.2;
      for (let i = 0; i < n; i++) {
        // A sphere of sparks seen flat, so the burst is full, not a ring.
        const a = Math.random() * Math.PI * 2, z = rnd(-1, 1), v = r * drag * Math.sqrt(1 - z * z) * rnd(0.9, 1.08);
        sparks.push({ x, y, hx: x, hy: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag, age: 0, life: rnd(1.2, 2), deep, bright });
      }
      sparks.push({ flash: true, x, y, r, age: 0, life: 0.4, bright });
    }
    function frame() {
      raf = 0;
      if (!canvas.isConnected) { sparks.length = rockets.length = 0; return; }
      size();
      const now = performance.now(), dt = then ? Math.min(0.05, (now - then) / 1000) : 1 / 60;
      then = now;
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";
      const lw = Math.max(1.2, W / 290);
      for (let i = rockets.length - 1; i >= 0; i--) {
        const k = rockets[i];
        k.age += dt;
        const t = Math.min(1, k.age / k.life), e = 1 - (1 - t) ** 2;
        const x = k.x0 + (k.x - k.x0) * e, y = k.y0 + (k.y - k.y0) * e;
        g.strokeStyle = `rgba(255,226,170,${(0.75 - t * 0.35).toFixed(3)})`;
        g.lineWidth = lw;
        g.beginPath(); g.moveTo(x * W, (y + 0.04 * (1 - t)) * W); g.lineTo(x * W, y * W); g.stroke();
        g.fillStyle = `rgba(255,244,220,${(0.95 - t * 0.3).toFixed(3)})`;
        g.beginPath(); g.arc(x * W, y * W, lw * 0.9, 0, Math.PI * 2); g.fill();
        if (t >= 1) { rockets.splice(i, 1); burst(k.x, k.y, k.r); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        if (s.age >= s.life) { sparks.splice(i, 1); continue; }
        const f = s.age / s.life;
        if (s.flash) {
          // The sky round a burst lights for a moment.
          const rr = s.r * W * (0.6 + f);
          const glow = g.createRadialGradient(s.x * W, s.y * W, 0, s.x * W, s.y * W, rr);
          glow.addColorStop(0, `rgba(${s.bright},${(0.12 * (1 - f)).toFixed(3)})`);
          glow.addColorStop(1, `rgba(${s.bright},0)`);
          g.fillStyle = glow;
          g.beginPath(); g.arc(s.x * W, s.y * W, rr, 0, Math.PI * 2); g.fill();
          continue;
        }
        const slow = Math.exp(-s.drag * dt);
        s.vx *= slow; s.vy = s.vy * slow + 0.085 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        // The tail is a point that follows behind, so it shortens as the spark slows and droops as it falls.
        const lag = Math.min(1, dt * 6);
        s.hx += (s.x - s.hx) * lag; s.hy += (s.y - s.hy) * lag;
        // Pale at first, then its colour, then a flicker as it burns out.
        let a = 1 - f * f;
        if (f > 0.55 && Math.random() < 0.35) a *= 0.25;
        const ink = f < 0.15 ? s.bright : s.deep;
        g.lineWidth = lw * 2.8;
        g.strokeStyle = `rgba(${ink},${(a * 0.16).toFixed(3)})`;
        g.beginPath(); g.moveTo(s.hx * W, s.hy * W); g.lineTo(s.x * W + 0.01, s.y * W); g.stroke();
        g.lineWidth = lw;
        g.strokeStyle = `rgba(${ink},${(a * 0.9).toFixed(3)})`;
        g.stroke();
      }
      if (sparks.length || rockets.length) raf = requestAnimationFrame(frame);
      else { then = 0; g.clearRect(0, 0, W, H); }
    }
    const launch = (x, y, r) => {
      size();
      const k = tall();
      rockets.push({ x0: x + rnd(-0.02, 0.02), y0: (fw.launch ?? 0.4) * k, x, y: y * k, r, age: 0, life: rnd(0.55, 0.75) });
      if (!raf) raf = requestAnimationFrame(frame);
    };
    // A small one low, under or beside the names, now and then, while `go()` says so.
    let t = 0;
    const low = (go, gap) => {
      clearTimeout(t);
      const zones = fw.low || [];
      if (!zones.length) return () => {};
      const next = () => {
        if (!canvas.isConnected) return;
        if (go()) { const [l, tp, r, b] = zones[Math.floor(Math.random() * zones.length)]; launch(rnd(l, r), rnd(tp, b), rnd(0.045, 0.07)); }
        t = setTimeout(next, gap() * 1000);
      };
      t = setTimeout(next, 200);
      return () => clearTimeout(t);
    };
    // The show before the names: left, right, the middle, then wider, a beat apart, while the sky is empty.
    const plan = [];
    if (fw.sky) {
      const [l, tp, r, b] = fw.sky;
      [0.3, 0.72, 0.5, 0.2, 0.8].forEach((u, i) => plan.push({ at: (fw.from ?? 0) + i * 0.42, x: l + u * (r - l), y: rnd(tp, b), r: rnd(0.1, 0.14) }));
    }
    return {
      // Called with the film's time as it plays.
      at(time, until) { while (plan.length && plan[0].at <= time) { const p = plan.shift(); if (p.at <= until) launch(p.x, p.y, p.r); } },
      low,
    };
  }

  // ───────── The first screen ─────────
  function hero(a) {
    const o = a.theme.opening || {};
    const last = o.last ? a.base + o.last : a.art("hero");
    return `<div class="ks-hero">
      <div class="ks-fill" aria-hidden="true"></div>
      <div class="ks-mirror top" aria-hidden="true"></div><div class="ks-mirror bottom" aria-hidden="true"></div>
      <div class="ks-box">
        <img class="ks-art" src="${a.esc(last)}" alt="" crossorigin="anonymous" decoding="async">
        ${o.loop ? `<video class="ks-loop" muted playsinline loop preload="none" aria-hidden="true"></video>` : ""}
        <div class="ks-glints" aria-hidden="true"></div>
        ${o.fireworks ? `<canvas class="ks-fw" aria-hidden="true"></canvas>` : ""}
        ${wordsHTML(a)}
      </div>
    </div>`;
  }

  function mountHero(host, a) {
    const o = a.theme.opening || {};
    const root = host.querySelector(".ks-hero"), box = root?.querySelector(".ks-box");
    if (!root || !box) return;
    // The bands above and below mirror the same picture the gate's do (the film's first frame), so
    // nothing in them changes when the gate fades.
    const edge = o.first ? a.base + o.first : o.last ? a.base + o.last : a.art("hero");
    for (const m of root.querySelectorAll(".ks-mirror")) m.style.backgroundImage = `url("${edge}")`;
    const words = box.querySelector(".ks-words");
    placeWords(words, o);
    // Inside the site's phone mockup the screen is the frame's own height; elsewhere the small
    // viewport, as the gate covers it.
    const fit = () => {
      const W = root.clientWidth, H = root.clientHeight;
      if (!W || !H) return;
      const f = fitBox(W, H, o.aspect, focusOf(o));
      Object.assign(box.style, { left: `${f.x}px`, top: `${f.y}px`, width: `${f.w}px`, height: `${f.h}px` });
      root.classList.toggle("framed", f.framed && !f.mirrored);
      root.classList.toggle("mirrored", f.mirrored);
      if (f.mirrored) {
        const flip = { width: `${f.w}px`, left: `${f.x}px`, backgroundSize: `${f.w}px ${f.h}px` };
        Object.assign(root.querySelector(".ks-mirror.top").style, flip, { top: "0px", height: `${f.y + 1}px`, backgroundPosition: "0 0" });
        Object.assign(root.querySelector(".ks-mirror.bottom").style, flip, { top: `${f.y + f.h - 1}px`, height: `${H - f.y - f.h + 1}px`, backgroundPosition: "0 100%" });
      }
      fitWords(words);
    };
    if (window.ResizeObserver) new ResizeObserver(fit).observe(root);
    requestAnimationFrame(fit);
    document.fonts?.ready.then(fit);
    watchFit(words, () => fitWords(words));
    // A page opened at once (the site's previews) writes the names in as the page appears.
    if (params.has("open") && !quiet()) words.classList.add("ks-write");
    // The living hero: only once the invitation is open, while it's on screen, and never in the
    // editor, on Save-Data, with reduced motion or in a grid of the site's previews (?top).
    const v = box.querySelector(".ks-loop");
    const saving = navigator.connection?.saveData;
    if (v && !still() && !saving && !params.has("top")) {
      let seen = true;
      const go = () => {
        if (!document.body.classList.contains("body-open") || !seen || document.hidden) return v.pause();
        if (!v.src) { v.src = a.base + o.loop; v.load(); }
        v.play().then(() => v.classList.add("on")).catch(() => {});
      };
      new MutationObserver(go).observe(document.body, { attributes: true, attributeFilter: ["class"] });
      if (window.IntersectionObserver) new IntersectionObserver(([e]) => { seen = e.isIntersecting; go(); }).observe(root);
      document.addEventListener("visibilitychange", go);
      go();
    }
    // Small fireworks go on opening over the art: often for the first seconds after the opening, then
    // now and then, only while the first screen is in view.
    const sky = o.fireworks && !still() && !params.has("top") ? fireworks(box.querySelector(".ks-fw"), o.fireworks) : null;
    if (sky) {
      let seen = true, openedAt = 0;
      const open = () => document.body.classList.contains("body-open");
      const start = () => { if (!openedAt && open()) { openedAt = performance.now(); sky.low(() => seen && open() && !document.hidden, () => (performance.now() - openedAt < 9000 ? rnd(0.8, 1.5) : rnd(2.6, 5))); } };
      new MutationObserver(start).observe(document.body, { attributes: true, attributeFilter: ["class"] });
      if (window.IntersectionObserver) new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(root);
      start();
    }
    if (o.glints) {
      let stop = () => {};
      const start = () => { stop(); if (document.body.classList.contains("body-open")) stop = glints(box.querySelector(".ks-glints"), o.glints); };
      new MutationObserver(start).observe(document.body, { attributes: true, attributeFilter: ["class"] });
      start();
    }
  }

  // ───────── A design's own decoration, drawn on the page after it is laid out ─────────
  // theme.decor names it (Rangeelo's forts that turn from day to night, Kamal's lotus that opens at
  // each function): layouts/decor-<name>.js and .css, loaded once, only for that design, and run
  // again whenever the engine redraws the page (a language switch).
  const decors = {};
  function decorate(paper, a) {
    const name = String(a.theme.decor || "").replace(/[^a-z0-9-]/gi, "");
    if (!name || !paper) return;
    decors[name] ||= new Promise((ok) => {
      const css = el("link", "", document.head);
      css.rel = "stylesheet"; css.href = `${a.ROOT}layouts/decor-${name}.css`;
      const s = document.createElement("script");
      s.src = `${a.ROOT}layouts/decor-${name}.js`;
      s.onload = s.onerror = ok;
      document.head.appendChild(s);
    });
    decors[name].then(() => { try { window.SaathDecor?.[name]?.(paper, a); } catch (e) { console.warn("decor", e); } });
  }

  (window.SaathLayouts = window.SaathLayouts || {}).keepsake = { hero, mountHero, decorate };

  // ───────── The seal: pressed with the couple's choice, then cracked in two ─────────
  // The crack runs top to bottom, a little off true, as wax breaks.
  const CRACK = [[0.47, -0.02], [0.53, 0.17], [0.46, 0.35], [0.55, 0.54], [0.47, 0.73], [0.52, 1.02]];
  function halfOf(src, side) {
    const S = src.width, c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    g.beginPath();
    const pts = CRACK.map(([x, y]) => [x * S, y * S]);
    if (side === 0) { g.moveTo(-2, -2); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(-2, S + 2); }
    else { g.moveTo(S + 2, -2); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(S + 2, S + 2); }
    g.closePath();
    g.save(); g.clip(); g.drawImage(src, 0, 0); g.restore();
    // The broken edge catches the light on one half and falls into shadow on the other.
    g.save(); g.clip();
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineWidth = S * 0.012; g.strokeStyle = side ? "rgba(0,0,0,0.38)" : "rgba(255,246,226,0.55)"; g.stroke();
    g.restore();
    return c;
  }

  // ───────── The opening ─────────
  function keepsake({ stage, theme, base, initials, seal: sealChoice, couple, reduced, label, page, onOpen }) {
    const o = theme.opening || {};
    const box = el("div", "op-frame op-film op-keepsake", stage);
    box.style.aspectRatio = o.aspect || "9 / 16";
    const v = el("video", "op-video", box);
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.preload = "auto";
    v.src = base + o.film;
    const end = el("img", "op-end", box);
    end.src = base + (o.last || theme.art.hero); end.alt = "";
    const first = el("img", "op-still", box);
    first.crossOrigin = "anonymous"; first.src = base + (o.first || theme.art.closed); first.alt = "";
    const sky = o.fireworks && !reduced && !still() ? fireworks(el("canvas", "ks-fw", box), o.fireworks) : null;
    let lowOn = false;
    // The words that will be written onto the card: the first screen's own, in the same place.
    const tpl = document.createElement("template");
    tpl.innerHTML = page || "";
    const words = tpl.content.querySelector(".ks-words");
    if (words) { box.appendChild(words); placeWords(words, o); words.classList.add("ks-later"); }
    const refit = () => fitWords(words);
    if (window.ResizeObserver && words) new ResizeObserver(refit).observe(box);
    document.fonts?.ready.then(refit);
    watchFit(words, refit);

    // The seal, when the design is sealed in wax.
    let sealBtn = null, sealCvs = null;
    const O = window.SaathOpenings || {};
    if (o.seal && theme.art?.seal && O.pressSeal && O.sealDie) {
      sealBtn = el("button", "op-seal ks-seal", box);
      sealBtn.type = "button";
      sealBtn.setAttribute("aria-label", label);
      Object.assign(sealBtn.style, { left: pct(o.seal.cx), top: pct(o.seal.cy), width: pct(o.seal.r * 2) });
      sealCvs = el("canvas", "", sealBtn);
      el("span", "op-pulse", sealBtn);
      const die = O.sealDie(sealChoice, couple, initials, theme);
      load(base + theme.art.seal).then((img) => O.pressSeal(sealCvs, img, die, o.sealFace, o)).catch(() => sealBtn.remove());
    }
    const [x0, y0, x1, y1] = o.tap || [0.2, 0.3, 0.8, 0.7];
    const btn = el("button", "op-tap", box);
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    Object.assign(btn.style, { left: pct(x0), top: pct(y0), width: pct(x1 - x0), height: pct(y1 - y0) });
    box.style.cursor = "pointer";
    box.addEventListener("click", () => onOpen(), { once: true });

    async function breakSeal() {
      if (!sealBtn?.isConnected) return;
      sealBtn.classList.add("pressed");
      sealBtn.querySelector(".op-pulse")?.remove();
      await wait(120);
      if (!sealCvs.width) { sealBtn.classList.add("gone"); return; }
      const halves = [0, 1].map((side) => { const c = halfOf(sealCvs, side); c.className = `ks-half h${side}`; sealBtn.appendChild(c); return c; });
      sealCvs.style.visibility = "hidden";
      sealBtn.classList.remove("pressed");
      // A beat as the crack opens, then each half drops away and turns, as broken wax does.
      const fall = "cubic-bezier(0.45, 0, 0.8, 0.4)";
      halves[0].animate([{ transform: "none", opacity: 1 }, { transform: "translate(-3%, 1%) rotate(-3deg)", opacity: 1, offset: 0.18 }, { transform: "translate(-30%, 46%) rotate(-24deg)", opacity: 0 }], { duration: 760, easing: fall, fill: "forwards" });
      halves[1].animate([{ transform: "none", opacity: 1 }, { transform: "translate(3%, 1%) rotate(3deg)", opacity: 1, offset: 0.18 }, { transform: "translate(28%, 52%) rotate(21deg)", opacity: 0 }], { duration: 800, easing: fall, fill: "forwards" });
      // Only from the guest's own tap (an opening played by ?play would log a blocked call).
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(12);
      await wait(300);
    }

    return {
      box,
      focus: focusOf(o),
      closed: ready(first),
      async play() {
        btn.remove();
        if (reduced) {
          sealBtn?.classList.add("gone");
          end.classList.add("on"); first.classList.add("gone");
          words?.classList.replace("ks-later", "ks-shown");
          await wait(600);
          return;
        }
        const from = o.from || 0, rate = o.rate || 1;
        try { v.currentTime = from; } catch {}
        v.playbackRate = rate;
        const broken = breakSeal();
        // The first frame stays on top until the film is really running; a phone that won't play it
        // (low-power mode) shows the card at once.
        const running = await Promise.race([v.play().then(() => true, () => false), wait(2500).then(() => false)]);
        await broken;
        // The names, written onto the card in gold: as soon as the card lies still (opening.writeAt,
        // seconds into the film), while the last folds settle, or at the end.
        let wrote = 0;
        const write = () => { if (wrote || !words) return; wrote = performance.now(); fitWords(words); words.classList.replace("ks-later", "ks-write"); };
        if (!running) { end.classList.add("on"); first.classList.add("gone"); await wait(700); }
        else {
          first.classList.add("gone");
          await new Promise((done) => {
            let over = false;
            const stop = () => { if (over) return; over = true; v.pause(); end.classList.add("on"); done(); };
            const to = o.to || 0;
            const tick = () => {
              if (over) return;
              if (o.writeAt && v.currentTime >= o.writeAt) write();
              if (sky) {
                sky.at(v.currentTime, (o.writeAt || 99) - 0.8);
                if (!lowOn && v.currentTime >= (o.writeAt || 99)) { lowOn = true; sky.low(() => true, () => rnd(0.6, 1.1)); }
              }
              if (v.ended || (to && v.currentTime >= to)) stop(); else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            v.addEventListener("ended", stop, { once: true });
            setTimeout(stop, (((to || v.duration || 8) - from) / rate) * 1000 + 2500);
          });
        }
        write();
        await wait(Math.max(0, (o.write ?? 2100) - (performance.now() - wrote)));
        await wait(o.hold ?? 500);
      },
    };
  }
  if (window.SaathOpenings) window.SaathOpenings.keepsake = keepsake;
})();
