/* @ds-bundle: {"format":4,"namespace":"Taal","components":[{"name":"Button"},{"name":"FamilyChip"},{"name":"StatusPill"},{"name":"Dropzone"},{"name":"Field"},{"name":"Transport"},{"name":"Waveform"},{"name":"Stages"},{"name":"InstrumentString"},{"name":"TaalRing"},{"name":"MetricTile"},{"name":"StringField"}]} */
/* Taal v2: vanilla DOM components for the instrument detection console.
   Uses Motion (window.Motion, motion@11.11.17) for springs, scroll-linked and in-view motion when it is loaded,
   and falls back to the Web Animations API when it is not. No network except the two calls in Taal.api. */
(function () {
  "use strict";

  // ------------------------------------------------------------------ motion layer
  var EASE = { out: [0.16, 1, 0.3, 1], inOut: [0.65, 0, 0.35, 1], linear: "linear" };
  var SPRING = {
    snappy: { type: "spring", stiffness: 520, damping: 34, mass: 1 },
    soft: { type: "spring", stiffness: 170, damping: 22, mass: 1 },
    bouncy: { type: "spring", stiffness: 380, damping: 15, mass: 1 },
    gentle: { type: "spring", stiffness: 110, damping: 20, mass: 1 }
  };
  function MO() { return window.Motion && window.Motion.animate ? window.Motion : null; }
  function reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function bez(e) { return Array.isArray(e) ? "cubic-bezier(" + e.join(",") + ")" : (e || "linear"); }
  var TRANSFORMS = { x: "translateX", y: "translateY", scale: "scale", scaleX: "scaleX", scaleY: "scaleY", rotate: "rotate" };
  function unit(k, v) { return typeof v === "number" ? (k === "x" || k === "y" ? v + "px" : k === "rotate" ? v + "deg" : v) : v; }
  // frames: Motion-style {prop: [from, to] | value}; opts: seconds, Motion ease arrays or a SPRING preset
  function framesToWaapi(frames) {
    var n = 1, keys = Object.keys(frames);
    keys.forEach(function (k) { if (Array.isArray(frames[k])) n = Math.max(n, frames[k].length); });
    var out = [];
    for (var i = 0; i < n; i++) {
      var f = {}, tf = [];
      keys.forEach(function (k) {
        var arr = Array.isArray(frames[k]) ? frames[k] : [frames[k]], v = arr[Math.min(i, arr.length - 1)];
        if (TRANSFORMS[k]) tf.push(TRANSFORMS[k] + "(" + unit(k, v) + ")"); else f[k] = v;
      });
      if (tf.length) f.transform = tf.join(" ");
      out.push(f);
    }
    return out.length === 1 ? [out[0], out[0]] : out;
  }
  function settle(el, frames) {
    var last = framesToWaapi(frames).pop();
    Object.keys(last).forEach(function (k) { el.style[k] = last[k]; });
  }
  function animate(el, frames, opts) {
    if (!el) return null;
    opts = opts || {};
    if (reduced()) { settle(el, frames); return null; }
    var M = MO();
    // safety settle: if frames stall (hidden tab, thumbnail capture) the element still reaches its resting state
    var due = ((opts.delay || 0) + (opts.type === "spring" ? 1.2 : (opts.duration == null ? 0.42 : opts.duration))) * 1000 + 1200;
    if (M) {
      var c = M.animate(el, frames, opts);
      setTimeout(function () { try { if (c && c.complete) c.complete(); } catch (e) {} }, due);
      return c;
    }
    if (!el.animate) { settle(el, frames); return null; }
    var spring = opts.type === "spring";
    return el.animate(framesToWaapi(frames), {
      duration: (spring ? 0.7 : (opts.duration == null ? 0.42 : opts.duration)) * 1000,
      delay: (opts.delay || 0) * 1000, easing: bez(spring ? EASE.out : opts.ease || EASE.out), fill: "both"
    });
  }
  // one shared rAF loop; callbacks return true while they still need frames
  var loopFns = new Set(), looping = false;
  function frame(now) {
    loopFns.forEach(function (fn) { if (fn(now) === false) loopFns.delete(fn); });
    if (loopFns.size) requestAnimationFrame(frame); else looping = false;
  }
  function onFrame(fn) {
    loopFns.add(fn);
    if (!looping) { looping = true; requestAnimationFrame(frame); }
    return function () { loopFns.delete(fn); };
  }
  function tween(seconds, onUpdate, opts) {
    opts = opts || {};
    if (reduced()) { onUpdate(1); if (opts.done) opts.done(); return; }
    var M = MO(), finished = false;
    function finish() { if (finished) return; finished = true; onUpdate(1); if (opts.done) opts.done(); }
    setTimeout(finish, ((opts.delay || 0) + seconds) * 1000 + 1200);
    if (M) {
      var c = M.animate(0, 1, { duration: seconds, delay: opts.delay || 0, ease: opts.ease || EASE.out, onUpdate: function (v) { if (!finished) onUpdate(v); } });
      c.then(finish);
      return c;
    }
    var start = null, d = (opts.delay || 0) * 1000;
    onFrame(function (now) {
      if (start === null) start = now + d;
      if (now < start) return true;
      if (finished) return false;
      var t = clamp((now - start) / (seconds * 1000), 0, 1), e = 1 - Math.pow(1 - t, 4);
      onUpdate(e);
      if (t >= 1) { finish(); return false; }
      return !finished;
    });
  }
  function ticker(el, to, opts) {
    opts = opts || {};
    var dec = opts.decimals == null ? 2 : opts.decimals, suffix = opts.suffix ? "<small>" + opts.suffix + "</small>" : "";
    var from = opts.from || 0;
    var M = MO(), id = (el._tick = (el._tick || 0) + 1);
    setTimeout(function () { if (el._tick === id) el.innerHTML = to.toFixed(dec) + suffix; }, ((opts.delay || 0) + 2.4) * 1000);
    if (M && !reduced()) {
      return M.animate(from, to, Object.assign({}, SPRING.gentle, { delay: opts.delay || 0, onUpdate: function (v) { if (el._tick === id) el.innerHTML = v.toFixed(dec) + suffix; } }));
    }
    return tween(opts.duration || 1.2, function (t) { el.innerHTML = (from + (to - from) * t).toFixed(dec) + suffix; }, { delay: opts.delay });
  }
  // split words (keeps <em>, <br>) so each can rise out of a clipping mask
  function splitWords(el) {
    if (el.dataset.split) return Array.prototype.slice.call(el.querySelectorAll(".t-split-word > span"));
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var mask = document.createElement("span"); mask.className = "t-split-word";
            var inner = document.createElement("span"); inner.textContent = p;
            mask.appendChild(inner); frag.appendChild(mask); out.push(inner);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") walk(child);
      });
    })(el);
    el.dataset.split = "1";
    return out;
  }
  function revealText(el, opts) {
    opts = opts || {};
    var words = splitWords(el);
    words.forEach(function (w, i) {
      animate(w, { y: ["105%", "0%"], rotate: [6, 0] }, Object.assign({}, SPRING.soft, { delay: (opts.delay || 0) + i * (opts.stagger || 0.06) }));
    });
    return words;
  }
  // decode effect for mono labels: glyphs settle left to right
  var GLYPHS = "01ABCDEF#%/<>-_=+";
  function scramble(el, text, opts) {
    opts = opts || {};
    var final = text == null ? el.textContent : text;
    if (reduced()) { el.textContent = final; return; }
    var dur = opts.duration || 0.7, start = null, delay = (opts.delay || 0) * 1000, id = (el._scr = (el._scr || 0) + 1);
    setTimeout(function () { if (el._scr === id) { el._scr++; el.textContent = final; } }, delay + dur * 1000 + 800);
    onFrame(function (now) {
      if (el._scr !== id) return false;
      if (start === null) start = now + delay;
      if (now < start) return true;
      var t = clamp((now - start) / (dur * 1000), 0, 1), fixed = Math.floor(t * final.length), s = "";
      for (var i = 0; i < final.length; i++) {
        var ch = final[i];
        s += i < fixed || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = s;
      return t < 1;
    });
  }
  function inView(el, cb, opts) {
    opts = opts || {};
    var M = MO();
    if (M && M.inView) return M.inView(el, function () { cb(el); }, { amount: opts.amount || 0.3 });
    if (!("IntersectionObserver" in window)) { cb(el); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { cb(e.target); io.unobserve(e.target); } }); }, { threshold: opts.amount || 0.3 });
    io.observe(el);
  }
  // scroll-linked: progress (0..1 of the page or a target's travel) drives an animation
  function scrollLinked(el, frames, opts) {
    opts = opts || {};
    if (reduced()) return;
    var M = MO();
    if (M && M.scroll) {
      var a = M.animate(el, frames, { ease: "linear" });
      return M.scroll(a, opts.target ? { target: opts.target, offset: opts.offset || ["start start", "end start"] } : {});
    }
    function update() {
      var p;
      if (opts.target) {
        var r = opts.target.getBoundingClientRect();
        p = clamp(-r.top / Math.max(1, r.height), 0, 1);
      } else {
        var h = document.documentElement.scrollHeight - innerHeight; p = h > 0 ? scrollY / h : 0;
      }
      var wf = framesToWaapi(frames), a0 = wf[0], a1 = wf[wf.length - 1];
      el.style.opacity = a0.opacity != null ? lerp(+a0.opacity, +a1.opacity, p) : "";
      var tf = [];
      Object.keys(frames).forEach(function (k) {
        if (!TRANSFORMS[k]) return;
        var arr = frames[k], v0 = parseFloat(arr[0]), v1 = parseFloat(arr[arr.length - 1]);
        tf.push(TRANSFORMS[k] + "(" + unit(k, lerp(v0, v1, p)) + ")");
      });
      el.style.transform = tf.join(" ");
    }
    addEventListener("scroll", update, { passive: true }); update();
  }
  function magnetic(el, strength) {
    var s = strength == null ? 0.25 : strength;
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty("--mx", x + "px"); el.style.setProperty("--my", y + "px");
      if (reduced() || !MO()) return;
      MO().animate(el, { x: (x / r.width - 0.5) * r.width * s * 0.2, y: (y / r.height - 0.5) * r.height * s * 0.35 }, SPRING.snappy);
    });
    el.addEventListener("pointerleave", function () { if (MO() && !reduced()) MO().animate(el, { x: 0, y: 0 }, SPRING.bouncy); });
    el.addEventListener("pointerdown", function () { animate(el, { scale: [1, 0.96, 1] }, { duration: 0.25 }); });
  }

  // ------------------------------------------------------------------ theme-aware colours
  var cssCache = {};
  function css(name) {
    if (cssCache[name] == null) cssCache[name] = getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim() || "#888";
    return cssCache[name];
  }
  var themeListeners = new Set();
  function onTheme(fn) { themeListeners.add(fn); return function () { themeListeners.delete(fn); }; }
  function themeChanged() { cssCache = {}; themeListeners.forEach(function (fn) { fn(); }); }
  if (typeof MutationObserver !== "undefined") new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  if (window.matchMedia) { var mq = window.matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", themeChanged); }

  // ------------------------------------------------------------------ domain: the classifier's matrix, in validated slot order
  var FAMILIES = [
    { id: "western", label: "Western", token: "fam-western", members: ["Piano", "Drums", "Flute", "Acoustic guitar", "Bass guitar", "Strings section"] },
    { id: "indian-strings", label: "Indian strings", token: "fam-indian-strings", members: ["Sitar", "Sarod", "Sarangi", "Veena", "Santoor", "Mandolin", "Tanpura"] },
    { id: "indian-wind", label: "Indian wind & keys", token: "fam-indian-wind", members: ["Harmonium", "Bansuri", "Shehnai"] },
    { id: "indian-percussion", label: "Indian percussion", token: "fam-indian-percussion", members: ["Tabla", "Dholak", "Mridangam", "Ghatam", "Duff or khanjari"] },
    { id: "electronic", label: "Electronic", token: "fam-electronic", members: ["Electric guitar", "Electronic kick", "Synthesizer", "808 Bass", "Electric piano", "Drum machine"] },
    { id: "brass", label: "Brass & woodwind", token: "fam-brass", members: ["Trumpet", "Saxophone", "Trombone"] },
    { id: "modern-strings", label: "Modern strings", token: "fam-modern-strings", members: ["Violin", "Cello"] }
  ];
  function familyOf(name) {
    var n = String(name || "").toLowerCase();
    for (var i = 0; i < FAMILIES.length; i++) for (var j = 0; j < FAMILIES[i].members.length; j++) if (FAMILIES[i].members[j].toLowerCase() === n) return FAMILIES[i];
    return { id: "unknown", label: "Unmapped", token: "ink-muted", members: [] };
  }
  function parseTimestamp(t) {
    var m = String(t || "").match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
    return m ? { start: +m[1] * 60 + +m[2], end: +m[3] * 60 + +m[4] } : null;
  }
  function confidenceOf(item) {
    var raw = Number(item && item.confidence);
    if (isFinite(raw)) return { raw: raw, pct: clamp(raw * 100, 0, 100) };
    var pct = Number(String((item && item.confidence_percentage) || "").replace("%", ""));
    return isFinite(pct) ? { raw: pct / 100, pct: clamp(pct, 0, 100) } : { raw: 0, pct: 0 };
  }
  function fmtTime(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ------------------------------------------------------------------ sound: Karplus-Strong pluck, off by default
  var YAMAN = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16];
  var sound = { enabled: false, ctx: null };
  function audioCtx() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    if (!sound.ctx) sound.ctx = new AC();
    if (sound.ctx.state === "suspended") sound.ctx.resume();
    return sound.ctx;
  }
  function pluckSound(degree, gain) {
    if (!sound.enabled) return;
    try {
      var ctx = audioCtx(); if (!ctx) return;
      var semis = YAMAN[((degree % YAMAN.length) + YAMAN.length) % YAMAN.length];
      var f = 146.83 * Math.pow(2, semis / 12), sr = ctx.sampleRate, n = Math.round(sr / f);
      var len = Math.floor(sr * 1.8), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      for (var k = n; k < len; k++) d[k] = 0.996 * 0.5 * (d[k - n] + d[k - n + 1]);
      var src = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = 0.16 * (gain == null ? 1 : gain);
      src.buffer = buf; src.connect(g); g.connect(ctx.destination); src.start();
    } catch (e) { /* sound is decoration only */ }
  }

  // ------------------------------------------------------------------ string physics: modal superposition of triangular plucks
  var MODES = 7;
  function StringModel(opts) { this.events = []; this.omega = (opts && opts.omega) || 2 * Math.PI * 2.4; this.damp = (opts && opts.damp) || 1.9; }
  StringModel.prototype.pluck = function (p, amp, now) {
    p = clamp(p, 0.04, 0.96);
    var a = [];
    for (var k = 1; k <= MODES; k++) a.push(amp * 2 * Math.sin(k * Math.PI * p) / (k * k * Math.PI * Math.PI * p * (1 - p)));
    this.events.push({ t0: now, a: a });
    if (this.events.length > 6) this.events.shift();
  };
  StringModel.prototype.y = function (x, now) {
    var y = 0;
    for (var e = 0; e < this.events.length; e++) {
      var ev = this.events[e], t = (now - ev.t0) / 1000;
      for (var k = 1; k <= MODES; k++) y += ev.a[k - 1] * Math.sin(k * Math.PI * x) * Math.cos(k * this.omega * t) * Math.exp(-(this.damp + 0.6 * k) * t);
    }
    return y;
  };
  StringModel.prototype.alive = function (now) {
    var self = this;
    this.events = this.events.filter(function (ev) { return (now - ev.t0) / 1000 < 4.5 / (self.damp + 0.6); });
    return this.events.length > 0;
  };
  function setupCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth || 300, h = canvas.clientHeight || 100;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function observeSize(el, fn) { if ("ResizeObserver" in window) new ResizeObserver(fn).observe(el); else addEventListener("resize", fn); }

  // ------------------------------------------------------------------ Player: real Web Audio analysis, or a silent simulation
  var BAND_EDGES = [40, 120, 300, 700, 1500, 3200, 6500, 14000];
  function Player(opts) {
    opts = opts || {};
    var self = this, listeners = new Set(), audio = null, url = null, analyser = null, data = null, wired = false;
    this.simulated = !opts.file;
    this.duration = opts.duration || 150;
    this.time = 0; this.playing = false;
    this.bands = new Float32Array(7); this.level = 0;
    var samples = opts.samples || null, simStart = 0, simFrom = 0;
    if (opts.file) {
      url = URL.createObjectURL(opts.file);
      audio = new Audio(url); audio.preload = "auto"; audio.crossOrigin = "anonymous";
      audio.addEventListener("loadedmetadata", function () { if (isFinite(audio.duration)) self.duration = audio.duration; });
      audio.addEventListener("ended", function () { self.pause(); self.seek(0); });
    }
    function wire() {
      if (wired || !audio) return;
      var ctx = audioCtx(); if (!ctx) return;
      var src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.72;
      src.connect(analyser); analyser.connect(ctx.destination);
      data = new Uint8Array(analyser.frequencyBinCount); wired = true;
    }
    function measure(now) {
      if (audio && analyser) {
        analyser.getByteFrequencyData(data);
        var hz = (sound.ctx.sampleRate / 2) / data.length, total = 0;
        for (var b = 0; b < 7; b++) {
          var i0 = Math.max(1, Math.floor(BAND_EDGES[b] / hz)), i1 = Math.max(i0 + 1, Math.floor(BAND_EDGES[b + 1] / hz)), s = 0;
          for (var i = i0; i < i1 && i < data.length; i++) s += data[i];
          var v = s / ((i1 - i0) * 255);
          self.bands[b] = v; total += v;
        }
        self.level = total / 7;
      } else {
        // simulation: envelope from the waveform peaks, with a beat on each band
        var pos = samples ? samples[Math.min(samples.length - 1, Math.floor(self.time / self.duration * samples.length))] : 0.5;
        var tot = 0;
        for (var k = 0; k < 7; k++) {
          var beat = Math.pow(Math.max(0, Math.sin(self.time * Math.PI * (1.2 + k * 0.37) + k)), 6);
          var v2 = clamp(pos * (0.35 + 0.65 * beat) * (1 - k * 0.06), 0, 1);
          self.bands[k] = v2; tot += v2;
        }
        self.level = tot / 7;
      }
    }
    var stop = null;
    function loop(now) {
      if (!self.playing) return false;
      if (audio) self.time = audio.currentTime;
      else {
        self.time = simFrom + (now - simStart) / 1000;
        if (self.time >= self.duration) { self.time = self.duration; emit(); self.pause(); self.seek(0); return false; }
      }
      measure(now); emit(); return true;
    }
    function emit() { listeners.forEach(function (fn) { fn(self.time, self.bands, self.level); }); }
    this.on = function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; };
    this.play = function () {
      if (self.playing) return Promise.resolve();
      self.playing = true;
      if (audio) {
        wire();
        return audio.play().then(function () { stop = onFrame(loop); }, function (e) { self.playing = false; throw e; });
      }
      simStart = performance.now(); simFrom = self.time; stop = onFrame(loop);
      return Promise.resolve();
    };
    this.pause = function () {
      self.playing = false; if (audio) audio.pause();
      for (var b = 0; b < 7; b++) self.bands[b] = 0; self.level = 0; emit();
    };
    this.toggle = function () { return self.playing ? (self.pause(), Promise.resolve()) : self.play(); };
    this.seek = function (t) {
      self.time = clamp(t, 0, self.duration);
      if (audio) audio.currentTime = self.time; else { simFrom = self.time; simStart = performance.now(); }
      emit();
    };
    this.destroy = function () { self.pause(); listeners.clear(); if (url) URL.revokeObjectURL(url); };
  }

  // ------------------------------------------------------------------ StringField: the hero instrument
  function StringField(root, props) {
    props = props || {};
    root.classList.add("t-field-strings");
    var canvas = document.createElement("canvas"); root.appendChild(canvas);
    var fams = props.families || FAMILIES;
    var strings = fams.map(function (f, i) { return { fam: f, model: new StringModel({ omega: 2 * Math.PI * (1.8 + i * 0.22) }), y: 0, x0: 0, x1: 0, level: 0, avg: 0, last: 0 }; });
    var g = null, last = null, running = false, visible = true, idleTimer = null, driven = 0;
    function layout() {
      g = setupCanvas(canvas);
      var top = g.h * 0.1, bottom = g.h * 0.9;
      strings.forEach(function (s, i) { s.y = lerp(top, bottom, strings.length === 1 ? 0.5 : i / (strings.length - 1)); s.x0 = g.w * (props.inset == null ? 0.03 : props.inset); s.x1 = g.w - s.x0; });
      draw(performance.now());
    }
    function draw(now) {
      if (!g) return false;
      var ctx = g.ctx, any = false;
      ctx.clearRect(0, 0, g.w, g.h);
      strings.forEach(function (s, i) {
        var color = css(s.fam.token), alive = s.model.alive(now); any = any || alive || s.level > 0.01;
        var thick = 1 + (i / Math.max(1, strings.length - 1)) * 1.4 + s.level * 2.5;
        if (s.level > 0.02) { // energy band behind the string while audio plays
          ctx.globalAlpha = Math.min(0.28, s.level * 0.5); ctx.fillStyle = color;
          ctx.fillRect(s.x0, s.y - 10 * s.level - 1, (s.x1 - s.x0) * Math.min(1, s.level * 1.6), 20 * s.level + 2);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = color; ctx.lineWidth = thick; ctx.lineCap = "round"; ctx.beginPath();
        for (var k = 0; k <= 96; k++) {
          var t = k / 96, x = lerp(s.x0, s.x1, t), y = s.y + (alive ? s.model.y(t, now) : 0);
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(s.x0 - 3, s.y - 6, 4, 12); ctx.fillRect(s.x1 - 1, s.y - 6, 4, 12);
        if (props.labels !== false) {
          ctx.fillStyle = css("ink-muted"); ctx.font = "500 10px " + css("font-mono"); ctx.textAlign = "right";
          ctx.fillText(s.fam.label.toUpperCase() + (s.level > 0.02 ? "  " + Math.round(s.level * 100) : ""), s.x1 - 12, s.y - 9);
        }
        s.level *= 0.9;
      });
      return any;
    }
    function kick() { if (running) return; running = true; onFrame(function (now) { var a = draw(now); if (!a) running = false; return a; }); }
    function pluck(i, p, amp) {
      var s = strings[i]; if (!s || reduced()) return;
      s.model.pluck(p, amp, performance.now()); kick();
      pluckSound(strings.length - 1 - i, Math.min(1, Math.abs(amp) / 18));
    }
    // audio drive: onsets in each band pluck its string; energy lights it
    function drive(bands) {
      var now = performance.now(); driven = now;
      strings.forEach(function (s, i) {
        var v = bands[i] || 0;
        s.level = Math.max(s.level, v);
        if (v > s.avg * 1.3 + 0.04 && v > 0.12 && now - s.last > 140) { s.last = now; if (!reduced()) s.model.pluck(0.25 + Math.random() * 0.5, (6 + v * 22) * (Math.random() > 0.5 ? 1 : -1), now); }
        s.avg = s.avg * 0.92 + v * 0.08;
      });
      kick();
    }
    function move(e) {
      var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (last) strings.forEach(function (s, i) {
        if ((last.y - s.y) * (y - s.y) < 0 && x > s.x0 && x < s.x1) {
          var dy = y - last.y; pluck(i, (x - s.x0) / (s.x1 - s.x0), clamp(Math.abs(dy), 4, 40) * (dy > 0 ? 1 : -1) * 0.55);
        }
      });
      last = { x: x, y: y };
    }
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", function () { last = null; });
    root.addEventListener("pointerdown", function (e) {
      var r = canvas.getBoundingClientRect(), y = e.clientY - r.top, x = e.clientX - r.left, best = -1, bd = 1e9;
      strings.forEach(function (s, i) { var d = Math.abs(s.y - y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && bd < 40) pluck(best, (x - strings[best].x0) / (strings[best].x1 - strings[best].x0), 16);
    });
    observeSize(root, layout);
    onTheme(function () { draw(performance.now()); });
    function breathe() {
      if (props.idle !== false && visible && !document.hidden && !reduced() && performance.now() - driven > 2000) pluck(Math.floor(Math.random() * strings.length), 0.2 + Math.random() * 0.6, 3 + Math.random() * 4);
      idleTimer = setTimeout(breathe, 2600 + Math.random() * 2600);
    }
    layout();
    if (props.intro !== false && !reduced()) strings.forEach(function (s, i) { setTimeout(function () { pluck(i, 0.5 + (i % 2 ? 0.2 : -0.2), 14); }, 350 + i * 90); });
    if (props.idle !== false) idleTimer = setTimeout(breathe, 3400);
    return { pluck: pluck, drive: drive, strings: strings, destroy: function () { clearTimeout(idleTimer); } };
  }

  // ------------------------------------------------------------------ InstrumentString: one detected instrument
  function InstrumentString(root, props) {
    var item = props.item || {}, name = item.instrument || item.original_prediction || "Unknown";
    var fam = familyOf(name), score = confidenceOf(item), ts = parseTimestamp(item.timestamp);
    var duration = Math.max(props.duration || (ts ? ts.end : 10), ts ? ts.end : 10), maxPct = props.maxPct || score.pct || 1;
    var win = ts ? Math.floor(ts.start / 10) + 1 : null;
    root.className = "t-string"; root.tabIndex = 0; root.setAttribute("role", "button");
    root.setAttribute("aria-label", name + ", " + score.pct.toFixed(2) + " percent, peak " + (item.timestamp || "unknown") + ". Press to pluck.");
    root.style.setProperty("--fam", "var(--" + fam.token + ")");
    root.innerHTML =
      '<div class="t-string-name"><span class="t-label">' + String((props.index || 0) + 1).padStart(2, "0") + (win ? " · W" + String(win).padStart(2, "0") : "") + '</span><strong>' + esc(name) + '</strong>' +
      '<span class="t-chip"><i></i>' + esc(fam.label) + '</span></div>' +
      '<div class="t-string-canvas"><canvas></canvas></div>' +
      '<div class="t-string-score"><b>0.00<small>%</small></b><span>' + esc(item.timestamp || "no peak window") + ' · ' + score.raw.toFixed(4) + '</span></div>';
    var canvas = root.querySelector("canvas"), scoreEl = root.querySelector(".t-string-score b");
    var model = new StringModel({ omega: 2 * Math.PI * (2.2 + (props.index || 0) * 0.3), damp: 1.6 }), g = null, drawn = 0, running = false, live = false, head = null;
    var fret = ts ? clamp(((ts.start + ts.end) / 2) / duration, 0.04, 0.96) : 0.5, amp = 6 + 14 * (score.pct / maxPct);
    function draw(now) {
      if (!g) return false;
      var ctx = g.ctx, color = css(fam.token), mid = g.h / 2, x0 = 6, x1 = g.w - 6, alive = model.alive(now);
      ctx.clearRect(0, 0, g.w, g.h);
      var windows = Math.max(1, Math.ceil(duration / 10));
      ctx.fillStyle = css("line-strong");
      for (var w = 0; w <= windows; w++) { var tx = lerp(x0, x1, w / windows); ctx.fillRect(Math.round(tx), mid - (w === 0 ? 10 : 4), w === 0 ? 2 : 1, w === 0 ? 20 : 8); }
      if (ts) {
        ctx.globalAlpha = live ? 0.32 : 0.16; ctx.fillStyle = color;
        var bx0 = lerp(x0, x1, ts.start / duration), bx1 = lerp(x0, x1, Math.min(1, ts.end / duration));
        ctx.fillRect(bx0, 4, Math.max(3, bx1 - bx0), g.h - 8); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = color; ctx.lineWidth = live ? 3 : 2; ctx.lineCap = "round"; ctx.beginPath();
      var end = lerp(x0, x1, drawn);
      for (var k = 0; k <= 120; k++) {
        var t = k / 120, x = lerp(x0, x1, t); if (x > end) break;
        var y = mid + (alive ? model.y(t, now) : 0);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (drawn >= 1) {
        var fx = lerp(x0, x1, fret), fy = mid + (alive ? model.y(fret, now) : 0);
        ctx.fillStyle = color; ctx.fillRect(fx - 5, fy - 5, 10, 10);
        ctx.strokeStyle = css("surface"); ctx.lineWidth = 2; ctx.strokeRect(fx - 5, fy - 5, 10, 10);
      }
      if (head != null) { ctx.fillStyle = css("volt-ink"); ctx.fillRect(lerp(x0, x1, head) - 1, 2, 2, g.h - 4); }
      return alive;
    }
    function kick() { if (running) return; running = true; onFrame(function (now) { var a = draw(now); if (!a) running = false; return a; }); }
    function pluck(strength) {
      if (reduced()) return;
      model.pluck(fret, amp * (strength == null ? 1 : strength) * (Math.random() > 0.5 ? 1 : -1), performance.now()); kick();
      pluckSound(props.index || 0, 0.8);
    }
    function layout() { g = setupCanvas(canvas); draw(performance.now()); }
    root.addEventListener("pointerenter", function () { pluck(0.55); });
    root.addEventListener("click", function () { pluck(1); });
    root.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pluck(1); } });
    observeSize(canvas.parentNode, layout);
    onTheme(function () { draw(performance.now()); });
    layout();
    var delay = props.delay || 0;
    animate(root, { opacity: [0, 1], y: [24, 0] }, Object.assign({}, SPRING.soft, { delay: delay }));
    tween(0.9, function (t) { drawn = t; draw(performance.now()); }, { delay: delay + 0.12, ease: EASE.inOut, done: function () { drawn = 1; pluck(1); } });
    ticker(scoreEl, score.pct, { decimals: 2, suffix: "%", delay: delay + 0.12 });
    return {
      el: root, family: fam, pluck: pluck,
      // playback hook: the playhead position (0..1 of the song) and whether it sits in this peak window
      setTime: function (t) {
        head = t == null ? null : clamp(t / duration, 0, 1);
        var now = !!(ts && t != null && t >= ts.start && t < ts.end);
        if (now !== live) { live = now; root.classList.toggle("is-live", live); if (live) pluck(1); }
        draw(performance.now());
      }
    };
  }

  // ------------------------------------------------------------------ TaalRing: the song as one rhythm cycle
  var SVGNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) { var el = document.createElementNS(SVGNS, tag); for (var k in attrs) el.setAttribute(k, attrs[k]); if (parent) parent.appendChild(el); return el; }
  function polar(r, a) { return [200 + r * Math.sin(a), 200 - r * Math.cos(a)]; }
  function arcPath(r, a0, a1) {
    var p0 = polar(r, a0), p1 = polar(r, a1), large = a1 - a0 > Math.PI ? 1 : 0;
    return "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + " A" + r + " " + r + " 0 " + large + " 1 " + p1[0].toFixed(2) + " " + p1[1].toFixed(2);
  }
  function TaalRing(root, props) {
    props = props || {};
    var results = props.results || [], maxEnd = 0;
    results.forEach(function (r) { var t = parseTimestamp(r.timestamp); if (t) maxEnd = Math.max(maxEnd, t.end); });
    var duration = Math.max(props.duration || 0, maxEnd, 60), windows = Math.ceil(duration / 10), TAU = Math.PI * 2;
    root.className = "t-ring"; root.innerHTML = "";
    var s = svg("svg", { viewBox: "0 0 400 400", role: "img", "aria-label": "Taal ring: " + results.length + " instruments placed at their peak 10-second window across " + fmtTime(duration) }, root);
    var center = document.createElement("div"); center.className = "t-ring-center"; root.appendChild(center);
    function centerDefault() { center.innerHTML = '<b>' + results.length + '</b><span class="t-label">instruments</span>'; }
    centerDefault();
    var outer = 188;
    for (var w = 0; w < windows; w++) {
      var a = (w / windows) * TAU, p0 = polar(outer - (w === 0 ? 12 : 6), a), p1 = polar(outer + 2, a);
      var tk = svg("line", { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], "class": "tick" + (w === 0 ? " sam" : "") }, s);
      animate(tk, { opacity: [0, 1] }, { duration: 0.3, delay: w * (0.6 / windows) });
      var every = windows <= 16 ? 1 : windows <= 32 ? 2 : 4;
      if (w % every === 0) { var lp = polar(outer + 14, a + TAU / windows / 2), tx = svg("text", { x: lp[0], y: lp[1] + 3, "text-anchor": "middle" }, s); tx.textContent = w === 0 ? "X" : String(w + 1); }
    }
    var n = results.length, inner = 74, step = n ? Math.min(14, (outer - 22 - inner) / n) : 14, hits = [];
    results.forEach(function (r, i) {
      var t = parseTimestamp(r.timestamp), fam = familyOf(r.instrument || r.original_prediction), rad = outer - 22 - i * step;
      var lane = svg("circle", { cx: 200, cy: 200, r: rad, "class": "lane", "stroke-width": Math.max(2, step * 0.45), pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, s);
      animate(lane, { strokeDashoffset: [1, 0] }, { duration: 1.4, delay: 0.2 + i * 0.09, ease: EASE.inOut });
      if (!t) return;
      var a0 = (t.start / duration) * TAU, a1 = Math.max(a0 + 0.05, (t.end / duration) * TAU), sw = Math.max(3, step * 0.7);
      var hit = svg("path", { d: arcPath(rad, a0, a1), "class": "hit", stroke: "var(--" + fam.token + ")", "stroke-width": sw, pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, s);
      animate(hit, { strokeDashoffset: [1, 0] }, Object.assign({}, SPRING.soft, { delay: 0.9 + i * 0.11 }));
      svg("title", {}, hit).textContent = (r.instrument || "") + " · " + (r.timestamp || "");
      hit.addEventListener("pointerenter", function () { center.innerHTML = '<b class="is-word">' + esc(r.instrument || "") + '</b><span class="t-label">' + esc(r.timestamp || "") + '</span>'; });
      hit.addEventListener("pointerleave", centerDefault);
      hits.push({ el: hit, a0: a0, a1: a1, w: sw, on: false });
    });
    var hand = svg("line", { x1: 200, y1: 200, x2: 200, y2: 200 - outer, "class": "hand" }, s);
    var dot = svg("circle", { cx: 200, cy: 200 - outer, r: 4, "class": "hand-dot" }, s);
    var period = props.period || 9000, startT = null, stopped = false, external = null, externalAt = 0;
    function place(ang) {
      var deg = (ang * 180 / Math.PI).toFixed(2);
      hand.setAttribute("transform", "rotate(" + deg + " 200 200)"); dot.setAttribute("transform", "rotate(" + deg + " 200 200)");
      hits.forEach(function (h) {
        var on = ang >= h.a0 && ang <= h.a1;
        if (on !== h.on) { h.on = on; h.el.style.transition = "stroke-width 300ms cubic-bezier(.34,1.56,.64,1)"; h.el.setAttribute("stroke-width", on ? h.w * 1.9 : h.w); }
      });
    }
    place(0);
    if (!reduced()) onFrame(function (now) {
      if (stopped || !root.isConnected) return false;
      if (external != null && now - externalAt < 600) { place(external); return true; }
      if (startT === null) startT = now + 1400;
      if (now < startT) return true;
      place((((now - startT) % period) / period) * TAU);
      return true;
    });
    return {
      destroy: function () { stopped = true; },
      setTime: function (t) { external = (clamp(t, 0, duration) / duration) * TAU; externalAt = performance.now(); if (reduced()) place(external); }
    };
  }

  // ------------------------------------------------------------------ Waveform: peaks over a 10-second window ruler
  function decodePeaks(file, count) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return Promise.reject(new Error("Web Audio unavailable"));
    var ctx = new AC();
    return file.arrayBuffer().then(function (ab) { return ctx.decodeAudioData(ab); }).then(function (buf) {
      var data = buf.getChannelData(0), n = count || 480, size = Math.max(1, Math.floor(data.length / n)), out = [];
      for (var i = 0; i < n; i++) {
        var max = 0, s0 = i * size, s1 = Math.min(data.length, s0 + size), st = Math.max(1, Math.floor(size / 32));
        for (var j = s0; j < s1; j += st) max = Math.max(max, Math.abs(data[j]));
        out.push(Math.min(1, max));
      }
      if (ctx.close) ctx.close();
      return { samples: out, duration: buf.duration };
    });
  }
  function synthPeaks(count, seed) {
    var out = [], s = seed || 7;
    for (var i = 0; i < count; i++) {
      s = (s * 9301 + 49297) % 233280;
      var env = 0.45 + 0.35 * Math.sin(i / count * Math.PI * 3.2) + 0.2 * Math.sin(i / 7);
      out.push(clamp(env * (0.35 + 0.65 * (s / 233280)), 0.04, 1));
    }
    return out;
  }
  function Waveform(root, props) {
    props = props || {};
    root.classList.add("t-wave");
    root.innerHTML = '<div class="t-wave-plot"><canvas></canvas><div class="t-wave-cursor"><span></span></div><div class="t-wave-head" hidden></div></div><div class="t-wave-ruler"></div>';
    var plot = root.querySelector(".t-wave-plot"), canvas = root.querySelector("canvas"), ruler = root.querySelector(".t-wave-ruler");
    var cursor = root.querySelector(".t-wave-cursor"), tag = cursor.querySelector("span"), headEl = root.querySelector(".t-wave-head");
    var samples = props.samples || synthPeaks(360, 11), duration = props.duration || 150, peaks = [], progress = 0, g = null, time = null;
    function buildRuler() {
      var windows = Math.ceil(duration / 10), every = windows <= 12 ? 1 : windows <= 24 ? 2 : windows <= 48 ? 4 : 8, html = "";
      for (var w = 0; w < windows; w += every) html += '<span class="' + (w === 0 ? "is-sam" : "") + '" style="left:' + (w * 10 / duration * 100) + '%">' + (w === 0 ? "X" : fmtTime(w * 10)) + "</span>";
      ruler.innerHTML = html;
    }
    function draw() {
      if (!g) return;
      var ctx = g.ctx, mid = g.h / 2, n = samples.length, bw = g.w / n, windows = Math.ceil(duration / 10);
      ctx.clearRect(0, 0, g.w, g.h);
      ctx.fillStyle = css("well"); ctx.globalAlpha = 0.5;
      for (var w = 1; w < windows; w += 2) ctx.fillRect(w * 10 / duration * g.w, 0, 10 / duration * g.w, g.h);
      ctx.globalAlpha = 1;
      peaks.forEach(function (p) {
        var t = parseTimestamp(p.timestamp); if (!t) return;
        ctx.fillStyle = css(familyOf(p.instrument).token);
        ctx.fillRect(t.start / duration * g.w, 0, Math.max(2, (t.end - t.start) / duration * g.w), 3);
      });
      var played = time == null ? -1 : time / duration, muted = css("ink-muted"), hot = css("volt-ink");
      for (var i = 0; i < n; i++) {
        var local = clamp(progress * 1.25 - (i / n) * 0.25, 0, 1); local = 1 - Math.pow(1 - local, 3);
        var h = Math.max(1.5, samples[i] * (g.h - 16) * local);
        ctx.fillStyle = i / n < played ? hot : muted;
        ctx.fillRect(i * bw, mid - h / 2, Math.max(1, bw * 0.62), h);
      }
    }
    function layout() { g = setupCanvas(canvas); draw(); placeHead(); }
    function placeHead() { if (time == null || !g) { headEl.hidden = true; return; } headEl.hidden = false; headEl.style.transform = "translateX(" + (time / duration * g.w) + "px)"; }
    function play() { progress = 0; tween(1.4, function (t) { progress = t; draw(); }, { ease: EASE.inOut }); }
    plot.addEventListener("pointermove", function (e) {
      var r = plot.getBoundingClientRect(), x = clamp(e.clientX - r.left, 0, r.width), t = x / r.width * duration;
      cursor.style.transform = "translateX(" + x + "px)"; cursor.classList.toggle("is-flip", x > r.width - 140);
      tag.textContent = "W" + String(Math.floor(t / 10) + 1).padStart(2, "0") + " · " + fmtTime(t);
    });
    plot.addEventListener("click", function (e) { var r = plot.getBoundingClientRect(); if (props.onSeek) props.onSeek((e.clientX - r.left) / r.width * duration); });
    observeSize(root, layout);
    onTheme(draw);
    buildRuler(); layout(); play();
    return {
      set: function (next) { if (next.samples) samples = next.samples; if (next.duration) duration = next.duration; time = null; buildRuler(); placeHead(); play(); },
      setPeaks: function (list) { peaks = list || []; draw(); },
      setTime: function (t) { time = t; draw(); placeHead(); }
    };
  }

  // ------------------------------------------------------------------ Transport: play/pause, time and a seven-band meter
  var ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';
  function Transport(root, props) {
    props = props || {};
    root.classList.add("t-transport");
    root.innerHTML = '<button class="t-play" type="button" aria-label="Play">' + ICON_PLAY + '</button>' +
      '<span class="t-transport-time">0:00 / ' + fmtTime(props.duration || 0) + '</span>' +
      '<span class="t-meter" aria-hidden="true">' + FAMILIES.map(function (f) { return '<i style="--fam:var(--' + f.token + ')"></i>'; }).join("") + "</span>" +
      '<span class="t-label t-transport-note">' + esc(props.note || "") + "</span>";
    var btn = root.querySelector(".t-play"), timeEl = root.querySelector(".t-transport-time"), bars = root.querySelectorAll(".t-meter i"), note = root.querySelector(".t-transport-note");
    btn.addEventListener("click", function () { if (props.onToggle) props.onToggle(); });
    magnetic(btn, 0.4);
    return {
      setPlaying: function (p) {
        btn.classList.toggle("is-playing", p); btn.innerHTML = p ? ICON_PAUSE : ICON_PLAY; btn.setAttribute("aria-label", p ? "Pause" : "Play");
        animate(btn, { scale: [0.86, 1] }, SPRING.bouncy);
      },
      update: function (t, d, bands) {
        timeEl.textContent = fmtTime(t) + " / " + fmtTime(d);
        for (var i = 0; i < bars.length; i++) bars[i].style.transform = "scaleY(" + Math.max(0.08, Math.min(1, (bands && bands[i]) || 0) * 1.4) + ")";
      },
      setNote: function (text) { note.textContent = text; }
    };
  }

  // ------------------------------------------------------------------ Stages: the inference pipeline
  var STAGES = [
    ["Upload received", "FastAPI accepts the multipart file"],
    ["Load 48 kHz mono", "librosa resamples the signal"],
    ["Slice 10 s windows", "480,000 samples each, short tails padded"],
    ["Embed audio", "CLAP audio embeddings, batches of 4"],
    ["Embed prompts", "32 instrument descriptions as text"],
    ["Max-pool", "strongest window per instrument"],
    ["Dynamic threshold", "keep scores at mean x 1.15 or more"]
  ];
  function Stages(root, props) {
    props = props || {};
    var list = props.stages || STAGES;
    root.className = "t-stages"; root.style.setProperty("--n", list.length);
    root.innerHTML = '<div class="t-stages-line"><b></b></div><div class="t-stages-bead"></div>' + list.map(function (s, i) {
      return '<div class="t-stage" data-status="waiting"><span class="t-label t-stage-num">' + String(i + 1).padStart(2, "0") + '</span><div class="t-stage-dot"></div><h4>' + esc(s[0]) + "</h4><p>" + esc(s[1]) + '</p><span class="t-stage-ms"></span></div>';
    }).join("");
    var fill = root.querySelector(".t-stages-line b"), bead = root.querySelector(".t-stages-bead"), items = root.querySelectorAll(".t-stage");
    function vertical() { return window.matchMedia && window.matchMedia("(max-width: 760px)").matches; }
    function setProgress(f) { animate(fill, vertical() ? { scaleY: f } : { scaleX: f }, SPRING.gentle); }
    function moveBead(i) {
      var dot = items[i].querySelector(".t-stage-dot"), rr = root.getBoundingClientRect(), dr = dot.getBoundingClientRect();
      animate(bead, { x: dr.left - rr.left, y: dr.top - rr.top - (vertical() ? 0 : 28), opacity: 1, scale: [1.5, 1] }, SPRING.bouncy);
    }
    function set(i, status) {
      var el = items[i]; if (!el) return;
      el.dataset.status = status;
      if (status === "active") { moveBead(i); scramble(el.querySelector("h4"), list[i][0], { duration: 0.45 }); }
    }
    function reset() {
      Array.prototype.forEach.call(items, function (el) { el.dataset.status = "waiting"; el.querySelector(".t-stage-ms").textContent = ""; });
      fill.style.transform = vertical() ? "scaleY(0)" : "scaleX(0)"; bead.style.opacity = "0";
    }
    function run(promise, stepMs) {
      reset();
      var ms = stepMs || 520, settled = false, result, error, t0 = performance.now(), last = t0;
      promise.then(function (r) { settled = true; result = r; }, function (e) { settled = true; error = e; });
      function wait(t) { return new Promise(function (r) { setTimeout(r, t); }); }
      function untilSettled() { return settled ? Promise.resolve() : wait(150).then(untilSettled); }
      function stamp(i) { var now = performance.now(); items[i].querySelector(".t-stage-ms").textContent = ((now - last) / 1000).toFixed(2) + " s"; last = now; }
      var chain = Promise.resolve();
      list.forEach(function (_, i) {
        chain = chain.then(function () {
          set(i, "active"); setProgress((i + 0.5) / list.length);
          return i < list.length - 1 ? wait(ms).then(function () { stamp(i); set(i, "done"); }) : untilSettled();
        });
      });
      return chain.then(function () {
        var lastI = list.length - 1;
        if (error) { set(lastI, "waiting"); setProgress(lastI / list.length); throw error; }
        stamp(lastI); set(lastI, "done"); setProgress(1);
        animate(bead, { opacity: [1, 0], scale: [1, 2.2] }, { duration: 0.5 });
        items[lastI].querySelector(".t-stage-ms").textContent += " · total " + ((performance.now() - t0) / 1000).toFixed(2) + " s";
        return result;
      });
    }
    return { set: set, reset: reset, progress: setProgress, run: run, count: list.length };
  }

  // ------------------------------------------------------------------ small DOM components
  function Button(root, props) {
    props = props || {};
    root.classList.add("t-btn", "t-btn--" + (props.variant || "primary"));
    if (props.label != null) root.innerHTML = "<span>" + esc(props.label) + "</span>" + (props.arrow ? '<span class="t-btn-arrow" aria-hidden="true">&rarr;</span>' : "");
    magnetic(root, props.magnet);
    return root;
  }
  function FamilyChip(root, props) {
    var fam = props.family ? FAMILIES.filter(function (f) { return f.id === props.family; })[0] || familyOf(props.instrument) : familyOf(props.instrument);
    root.className = "t-chip"; root.style.setProperty("--fam", "var(--" + fam.token + ")");
    root.innerHTML = "<i></i>" + esc(props.label || fam.label);
    return root;
  }
  function StatusPill(root, props) {
    root.className = "t-pill";
    var label = document.createElement("span"), dot = document.createElement("i");
    root.innerHTML = ""; root.appendChild(dot); root.appendChild(label);
    function set(state, text) {
      root.dataset.state = state; scramble(label, text, { duration: 0.5 });
      animate(dot, { scale: [2, 1] }, SPRING.bouncy);
    }
    root.dataset.state = props.state || "offline"; label.textContent = props.text || "API not connected";
    return { set: set };
  }
  function Dropzone(root, props) {
    props = props || {};
    root.classList.add("t-drop");
    root.innerHTML = '<input type="file" accept="audio/*" aria-label="Choose an audio file">' +
      '<div class="t-drop-sweep" aria-hidden="true"></div>' +
      '<div class="t-drop-rings" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>' +
      '<div class="t-drop-core"><div class="t-drop-bindu"></div><div class="t-drop-title">' + (props.title || "Drop a <em>song</em> here") + '</div>' +
      '<span class="t-label">' + esc(props.hint || "mp3 · wav · m4a · flac — or click to browse") + "</span></div>";
    var input = root.querySelector("input"), rings = root.querySelectorAll(".t-drop-rings span"), core = root.querySelector(".t-drop-core");
    function ripple() {
      Array.prototype.forEach.call(rings, function (r, i) {
        animate(r, { scale: [1, 1.12, 1], borderColor: [css("volt-ink"), css("line")] }, { duration: 0.9, delay: i * 0.07, ease: EASE.out });
      });
      animate(core, { scale: [0.94, 1] }, SPRING.bouncy);
    }
    function take(file) { if (!file) return; ripple(); if (props.onFile) props.onFile(file); }
    input.addEventListener("change", function () { take(input.files && input.files[0]); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (n) { root.addEventListener(n, function (e) { e.preventDefault(); root.classList.add("is-dragging"); }); });
    ["dragleave", "drop"].forEach(function (n) { root.addEventListener(n, function (e) { e.preventDefault(); root.classList.remove("is-dragging"); }); });
    root.addEventListener("drop", function (e) { take(e.dataTransfer && e.dataTransfer.files[0]); });
    root.addEventListener("pointermove", function (e) {
      if (reduced() || !MO()) return;
      var r = root.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      Array.prototype.forEach.call(rings, function (ring, i) { MO().animate(ring, { x: x * (i + 1) * 12, y: y * (i + 1) * 12 }, SPRING.soft); });
    });
    root.addEventListener("pointerleave", function () { if (MO()) Array.prototype.forEach.call(rings, function (ring) { MO().animate(ring, { x: 0, y: 0 }, SPRING.bouncy); }); });
    return { ripple: ripple, setTitle: function (html) { var t = root.querySelector(".t-drop-title"); t.innerHTML = html; animate(t, { opacity: [0, 1], y: [10, 0] }, SPRING.soft); } };
  }
  function Field(root, props) {
    root.className = "t-field";
    var id = props.id || ("f" + Math.random().toString(36).slice(2, 8));
    root.innerHTML = '<label class="t-label" for="' + id + '">' + esc(props.label) + '</label><input id="' + id + '" type="' + (props.type || "text") + '"' +
      (props.value ? ' value="' + esc(props.value) + '"' : "") + (props.autocomplete ? ' autocomplete="' + props.autocomplete + '"' : "") + ">" +
      (props.help ? "<small>" + esc(props.help) + "</small>" : "");
    return root.querySelector("input");
  }
  function MetricTile(root, props) {
    root.className = "t-metric";
    root.innerHTML = '<span class="t-label">' + esc(props.label) + "</span><b></b><small>" + esc(props.caption || "") + "</small>";
    var b = root.querySelector("b"), current = 0;
    function set(v, opts) {
      if (typeof v === "number") { b.classList.remove("is-word"); ticker(b, v, Object.assign({ decimals: 0, from: current }, opts || {})); current = v; }
      else { b.classList.add("is-word"); b.textContent = v; animate(b, { opacity: [0, 1], y: [14, 0] }, SPRING.soft); }
    }
    if (props.value != null) set(props.value, props);
    return { set: set };
  }

  // ------------------------------------------------------------------ API client for app.py
  function b64(s) { var bytes = new TextEncoder().encode(s), bin = ""; bytes.forEach(function (b) { bin += String.fromCharCode(b); }); return btoa(bin); }
  function authHeader(user, pass) { return "Basic " + b64(user + ":" + pass); }
  function failure(r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      throw new Error(r.status === 401 ? "401 Unauthorized: check the username and password" : (j && j.detail) || ("HTTP " + r.status));
    });
  }
  var api = {
    health: function (base, user, pass) { return fetch(base.replace(/\/$/, "") + "/", { headers: { Authorization: authHeader(user, pass) } }).then(function (r) { return r.ok ? r.json() : failure(r); }); },
    detect: function (base, user, pass, file) {
      var body = new FormData(); body.append("file", file);
      return fetch(base.replace(/\/$/, "") + "/detect", { method: "POST", headers: { Authorization: authHeader(user, pass) }, body: body }).then(function (r) { return r.ok ? r.json() : failure(r); });
    }
  };
  // the example response from the repository README, for demo mode
  var SAMPLE = {
    success: true, total_instruments_detected: 3,
    instruments: [
      { instrument: "Tabla", original_prediction: "Tabla", confidence: 0.3142, confidence_percentage: "31.42%", timestamp: "0:40 - 0:50" },
      { instrument: "Harmonium", original_prediction: "Harmonium", confidence: 0.2918, confidence_percentage: "29.18%", timestamp: "1:20 - 1:30" },
      { instrument: "Bansuri", original_prediction: "Bansuri", confidence: 0.2745, confidence_percentage: "27.45%", timestamp: "2:00 - 2:10" }
    ]
  };

  window.Taal = {
    version: "2.0.0",
    motion: { EASE: EASE, SPRING: SPRING, animate: animate, tween: tween, onFrame: onFrame, reduced: reduced, splitWords: splitWords, revealText: revealText, scramble: scramble, inView: inView, scrollLinked: scrollLinked, ticker: ticker, magnetic: magnetic, engine: function () { return MO() ? "motion" : "waapi"; } },
    sound: sound, pluckSound: pluckSound, Player: Player,
    FAMILIES: FAMILIES, STAGES: STAGES, SAMPLE: SAMPLE,
    familyOf: familyOf, parseTimestamp: parseTimestamp, confidenceOf: confidenceOf, fmtTime: fmtTime, esc: esc,
    decodePeaks: decodePeaks, synthPeaks: synthPeaks, css: css, onTheme: onTheme, api: api,
    Button: Button, FamilyChip: FamilyChip, StatusPill: StatusPill, Dropzone: Dropzone, Field: Field, Transport: Transport,
    Waveform: Waveform, Stages: Stages, InstrumentString: InstrumentString, TaalRing: TaalRing, MetricTile: MetricTile, StringField: StringField
  };
})();
