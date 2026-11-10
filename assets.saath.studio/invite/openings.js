/*
 * Openings: the gesture a guest makes before the invitation appears. Each collection names
 * one in its theme.json ("envelope", "doors", "lotus", "lamp", "chandelier"). Every opening
 * builds itself inside #stage from the collection's two paintings (closed and open) and
 * returns { play }, which the engine calls on the gesture and which resolves when the
 * invitation can take over. It also returns its painting's box (which the engine sizes to
 * fill the screen), the part of the painting a guest must see whole (focus: left, top,
 * right, bottom, as fractions of the painting), and the closed painting once it has loaded,
 * for the engine to read under the greeting and the hint.
 */
(() => {
  // With CORS, so the relief and the seal can read pixels when the art comes from the asset host.
  const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.decoding = "async"; i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const easeOut = (u) => 1 - Math.pow(1 - u, 3);
  const tween = (ms, fn) => new Promise((done) => { const t0 = performance.now(); const step = (now) => { const u = Math.min(1, (now - t0) / ms); fn(u); u < 1 ? requestAnimationFrame(step) : done(); }; requestAnimationFrame(step); });

  const ready = (img) => new Promise((ok, bad) => { if (img.complete && img.naturalWidth) ok(img); else { img.addEventListener("load", () => ok(img), { once: true }); img.addEventListener("error", bad, { once: true }); } });
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  // What must stay in view: the theme's own focus box when it names one, else the opening's.
  const focusOf = (o, box) => (o.focus || box).map(clamp01);
  // Canvases span the whole painting, which now runs past the screen: cap their pixels, not only the ratio.
  const ratio = (r) => Math.min(2, devicePixelRatio || 1, Math.sqrt(2.4e6 / Math.max(1, r.width * r.height)));

  // The painting's box. The engine sizes and places it to fill the screen (fitGate), and every
  // layer below is placed in fractions of it, so the taps and the light stay on the painting.
  function frame(stage, theme) {
    const box = el("div", "op-frame", stage);
    box.style.aspectRatio = theme.opening?.aspect || "1024 / 1536";
    return box;
  }

  // A soft glow that follows a gesture point.
  function glow(parent, x, y) {
    const g = el("i", "op-glow", parent);
    g.style.left = `${x * 100}%`;
    g.style.top = `${y * 100}%`;
    return g;
  }

  // ───────── Envelope: the seal, a ring of light, then the flaps ─────────
  function envelope({ stage, theme, base, initials, seal: sealChoice, couple, reduced, label, card, onOpen }) {
    const o = theme.opening || {};
    const [cx, cy] = o.center || [0.5, 0.5];
    const box = frame(stage, theme);
    box.classList.add("op-envelope");
    box.style.setProperty("--cx", `${cx * 100}%`);
    box.style.setProperty("--cy", `${cy * 100}%`);
    const inside = el("div", "op-inside", box);
    if (theme.art?.open) inside.style.backgroundImage = `url(${base + theme.art.open})`;
    el("i", "op-light", inside);
    const closed = base + theme.art.closed;
    // An envelope lying on a desk (opening.envelope is its box) rather than filling the frame. The
    // closed painting stays whole underneath; the V flap folds back over the hinge (seen from above,
    // its face shrinks to the hinge and its paper back unfolds beyond it), a card drawn in code
    // slides up out of the pocket, and then it comes up to fill the screen.
    const env = o.envelope;
    let paper = null;
    if (env) {
      box.classList.add("on-paper");
      const tip = o.flap?.tip_closed || [cx, cy];
      const hinge = o.flap?.hinge_y ?? env.top;
      for (const [k, v] of [["--fx0", env.left], ["--fx1", env.right], ["--fy0", hinge], ["--tx", tip[0]], ["--ty", tip[1]]]) box.style.setProperty(k, `${v * 100}%`);
      const over = el("img", "op-over", box);
      over.crossOrigin = "anonymous"; over.src = closed; over.alt = "";
      // The flap's outline when the theme traced it (a V with straight shoulders), else the V to the tip.
      const poly = Array.isArray(o.flap?.polygon) ? o.flap.polygon : [[env.left, hinge], [env.right, hinge], tip];
      const clip = (pts) => `polygon(${pts.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(", ")})`;
      const shoulder = (side) => (poly.find(([x, y]) => Math.abs(x - (side ? env.right : env.left)) < 0.01 && y > hinge + 0.001) || [0, tip[1]])[1];
      // The envelope's inside, where the flap was; the pocket in front of the card; the flap's back.
      const hollow = el("div", "op-hollow", box);
      hollow.style.clipPath = clip(poly);
      const back = el("div", "op-flapback", box);
      back.style.clipPath = clip(poly.map(([x, y]) => [x, 2 * hinge - y]));
      back.style.transformOrigin = `50% ${hinge * 100}%`;
      paper = el("div", "op-card", box);
      const pad = (env.right - env.left) * 0.05;
      Object.assign(paper.style, { left: `${(env.left + pad) * 100}%`, width: `${(env.right - env.left - 2 * pad) * 100}%`, top: `${(hinge + 0.012) * 100}%`, height: `${(env.bottom - hinge - 0.03) * 100}%` });
      if (card?.names?.[0]) {
        paper.innerHTML = `<div class="op-card-in"><p class="k"></p><p class="n"></p><p class="a"></p><p class="n"></p></div>`;
        const [k, n1, a, n2] = paper.querySelectorAll("p");
        k.textContent = card.kicker || ""; n1.textContent = card.names[0]; a.textContent = card.amp || "&"; n2.textContent = card.names[1] || "";
        paper.lang = card.lang || "en";
      }
      if (theme.palette?.paper) paper.style.setProperty("--card-paper", theme.palette.paper);
      const pocket = el("div", "op-pocket", box);
      pocket.style.backgroundImage = `url(${closed})`;
      pocket.style.clipPath = clip([[env.left, shoulder(0)], tip, [env.right, shoulder(1)], [env.right, env.bottom], [env.left, env.bottom]]);
      const flap = el("div", "op-flap top", box);
      flap.style.backgroundImage = `url(${closed})`;
      flap.style.clipPath = clip(poly);
      // The paper's own colour, read from the pocket, for the inside and the flap's back.
      load(closed).then((img) => {
        const c = document.createElement("canvas"); c.width = c.height = 8;
        const g = c.getContext("2d", { willReadFrequently: true });
        const w = img.naturalWidth, h = img.naturalHeight;
        // Plain paper on the pocket's left, clear of the border, the stamps and the postmark.
        g.drawImage(img, w * (env.left + (env.right - env.left) * 0.1), h * (tip[1] + (env.bottom - tip[1]) * 0.3), w * (env.right - env.left) * 0.25, h * (env.bottom - tip[1]) * 0.25, 0, 0, 8, 8);
        const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        box.style.setProperty("--env-paper", `rgb(${Math.round(r / n)} ${Math.round(gg / n)} ${Math.round(b / n)})`);
      }).catch(() => {});
    } else {
      for (const side of ["left", "right", "bottom", "top"]) {
        const f = el("div", `op-flap ${side}`, box);
        f.style.backgroundImage = `url(${closed})`;
      }
    }
    const ring = el("canvas", "op-ring", box);
    const seal = el("button", "op-seal", box);
    seal.type = "button";
    seal.setAttribute("aria-label", label);
    // The pressed seal matches the one painted on the envelope when the theme measured it.
    const painted = o.sealInPainting;
    if (painted) seal.style.width = `${(painted.outer_r || painted.r * 1.15) * 2 * 104}%`;
    const sealCanvas = el("canvas", "", seal);
    el("span", "op-pulse", seal);

    // The relief of the embossing, for the ring of light to catch.
    let relief = null;
    const painting = load(closed);
    painting.then((img) => { relief = reliefMap(img, 270, Math.round(270 * img.naturalHeight / img.naturalWidth)); }).catch(() => {});

    // The couple's seal (data.seal): their initials set in the invite's fonts, or a motif.
    const die = sealDie(sealChoice, couple, initials, theme);
    const sealSrc = theme.art?.seal ? base + theme.art.seal : null;
    if (sealSrc) {
      load(sealSrc).then((img) => pressSeal(sealCanvas, img, die, o.sealFace, o)).catch(() => drawPlainSeal(sealCanvas, die, o));
    } else drawPlainSeal(sealCanvas, die, o);

    seal.addEventListener("click", () => onOpen(), { once: true });

    const ctrl = {
      box,
      // The seal and enough of the folds round it to read as an envelope (all of it, on paper).
      focus: focusOf(o, env ? [env.left, env.top - 0.04, env.right, env.bottom + 0.02] : [cx - 0.27, cy - 0.24, cx + 0.27, cy + 0.24]),
      closed: painting,
      async play() {
        seal.classList.add("pressed");
        await wait(140);
        seal.classList.add("gone");
        if (env) return unfold();
        // The ring of light catches an embossed envelope's relief; on a desk it would catch the wood grain.
        if (!reduced && relief) sweepRing(ring, relief, cx, cy);
        await wait(520);
        box.classList.add("open");
        await wait(1200);
      },
    };

    // On the desk: the flap folds back, the card rises out of the pocket, then fills the screen.
    async function unfold() {
      const flap = box.querySelector(".op-flap.top"), back = box.querySelector(".op-flapback"), hollow = box.querySelector(".op-hollow");
      const run = (node, frames, ms, easing, delay = 0) => node.animate(frames, { duration: ms, easing, delay, fill: "forwards" }).finished;
      await wait(260);
      hollow.style.opacity = "1";
      // Seen from above, a flap turning on its hinge shrinks to the hinge, then its back opens out beyond it.
      await run(flap, [{ transform: "scaleY(1)", filter: "brightness(1)" }, { transform: "scaleY(0.02)", filter: "brightness(0.78)" }], 380, "cubic-bezier(0.5, 0, 0.9, 0.6)");
      flap.style.visibility = "hidden";
      await run(back, [{ transform: "scaleY(0.02)", filter: "brightness(0.82)" }, { transform: "scaleY(1)", filter: "brightness(1)" }], 420, "cubic-bezier(0.1, 0.5, 0.3, 1)");
      // Out of the pocket: up by its own height, so it clears the envelope before it is lifted.
      const h = paper.getBoundingClientRect().height;
      await run(paper, [{ transform: "translateY(0)" }, { transform: `translateY(${-(h * 1.04)}px)` }], 950, "cubic-bezier(0.65, 0, 0.35, 1)", 80);
      paper.classList.add("out");
      // Then up to the guest: centred and scaled to cover the screen, its words fading as it nears.
      const r = paper.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      const k = Math.max(vw / r.width, vh / r.height) * 1.06;
      const dx = vw / 2 - (r.left + r.width / 2), dy = vh / 2 - (r.top + r.height / 2);
      const base0 = `translateY(${-(h * 1.04)}px)`;
      paper.querySelector(".op-card-in")?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, delay: 380, easing: "ease-out", fill: "forwards" });
      await run(paper, [{ transform: `${base0} translate(0, 0) scale(1)` }, { transform: `translate(${dx}px, ${dy}px) ${base0} scale(${k})` }], 1050, "cubic-bezier(0.7, 0, 0.2, 1)", 120);
      // Faded by now; gone, so the blown-up words don't linger over the page as the gate fades.
      paper.querySelector(".op-card-in")?.remove();
    }

    return ctrl;
  }

  // Luminance minus its blur: the bright ridges of an embossed paper.
  function reliefMap(img, w, h) {
    const a = document.createElement("canvas"); a.width = w; a.height = h;
    const ga = a.getContext("2d", { willReadFrequently: true });
    ga.drawImage(img, 0, 0, w, h);
    const b = document.createElement("canvas"); b.width = w; b.height = h;
    const gb = b.getContext("2d", { willReadFrequently: true });
    gb.filter = "blur(3px)"; gb.drawImage(a, 0, 0);
    const A = ga.getImageData(0, 0, w, h), B = gb.getImageData(0, 0, w, h).data, P = A.data;
    for (let i = 0; i < P.length; i += 4) {
      const la = 0.3 * P[i] + 0.59 * P[i + 1] + 0.11 * P[i + 2];
      const lb = 0.3 * B[i] + 0.59 * B[i + 1] + 0.11 * B[i + 2];
      const v = Math.max(0, Math.min(1, (la - lb) / 14));
      P[i] = 255; P[i + 1] = 226; P[i + 2] = 160; P[i + 3] = Math.round(v * 255);
    }
    ga.putImageData(A, 0, 0);
    return a;
  }

  // A ring of warm light travels out from the seal; where it passes, the embossing shines.
  function sweepRing(cvs, relief, cx, cy) {
    const r = cvs.getBoundingClientRect();
    const dpr = ratio(r);
    cvs.width = Math.round(r.width * dpr); cvs.height = Math.round(r.height * dpr);
    const g = cvs.getContext("2d");
    const w = cvs.width, h = cvs.height, ox = cx * w, oy = cy * h;
    const maxR = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy));
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
    const tg = tmp.getContext("2d");
    return tween(1150, (u) => {
      const rad = easeOut(u) * maxR * 1.05, band = maxR * 0.16;
      g.clearRect(0, 0, w, h);
      tg.globalCompositeOperation = "source-over";
      tg.clearRect(0, 0, w, h);
      tg.drawImage(relief, 0, 0, w, h);
      tg.globalCompositeOperation = "destination-in";
      const ring = tg.createRadialGradient(ox, oy, Math.max(0, rad - band), ox, oy, rad + band * 0.35);
      ring.addColorStop(0, "rgba(0,0,0,0)"); ring.addColorStop(0.65, "rgba(0,0,0,1)"); ring.addColorStop(1, "rgba(0,0,0,0)");
      tg.fillStyle = ring; tg.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 1 - u * 0.4;
      g.drawImage(tmp, 0, 0);
      g.drawImage(tmp, 0, 0);
      const halo = g.createRadialGradient(ox, oy, Math.max(0, rad - band * 0.4), ox, oy, rad + band * 0.2);
      halo.addColorStop(0, "rgba(255,230,170,0)"); halo.addColorStop(0.7, `rgba(255,232,180,${0.22 * (1 - u)})`); halo.addColorStop(1, "rgba(255,230,170,0)");
      g.fillStyle = halo; g.fillRect(0, 0, w, h);
      g.globalAlpha = 1;
    }).then(() => g.clearRect(0, 0, w, h));
  }

  // ───────── The seal ─────────
  // Every couple picks one seal for any invite that opens from an envelope (data.seal, founders,
  // 21 October 2026, docs/royal-custom-logos.md): their initials set in the invite's own fonts (the
  // pair "TV", "T&V", or the Hindi "तव" when both Hindi names are typed), or one motif drawn once
  // for everyone (seal/<motif>.png beside this file, made by web/scripts/seal-dies.ts). One script
  // per mark: a Devanagari initial beside a Latin one read as "dV". No deity ever: the guest breaks it.
  const SEAL_MOTIFS = ["rose", "lotus", "paisley", "peacock", "elephant", "marigold"];
  const HERE = document.currentScript?.src || "";
  const sealArt = (motif) => new URL(`seal/${motif}.png`, HERE || new URL(window.SAATH?.root || "/invite/", location.href)).href;

  // The first akshara's base consonant or vowel, as the logos take it (src/lib/server/logo/rules.ts):
  // प्रिया -> प, ज़ोया -> ज़, and the four conjuncts taught as letters stay whole (श्रेया -> श्र).
  function devaInitial(name) {
    const s = String(name || "").normalize("NFC").trim();
    const c0 = s[0];
    if (!c0) return "";
    if (/[ऄ-औॠॡॲ-ॷ]/.test(c0)) return c0;
    if (!/[क-हक़-य़ॸ-ॿ]/.test(c0)) return "";
    let base = c0, i = 1;
    if (s[i] === "़") base += s[i++];
    if (s[i] === "्" && s[i + 1] && ["क्ष", "त्र", "ज्ञ", "श्र"].includes(base + s[i] + s[i + 1])) return base + s[i] + s[i + 1];
    return base;
  }
  const latinInitial = (name) => (String(name || "").match(/[A-Za-z]/)?.[0] || "").toUpperCase();

  // What the die carries: { motif } or { text: [a, b], amp, font }. Absent means the pair.
  function sealDie(choice, couple, initials, theme) {
    const c = choice || {};
    if (c.kind === "motif" && SEAL_MOTIFS.includes(c.motif)) return { motif: c.motif };
    const f = theme.fonts || {};
    // The invite's script, unless the design names the face its seal reads best in (opening.sealFont:
    // a role in its fonts, such as "display", or a family).
    const named = theme.opening?.sealFont;
    const deva = f.deva || "Tiro Devanagari Hindi", script = (named && (f[named] || named)) || f.script || "Pinyon Script";
    const her = couple?.her || {}, him = couple?.him || {};
    const ha = devaInitial(her.hi), hb = devaInitial(him.hi);
    if (c.kind === "hindi" && ha && hb) return { text: [ha, hb], font: deva, deva: true };
    // Before the engine passed the couple (an older engine.js), only the two Latin initials came.
    const la = couple ? latinInitial(her.en) : latinInitial(initials?.[0]), lb = couple ? latinInitial(him.en) : latinInitial([...(initials || "")][1]);
    if (la && lb) return { text: [la, lb], amp: c.kind === "amp", font: script };
    // Names typed only in Devanagari: their Hindi initials, never one of each script.
    if (ha && hb) return { text: [ha, hb], amp: c.kind === "amp", font: deva, deva: true };
    return la || lb ? { text: [la || lb], font: script } : { text: [ha || hb].filter(Boolean), font: deva, deva: true };
  }

  // Canvas text falls back to a default face if the font hasn't arrived, and never redraws: today's
  // seal pressed "T&V" in a serif for that reason. The engine adds the fonts' stylesheet just before
  // the opening is built, so ask until its faces exist (about 3 s at most), then press regardless.
  async function fontReady(font, text) {
    if (!document.fonts?.load) return;
    // Pinyon Script's S is pressed in Allura's, as the page writes it (engine.js applyTheme). The editor's
    // seal swatches load only the theme's faces, so the one letter is asked for here if no one has.
    const capS = CAP_S[font] && text.includes("S") ? CAP_S[font] : null;
    if (capS && !document.querySelector("link[data-cap-s]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.dataset.capS = "";
      l.href = `https://fonts.googleapis.com/css2?family=${capS.replace(/ /g, "+")}&text=S&display=swap`;
      document.head.appendChild(l);
    }
    for (const f of capS ? [font, capS] : [font]) {
      for (let k = 0; k < 20; k++) {
        try { if ((await document.fonts.load(`80px "${f}"`, text)).length) break; } catch {}
        await wait(150);
      }
    }
  }
  const CAP_S = { "Pinyon Script": "Allura" };
  const faces = (font) => (CAP_S[font] ? `"${CAP_S[font]}", "${font}"` : `"${font}"`);

  // The die as coverage (0 to 1) over the work box: a fine ring inside the face's rim, then the
  // initials or the motif filling the circle inside it. Text is fitted by its inked box, swashes
  // included, so its corners stay inside the circle.
  async function dieCoverage(die, S, fx, fy, fr, box, scale) {
    const [bx, by, bw, bh] = box;
    const c = document.createElement("canvas"); c.width = bw; c.height = bh;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#000"; g.fillRect(0, 0, bw, bh);
    g.translate(-bx, -by);
    const Rd = fr * 0.86, lw = Rd * 0.036, Rc = Rd * (die.motif ? 0.83 : 0.8);
    g.strokeStyle = "#fff"; g.lineWidth = lw;
    g.beginPath(); g.arc(fx, fy, Rd - lw / 2, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#fff";
    if (die.motif) {
      const img = await load(sealArt(die.motif));
      g.drawImage(img, fx - Rc, fy - Rc, Rc * 2, Rc * 2);
    } else if (die.text?.length) {
      const parts = die.amp ? [die.text[0], "&", die.text[1]] : die.text;
      const rel = die.amp ? [1, 0.58, 1] : parts.map(() => 1);
      await fontReady(die.font, parts.join(""));
      const P = 100, track = die.deva ? 0.1 : die.amp ? 0.05 : 0.06;
      g.textBaseline = "alphabetic"; g.textAlign = "left";
      // Spaced as the typeface spaces them (a script's V tucks under the T's bar), a little apart, on
      // one baseline; then the inked box of the lot, swashes included.
      let pen = 0, left = Infinity, right = -Infinity, top = 0, bottom = 0;
      const placed = parts.map((t, i) => {
        g.font = `${P * rel[i]}px ${faces(die.font)}, serif`;
        const m = g.measureText(t);
        const x = pen;
        left = Math.min(left, x - m.actualBoundingBoxLeft); right = Math.max(right, x + m.actualBoundingBoxRight);
        top = Math.max(top, m.actualBoundingBoxAscent); bottom = Math.max(bottom, m.actualBoundingBoxDescent);
        pen = x + m.width + P * track;
        return { t, x, size: P * rel[i] };
      });
      const W = right - left, Hh = top + bottom;
      // The box's corners stay inside the circle (an inked box's corners are mostly empty, so the
      // circle for words reaches nearer the ring than a motif's); tall initials are held to a height.
      const Rt = Rd * 0.88;
      const k = Math.min((2 * Rt) / Math.hypot(W, Hh), (Rt * 1.4) / Hh);
      const ox = fx - ((left + right) / 2) * k, oy = fy - ((bottom - top) * k) / 2;
      // Thickened a little, as the prototype's dies were, so a script's hairlines survive the wax:
      // about 3% of the letter's size, and at least 1.6 pixels where the seal is shown small.
      g.lineJoin = "round"; g.strokeStyle = "#fff";
      for (const p of placed) {
        g.font = `${p.size * k}px ${faces(die.font)}, serif`;
        g.lineWidth = Math.max(p.size * k * (die.deva ? 0.012 : 0.03), 1.6 / (scale || 1));
        g.fillText(p.t, ox + p.x * k, oy);
        g.strokeText(p.t, ox + p.x * k, oy);
      }
    }
    const d = g.getImageData(0, 0, bw, bh).data, m = new Float32Array(bw * bh);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4] / 255;
    return m;
  }

  // Squared distances (Felzenszwalb and Huttenlocher): for every pixel, to the nearest one where
  // `feature` is true. Rows, then columns.
  function edt(feature, w, h) {
    const INF = 1e20, n = Math.max(w, h);
    const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    const D = new Float64Array(w * h);
    for (let i = 0; i < D.length; i++) D[i] = feature[i] ? 0 : INF;
    const pass = (len, get, set) => {
      for (let q = 0; q < len; q++) f[q] = get(q);
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < len; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
      for (let q = 0; q < len; q++) set(q, d[q]);
    };
    for (let y = 0; y < h; y++) pass(w, (x) => D[y * w + x], (x, val) => { D[y * w + x] = val; });
    for (let x = 0; x < w; x++) pass(h, (y) => D[y * w + x], (y, val) => { D[y * w + x] = val; });
    for (let i = 0; i < D.length; i++) D[i] = Math.sqrt(D[i]);
    return D;
  }

  // A Gaussian blur of a float map, as three box blurs.
  function blur(src, w, h, sigma) {
    if (sigma < 0.3) return Float32Array.from(src);
    const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    const sizes = [0, 1, 2].map((i) => (i < Math.round(mIdeal) ? wl : wl + 2));
    let a = Float32Array.from(src), b = new Float32Array(src.length);
    const run = (from, to, r, horiz) => {
      const len = horiz ? w : h, lines = horiz ? h : w, at = (line, i) => (horiz ? line * w + i : i * w + line);
      for (let line = 0; line < lines; line++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += from[at(line, Math.min(len - 1, Math.max(0, i)))];
        for (let i = 0; i < len; i++) {
          to[at(line, i)] = acc / (2 * r + 1);
          acc += from[at(line, Math.min(len - 1, i + r + 1))] - from[at(line, Math.max(0, i - r))];
        }
      }
    };
    for (const s of sizes) { const r = (s - 1) / 2; run(a, b, r, true); run(b, a, r, false); }
    return a;
  }

  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // Press the die into the seal photo, as wax.py did for the 21 October prototype: the die becomes
  // a height map (sunk with rounded walls, a slight lip of displaced wax round it), lit from the
  // photo's upper left. The wall away from the light falls into shadow and casts a short shadow on
  // the floor, the far wall and the lip catch a highlight, the floor is a touch darker and more
  // matte, and all of it multiplies the photo's own pixels, so its texture and gloss stay. Light wax
  // (Ivory) is translucent: softer contrast, less gloss, warm shadows.
  const FINISH = { light: { depth: 0.028, gloss: 0.55, contrast: 0.58, wall: 0.017 }, dark: { depth: 0.03, gloss: 1, contrast: 1, wall: 0.015 } };
  // `size` is the canvas's side: 512 on the envelope, smaller for the editor's swatches.
  async function pressSeal(cvs, img, die, face, o, size = 512) {
    const S = size;
    cvs.width = cvs.height = S;
    const g = cvs.getContext("2d", { willReadFrequently: true });
    // The blank seal at once; the impression follows when the font or the motif has arrived.
    g.drawImage(img, 0, 0, S, S);
    const fx = (face?.cx ?? 0.5) * S, fy = (face?.cy ?? 0.5) * S, fr = (face?.r ?? 0.32) * S;
    const R = Math.ceil(fr * 1.04);
    const bx = Math.max(0, Math.floor(fx - R)), by = Math.max(0, Math.floor(fy - R));
    const bw = Math.min(S, Math.ceil(fx + R)) - bx, bh = Math.min(S, Math.ceil(fy + R)) - by;
    // How many screen pixels each of the canvas's pixels lands on (Safar's seal is shown about 60 px wide).
    const shown = cvs.getBoundingClientRect().width * (devicePixelRatio || 1);
    let m;
    try { m = await dieCoverage(die, S, fx, fy, fr, [bx, by, bw, bh], shown ? shown / S : 1); } catch { return; }
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 500 }) : setTimeout(r, 0)));
    const im = g.getImageData(bx, by, bw, bh), P = im.data, N = bw * bh;
    // The wax's tone, from its flat face.
    let lum = 0, cnt = 0;
    for (let y = 0; y < bh; y += 3) for (let x = 0; x < bw; x += 3) {
      if (Math.hypot(bx + x - fx, by + y - fy) > fr * 0.8) continue;
      const i = (y * bw + x) * 4; lum += (0.3 * P[i] + 0.59 * P[i + 1] + 0.11 * P[i + 2]) / 255; cnt++;
    }
    const fin = { ...(cnt && lum / cnt > 0.45 ? FINISH.light : FINISH.dark), ...(o?.sealFinish || {}) };
    const D = 2 * fr * 0.86, wall = fin.wall * D, dep = fin.depth * D;
    const inF = new Uint8Array(N), outF = new Uint8Array(N);
    for (let i = 0; i < N; i++) { inF[i] = m[i] <= 0.5; outF[i] = m[i] > 0.5; }
    const inside = edt(inF, bw, bh), outside = edt(outF, bw, bh);
    const s = new Float32Array(N), h0 = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (m[i] > 0.5) { s[i] = smooth(0, wall, inside[i] + Math.min(0.5, m[i] - 0.5)); h0[i] = -dep * s[i]; }
      else h0[i] = 0.18 * dep * Math.exp(-((outside[i] / (wall * 1.6)) ** 2));
    }
    const h = blur(h0, bw, bh, wall * 0.45), hBig = blur(h, bw, bh, wall * 3);
    const Lr = Math.hypot(-0.46, -0.61, 0.64), Lx = -0.46 / Lr, Ly = -0.61 / Lr, Lz = 0.64 / Lr;
    const Lxy = Math.hypot(Lx, Ly), dx = Lx / Lxy, dy = Ly / Lxy, tanE = Lz / Lxy;
    // Cast shadow: march towards the light; shaded where the surface ahead rises above the ray.
    const occ = new Float32Array(N);
    const at = (x, y) => {
      x = Math.max(0, Math.min(bw - 1, x)); y = Math.max(0, Math.min(bh - 1, y));
      const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(bw - 1, x0 + 1), y1 = Math.min(bh - 1, y0 + 1), u = x - x0, v = y - y0;
      return (h[y0 * bw + x0] * (1 - u) + h[y0 * bw + x1] * u) * (1 - v) + (h[y1 * bw + x0] * (1 - u) + h[y1 * bw + x1] * u) * v;
    };
    const steps = Math.floor((dep / tanE) * 2.2) + 2;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = y * bw + x, hi = h[i];
      if (hi > -0.02 * dep && s[i] === 0 && hBig[i] > -0.02 * dep) continue;
      let o2 = 0;
      for (let t = 1; t < steps; t++) o2 = Math.max(o2, at(x + dx * t, y + dy * t) - hi - t * tanE);
      occ[i] = o2;
    }
    const Hx = Lx, Hy = Ly, Hz = Lz + 1, Hn = Math.hypot(Hx, Hy, Hz);
    const hx = Hx / Hn, hy = Hy / Hn, hz = Hz / Hn, specFlat = hz ** 38;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = y * bw + x, p = i * 4;
      const rr = Math.hypot(bx + x + 0.5 - fx, by + y + 0.5 - fy);
      const a = 1 - smooth(fr * 0.95, fr, rr);
      if (a <= 0 || P[p + 3] < 10) continue;
      const gx = (h[y * bw + Math.min(bw - 1, x + 1)] - h[y * bw + Math.max(0, x - 1)]) / 2;
      const gy = (h[Math.min(bh - 1, y + 1) * bw + x] - h[Math.max(0, y - 1) * bw + x]) / 2;
      const nl = Math.hypot(gx, gy, 1), nx = -gx / nl, ny = -gy / nl, nz = 1 / nl;
      const lam = (nx * Lx + ny * Ly + nz * Lz) / Lz;
      const diffuse = 1 + 0.95 * (Math.max(0.15, Math.min(2.2, lam)) - 1);
      const shadow = 1 - 0.55 * Math.max(0, Math.min(1, occ[i] / (0.35 * dep)));
      const ao = 1 - 0.3 * Math.max(0, Math.min(1, (hBig[i] - h[i]) / dep));
      const floor = 1 - 0.08 * s[i];
      const spec = Math.max(0, Math.min(1, Math.max(0, nx * hx + ny * hy + nz * hz) ** 38 - specFlat)) * 0.55 * fin.gloss * (1 - 0.6 * s[i]);
      const f = Math.max(0.05, Math.min(3, 1 + fin.contrast * (diffuse * shadow * ao * floor - 1)));
      const tint = [0.88, 1, 1.18], hl = [1, 0.97, 0.92];
      for (let c = 0; c < 3; c++) {
        const b = P[p + c] / 255;
        const col = Math.max(0, Math.min(1, b * f ** tint[c] + spec * hl[c]));
        P[p + c] = Math.round((b * (1 - a) + col * a) * 255);
      }
    }
    g.putImageData(im, bx, by);
  }

  // Without a seal photograph: a drawn seal, still pressed rather than printed.
  function drawPlainSeal(cvs, die, o) {
    const S = 512; cvs.width = cvs.height = S;
    const g = cvs.getContext("2d");
    const grad = g.createRadialGradient(S * 0.42, S * 0.36, S * 0.05, S / 2, S / 2, S * 0.5);
    grad.addColorStop(0, "#fffdf8"); grad.addColorStop(0.6, "#efe5d2"); grad.addColorStop(1, "#d9c9ab");
    g.fillStyle = grad;
    g.beginPath();
    for (let k = 0; k <= 26; k++) { const a = (k / 26) * Math.PI * 2, r = S * (0.46 + 0.02 * Math.sin(k * 2.7)); g.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
    g.fill();
    const img = new Image();
    img.onload = () => pressSeal(cvs, img, die, { cx: 0.5, cy: 0.5, r: 0.36 }, o);
    img.src = cvs.toDataURL();
  }

  // ───────── Doors: two carved leaves swing open onto the courtyard ─────────
  function doors({ stage, theme, base, reduced, label, onOpen }) {
    const o = theme.opening || {};
    const [x0, y0, x1, y1] = o.doors || [0.2, 0.2, 0.8, 0.95];
    const box = frame(stage, theme);
    box.classList.add("op-doors");
    const under = el("img", "op-under", box);
    under.src = base + theme.art.open; under.alt = "";
    // With CORS, as the hero's painting, so the engine can read the closed doors under the words.
    const over = el("img", "op-over", box);
    over.crossOrigin = "anonymous"; over.src = base + theme.art.closed; over.alt = "";
    const closed = base + theme.art.closed;
    const mid = o.seam || (x0 + x1) / 2;
    const leaves = [["left", x0, mid], ["right", mid, x1]].map(([side, a, b]) => {
      const leaf = el("div", `op-leaf ${side}`, box);
      Object.assign(leaf.style, { left: `${a * 100}%`, top: `${y0 * 100}%`, width: `${(b - a) * 100}%`, height: `${(y1 - y0) * 100}%` });
      const face = el("div", "op-leaf-face", leaf);
      Object.assign(face.style, {
        backgroundImage: `url(${closed})`,
        backgroundSize: `${100 / (b - a)}% ${100 / (y1 - y0)}%`,
        backgroundPosition: `${(a / (1 - (b - a))) * 100}% ${(y0 / (1 - (y1 - y0))) * 100}%`,
      });
      return leaf;
    });
    const seam = el("i", "op-seam", box);
    Object.assign(seam.style, { left: `${mid * 100}%`, top: `${y0 * 100}%`, height: `${(y1 - y0) * 100}%` });
    // Things painted in front of the doors (threshold lamps) stay in front while the leaves swing.
    if (theme.art.fore) { const fore = el("img", "op-fore", box); fore.src = base + theme.art.fore; fore.alt = ""; }
    const btn = el("button", "op-tap", box);
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    Object.assign(btn.style, { left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` });
    // A tap anywhere on the picture opens the doors.
    box.style.cursor = "pointer";
    box.addEventListener("click", () => onOpen(), { once: true });
    return {
      box,
      // The doorway with its arch above and the threshold below.
      focus: focusOf(o, [x0 - 0.02, y0 - 0.07, x1 + 0.02, y1 + 0.03]),
      closed: ready(over),
      async play() {
        btn.remove();
        over.classList.add("gone");
        box.classList.add("open");
        await wait(reduced ? 0 : 1700);
      },
    };
  }

  // ───────── Curtains: two panels draw apart and bunch at the sides (velvet, garland strings) ─────────
  // The panels are cut from the closed painting into vertical strips. Each strip slides towards
  // its side and narrows, the edge at the seam travelling furthest and first, so the cloth gathers
  // the way a drawn curtain does; then they fade into the open painting, whose curtains are
  // already tied back.
  function curtains({ stage, theme, base, reduced, label, onOpen }) {
    const o = theme.opening || {};
    const [x0, y0, x1, y1] = o.panels || [0.12, 0.16, 0.88, 0.88];
    const mid = o.seam || (x0 + x1) / 2;
    // Strands (Genda's marigold strings, opening.strands per side) part one by one and keep their
    // width; cloth (Parda's velvet) bunches up.
    const strands = o.strands ? Math.max(4, Math.min(24, o.strands)) : 0;
    const n = strands || Math.max(4, Math.min(16, o.strips || 10));
    const box = frame(stage, theme);
    box.classList.add("op-curtains");
    if (strands) box.classList.add("strands");
    const under = el("img", "op-under", box);
    under.src = base + theme.art.open; under.alt = "";
    const over = el("img", "op-over", box);
    over.crossOrigin = "anonymous"; over.src = base + theme.art.closed; over.alt = "";
    // The strips are cut from the closed painting, or from `panels` when something that must stay
    // still (Genda's toran) hangs in front of the curtain and is painted out of that copy.
    const closed = base + (theme.art.panels || theme.art.closed);
    const strips = [];
    for (const [side, a0, a1] of [["left", x0, mid], ["right", mid, x1]]) {
      const span = a1 - a0, w = span / n, keep = o.gather || 0.22;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * w, b = a + w;
        const s = el("div", `op-strip ${side}`, box);
        Object.assign(s.style, { left: `${a * 100}%`, top: `${y0 * 100}%`, width: `${w * 100}%`, height: `${(y1 - y0) * 100}%` });
        Object.assign(el("div", "op-strip-face", s).style, {
          backgroundImage: `url(${closed})`,
          backgroundSize: `${100 / w}% ${100 / (y1 - y0)}%`,
          backgroundPosition: `${(a / (1 - w)) * 100}% ${(y0 / (1 - (y1 - y0))) * 100}%`,
        });
        el("i", "op-fold", s);
        // Where this strip ends up: the whole panel narrowed to `keep` of its width, against its side.
        const from = side === "left" ? a - a0 : a1 - b;
        const dx = side === "left" ? -from * (1 - keep) : from * (1 - keep);
        // The strip nearest the seam moves first; the outer ones wait for the cloth to reach them.
        const nearSeam = side === "left" ? (b - a0) / span : (a1 - a) / span;
        s.style.setProperty("--dx", `${(dx / w) * 100}%`);
        s.style.setProperty("--k", String(keep + 0.04));
        s.style.setProperty("--delay", `${Math.round((1 - nearSeam) * 260)}ms`);
        // A strand ends in a bunch by the jamb, overlapping its neighbours, at full width.
        const k = side === "left" ? i : n - 1 - i;
        s.dataset.dx = String(((side === "left" ? -1 : 1) * k * 0.72 * 100));
        s.dataset.side = side;
        s.dataset.near = String(nearSeam);
        strips.push(s);
      }
    }
    const seam = el("i", "op-seam", box);
    Object.assign(seam.style, { left: `${mid * 100}%`, top: `${y0 * 100}%`, height: `${(y1 - y0) * 100}%` });
    if (theme.art.fore) { const fore = el("img", "op-fore", box); fore.src = base + theme.art.fore; fore.alt = ""; }
    const btn = el("button", "op-tap", box);
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    Object.assign(btn.style, { left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` });
    box.style.cursor = "pointer";
    box.addEventListener("click", () => onOpen(), { once: true });
    const ctrl = {
      box,
      // The whole stage opening, with a little of the proscenium round it.
      focus: focusOf(o, [x0 - 0.02, y0 - 0.06, x1 + 0.02, y1 + 0.03]),
      closed: ready(over),
      async play() {
        btn.remove();
        over.classList.add("gone");
        if (strands && !reduced) return part();
        box.classList.add("open");
        await wait(reduced ? 0 : 1900);
      },
    };

    // Parted by hand from the middle: each string swings aside from where it hangs, its foot
    // trailing and then swinging past, and settles in a bunch by the jamb. Then the open
    // painting's own tied-back bunches take over.
    async function part() {
      const runs = strips.map((s) => {
        const dx = +s.dataset.dx, lag = (s.dataset.side === "left" ? 1 : -1) * (4 + 6 * +s.dataset.near);
        const delay = Math.round((1 - +s.dataset.near) * 380);
        return s.animate([
          { transform: "translateX(0) skewX(0deg)", offset: 0 },
          { transform: `translateX(${dx * 0.5}%) skewX(${lag}deg)`, offset: 0.4 },
          { transform: `translateX(${dx * 1.02}%) skewX(${-lag * 0.45}deg)`, offset: 0.72 },
          { transform: `translateX(${dx * 0.99}%) skewX(${lag * 0.18}deg)`, offset: 0.87 },
          { transform: `translateX(${dx}%) skewX(0deg)`, offset: 1 },
        ], { duration: 1500, delay, easing: "cubic-bezier(0.45, 0, 0.3, 1)", fill: "forwards" }).finished;
      });
      await Promise.all(runs);
      await Promise.all(strips.map((s) => s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease-out", fill: "forwards" }).finished));
    }
    return ctrl;
  }

  // ───────── Light from a point: lotus, lamp, chandelier ─────────
  function reveal({ stage, theme, base, reduced, label, onOpen }) {
    const o = theme.opening || {};
    const type = o.type || "lamp";
    const [ox, oy] = o.origin || [0.5, 0.5];
    const box = frame(stage, theme);
    box.classList.add("op-reveal", `op-${type}`);
    const under = el("img", "op-under", box);
    under.src = base + theme.art.open; under.alt = "";
    const over = el("img", "op-over", box);
    over.crossOrigin = "anonymous"; over.src = base + theme.art.closed; over.alt = "";
    const sparks = el("canvas", "op-sparks", box);
    const btn = el("button", "op-point", box);
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    Object.assign(btn.style, { left: `${ox * 100}%`, top: `${oy * 100}%` });
    el("span", "op-pulse", btn);
    const hold = type === "lotus";
    let fired = false;
    const fire = () => { if (fired) return; fired = true; onOpen(); };
    // Guests tap wherever they like on the picture; the pulse only shows where the light will start.
    box.style.cursor = "pointer";
    if (hold) {
      let timer = 0;
      const start = (e) => { e.preventDefault(); btn.classList.add("holding"); timer = setTimeout(fire, 650); };
      const stop = () => { btn.classList.remove("holding"); clearTimeout(timer); };
      box.addEventListener("pointerdown", start);
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => box.addEventListener(ev, stop));
      btn.addEventListener("click", (e) => e.detail === 0 && fire());
    } else box.addEventListener("click", fire, { once: true });

    // Round the point the light starts from: the lotus in its pond, the lamp down to its foot,
    // the chandelier with its crystals.
    const [l, t, r, b] = { lotus: [0.24, 0.14, 0.24, 0.14], lamp: [0.17, 0.13, 0.17, 0.4], chandelier: [0.24, 0.2, 0.24, 0.17] }[type] || [0.22, 0.18, 0.22, 0.18];
    return {
      box,
      focus: focusOf(o, [ox - l, oy - t, ox + r, oy + b]),
      closed: ready(over),
      async play() {
        btn.remove();
        if (reduced) { over.style.opacity = 0; return; }
        const g = glow(box, ox, oy);
        requestAnimationFrame(() => g.classList.add("on"));
        runSparks(sparks, ox, oy, type);
        await tween(1700, (u) => {
          const r = ease(u) * 150;
          const m = `radial-gradient(circle at ${ox * 100}% ${oy * 100}%, transparent ${Math.max(0, r - 18)}%, #000 ${r + 6}%)`;
          over.style.webkitMaskImage = m;
          over.style.maskImage = m;
        });
        over.style.opacity = 0;
        await wait(250);
      },
    };
  }

  // Sparks for a lamp, twinkles for a chandelier, motes for a lotus.
  function runSparks(cvs, ox, oy, type) {
    const r = cvs.getBoundingClientRect();
    const dpr = ratio(r);
    cvs.width = Math.round(r.width * dpr); cvs.height = Math.round(r.height * dpr);
    const g = cvs.getContext("2d");
    const w = cvs.width, h = cvs.height, x = ox * w, y = oy * h;
    const n = type === "chandelier" ? 70 : 46;
    const ps = Array.from({ length: n }, () => {
      const a = Math.random() * Math.PI * 2, s = (type === "lamp" ? 0.25 : 0.6) + Math.random() * 1.2;
      return { x, y, vx: Math.cos(a) * s * dpr, vy: (type === "lamp" ? -Math.abs(Math.sin(a)) * 1.6 - 0.6 : Math.sin(a) * s) * dpr, life: 0.6 + Math.random() * 0.9, r: (1 + Math.random() * 2.2) * dpr };
    });
    const t0 = performance.now();
    const step = (now) => {
      const el = (now - t0) / 1000;
      g.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of ps) {
        const k = el / p.life;
        if (k >= 1) continue;
        alive++;
        p.x += p.vx * (type === "chandelier" ? 2.2 : 1.4);
        p.y += p.vy * (type === "chandelier" ? 2.2 : 1.4);
        const a = (1 - k) * (type === "chandelier" ? 0.5 + 0.5 * Math.sin(el * 30 + p.r) : 1);
        g.fillStyle = `rgba(255,${type === "lotus" ? 210 : 220},${type === "lotus" ? 200 : 150},${a})`;
        g.beginPath(); g.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, Math.PI * 2); g.fill();
      }
      if (alive) requestAnimationFrame(step); else g.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(step);
  }

  // ───────── Film: the opening as a short film (Hum Dono's envelope, made in Flow) ─────────
  // The gate shows the film's first frame, sharp; the tap plays the film (muted, inline) from
  // `from` to `to` seconds at `rate`, and the page begins on its last frame. opening: { type:
  // "film", film, first, last (files beside theme.json), tap: [x0, y0, x1, y1], from, to, rate,
  // hold (ms on the last frame), aspect }. A phone that won't play it crossfades to the last frame.
  function film({ stage, theme, base, label, onOpen }) {
    const o = theme.opening || {};
    const [x0, y0, x1, y1] = o.tap || [0.3, 0.35, 0.7, 0.65];
    const box = frame(stage, theme);
    box.classList.add("op-film");
    const v = el("video", "op-video", box);
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.preload = "auto";
    v.src = base + o.film;
    const end = el("img", "op-end", box);
    end.src = base + (o.last || theme.art.open || o.first); end.alt = "";
    const still = el("img", "op-still", box);
    still.crossOrigin = "anonymous"; still.src = base + (o.first || theme.art.closed); still.alt = "";
    const btn = el("button", "op-tap", box);
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    Object.assign(btn.style, { left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` });
    box.style.cursor = "pointer";
    box.addEventListener("click", () => onOpen(), { once: true });
    return {
      box,
      focus: focusOf(o, [x0 - 0.04, y0 - 0.04, x1 + 0.04, y1 + 0.04]),
      closed: ready(still),
      async play() {
        btn.remove();
        const from = o.from || 0, rate = o.rate || 1;
        try { v.currentTime = from; } catch {}
        v.playbackRate = rate;
        // The first frame stays on top until the film is really running, so a slow phone never
        // shows an empty box; one that can't play it (low-power mode) fades to the last frame.
        const running = await Promise.race([v.play().then(() => true, () => false), wait(2500).then(() => false)]);
        if (!running) { end.classList.add("on"); still.classList.add("gone"); await wait(900); return; }
        still.classList.add("gone");
        await new Promise((done) => {
          let over = false;
          const stop = () => { if (over) return; over = true; v.pause(); end.classList.add("on"); done(); };
          const to = o.to || 0;
          const tick = () => { if (over) return; if (v.ended || (to && v.currentTime >= to)) stop(); else requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
          v.addEventListener("ended", stop, { once: true });
          setTimeout(stop, (((to || v.duration || 8) - from) / rate) * 1000 + 2500);
        });
        await wait(o.hold ?? 300);
      },
    };
  }

  // The seal's press is also how the invite editor shows each seal option in the design's wax.
  window.SaathOpenings = { envelope, doors, curtains, reveal, lotus: reveal, lamp: reveal, chandelier: reveal, film, pressSeal, sealDie };
})();
