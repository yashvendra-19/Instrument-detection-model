(function () {
  "use strict";
  var T = window.Taal, M = T.motion, $ = function (s) { return document.querySelector(s); };
  var state = { file: null, samples: T.synthPeaks(360, 11), duration: 150, api: "http://127.0.0.1:8000", user: "", pass: "", connected: false, busy: false, ring: null, rows: [], player: null };

  // ---------- theme: dark-first, follows the viewer until toggled
  var root = document.documentElement, themeBtn = $("#themeBtn");
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function paintThemeBtn() { var d = currentTheme() === "dark"; themeBtn.textContent = d ? "Light" : "Dark"; themeBtn.title = d ? "Switch to light theme" : "Switch to dark theme"; }
  try { var saved = localStorage.getItem("taal-theme"); if (saved) root.setAttribute("data-theme", saved); } catch (e) {}
  themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("taal-theme", next); } catch (e) {}
    paintThemeBtn();
  });
  paintThemeBtn();

  // ---------- sound toggle (starts from a click, as browsers require)
  var soundBtn = $("#soundBtn");
  soundBtn.addEventListener("click", function () {
    T.sound.enabled = !T.sound.enabled;
    soundBtn.setAttribute("aria-pressed", String(T.sound.enabled));
    soundBtn.textContent = T.sound.enabled ? "Sound on" : "Sound off";
    if (T.sound.enabled) T.pluckSound(0, 0.8);
  });

  // ---------- chrome and scroll-linked motion
  var status = T.StatusPill($("#status"), { state: "offline", text: "API not connected" });
  M.scrollLinked($("#bow"), { scaleX: [0, 1] });
  M.scrollLinked($("#strings"), { y: [0, 70], opacity: [1, 0.3] }, { target: $(".hero"), offset: ["start start", "end start"] });
  document.querySelectorAll(".t-btn").forEach(function (b) { M.magnetic(b, 0.25); });

  // ---------- hero: one orchestrated entrance
  var strings = T.StringField($("#strings"), {});
  M.revealText($("#heroTitle"), { delay: 0.1 });
  M.scramble($(".hero-kicker"), null, { delay: 0.2, duration: 0.9 });
  [".hero-sub", ".hero-cta", "#heroStrings"].forEach(function (sel, i) {
    M.animate($(sel), { opacity: [0, 1], y: [18, 0] }, Object.assign({}, M.SPRING.soft, { delay: 0.45 + i * 0.1 }));
  });

  // section heads: title words rise, labels decode, numbers settle, all once on entry; content is complete at rest
  document.querySelectorAll(".sec-head").forEach(function (head) {
    M.inView(head, function () {
      M.revealText(head.querySelector(".sec-title"));
      head.querySelectorAll(".t-label").forEach(function (l) { M.scramble(l, null, { duration: 0.6 }); });
      M.scramble(head.querySelector(".sec-num"), null, { duration: 0.5 });
      var note = head.querySelector(".sec-note");
      if (note) M.animate(note, { opacity: [0, 1], x: [16, 0] }, Object.assign({}, M.SPRING.soft, { delay: 0.15 }));
    }, { amount: 0.6 });
  });

  // ---------- intake + playback
  var wave = T.Waveform($("#wave"), { duration: state.duration, samples: state.samples, onSeek: function (t) { if (state.player) state.player.seek(t); } });
  var transport = T.Transport($("#transport"), { duration: state.duration, note: "Simulated playback of the example signal · silent", onToggle: togglePlay });
  var drop = T.Dropzone($("#drop"), { onFile: takeFile });
  function setPlayer(p, note) {
    if (state.player) state.player.destroy();
    state.player = p; transport.setPlaying(false); transport.setNote(note);
    p.on(function (t, bands) {
      transport.update(t, p.duration, bands);
      wave.setTime(t);
      if (p.playing) strings.drive(bands);
      state.rows.forEach(function (r) { r.setTime(p.playing || t > 0 ? t : null); });
      if (state.ring && (p.playing || t > 0)) state.ring.setTime(t);
    });
    transport.update(0, p.duration, null);
  }
  function togglePlay() {
    var p = state.player; if (!p) return;
    p.toggle().then(function () {
      transport.setPlaying(p.playing);
      $("#stringsHint").textContent = p.playing ? "Strings are following the audio · each band drives one family string" : "Run your cursor across the strings · one per instrument family";
    }).catch(function () { transport.setNote("This browser blocked playback. Press play again."); });
  }
  setPlayer(new T.Player({ duration: state.duration, samples: state.samples }), "Simulated playback of the example signal · silent");

  function setFileRow(kind, name, info) {
    $("#fileKind").textContent = kind; $("#fileName").textContent = name; $("#fileInfo").textContent = info;
    M.animate($("#fileName"), { opacity: [0, 1], y: [12, 0] }, M.SPRING.soft);
  }
  function takeFile(file) {
    if (!file.type || file.type.indexOf("audio/") !== 0) { setFileRow("Not audio", file.name, "Choose an mp3, wav, m4a or flac file."); return; }
    state.file = file; $("#clearBtn").hidden = false;
    setFileRow("Your file", file.name, (file.size / 1048576).toFixed(1) + " MB · decoding…");
    drop.setTitle("Loaded. Drop <em>another</em>?");
    setPlayer(new T.Player({ file: file }), "Live: bands measured from your file in this browser");
    T.decodePeaks(file, 480).then(function (d) {
      state.duration = d.duration; state.samples = d.samples;
      wave.set({ samples: d.samples, duration: d.duration });
      transport.update(0, d.duration, null);
      setFileRow("Your file", file.name, (file.size / 1048576).toFixed(1) + " MB · " + T.fmtTime(d.duration) + " · " + Math.ceil(d.duration / 10) + " windows");
    }).catch(function () { setFileRow("Your file", file.name, (file.size / 1048576).toFixed(1) + " MB · preview unavailable, the API can still read it"); });
    syncHint();
  }
  $("#clearBtn").addEventListener("click", function () {
    state.file = null; state.duration = 150; state.samples = T.synthPeaks(360, 11); $("#clearBtn").hidden = true;
    drop.setTitle("Drop a <em>song</em> here");
    wave.set({ samples: state.samples, duration: 150 });
    setPlayer(new T.Player({ duration: 150, samples: state.samples }), "Simulated playback of the example signal · silent");
    setFileRow("Example signal", "No file yet", "Synthesised preview · 2:30");
    syncHint();
  });
  function syncHint() {
    $("#analyzeHint").textContent = !state.file ? "Choose a file, or play the README sample."
      : !state.connected ? "Connect the API to analyze this file." : "Ready. The file goes to " + state.api + "/detect.";
  }

  // ---------- pipeline + results
  var stages = T.Stages($("#stages"), {});
  var mCount = T.MetricTile($("#mCount"), { label: "Instruments", caption: "above the dynamic threshold" });
  var mTop = T.MetricTile($("#mTop"), { label: "Top match", caption: "highest similarity" });
  var mPeak = T.MetricTile($("#mPeak"), { label: "Peak score", caption: "raw cosine similarity" });
  var mWin = T.MetricTile($("#mWindows"), { label: "Windows", caption: "10 seconds each" });

  function render(payload, source) {
    var list = (payload && Array.isArray(payload.instruments)) ? payload.instruments : [];
    $("#resultSource").textContent = source; M.scramble($("#resultSource"), source, { duration: 0.6 });
    var host = $("#stringList"); host.innerHTML = ""; state.rows = [];
    var maxEnd = 0; list.forEach(function (r) { var t = T.parseTimestamp(r.timestamp); if (t) maxEnd = Math.max(maxEnd, t.end); });
    var duration = Math.max(state.duration, maxEnd);
    mWin.set(Math.ceil(duration / 10));
    if (!list.length) {
      host.innerHTML = '<div class="empty">No instrument cleared the dynamic threshold for this track.</div>';
      mCount.set(0); mTop.set("None"); mPeak.set(0, { decimals: 4 });
    } else {
      var best = list.reduce(function (a, b) { return T.confidenceOf(b).raw > T.confidenceOf(a).raw ? b : a; });
      mCount.set(list.length); mTop.set(best.instrument); mPeak.set(T.confidenceOf(best).raw, { decimals: 4 });
      var maxPct = T.confidenceOf(best).pct;
      list.forEach(function (item, i) {
        var row = document.createElement("div"); host.appendChild(row);
        state.rows.push(T.InstrumentString(row, { item: item, index: i, duration: duration, maxPct: maxPct, delay: i * 0.14 }));
      });
    }
    wave.setPeaks(list);
    if (state.ring) state.ring.destroy();
    state.ring = T.TaalRing($("#ringMount"), { results: list, duration: duration });
    $("#legend").innerHTML = list.map(function (r, i) {
      var f = T.familyOf(r.instrument);
      return '<li style="--fam:var(--' + f.token + ')"><span class="ln">' + String(i + 1).padStart(2, "0") + '</span><span><strong>' + T.esc(r.instrument) + '</strong><br><span class="t-label"><span class="sw"></span>' + T.esc(f.label) + '</span></span><span class="data">' + T.esc(r.timestamp || "") + "</span></li>";
    }).join("") || '<li><span></span><span class="muted">Nothing to place on the ring.</span><span></span></li>';
    document.querySelectorAll("#legend li").forEach(function (li, i) { M.animate(li, { opacity: [0, 1], x: [18, 0] }, Object.assign({}, M.SPRING.soft, { delay: 0.9 + i * 0.1 })); });
    paintMatrix(list);
  }
  function fail(err) { $("#stringList").innerHTML = '<div class="fail"><strong>FAILED</strong>' + T.esc(err.message || String(err)) + "</div>"; }

  // ---------- matrix of all 32 prompts; detected cells pop on a spring
  function paintMatrix(list) {
    var hits = {}; list.forEach(function (r) { hits[String(r.instrument).toLowerCase()] = true; });
    $("#matrixGrid").innerHTML = T.FAMILIES.map(function (f) {
      return '<div class="fam" style="--fam:var(--' + f.token + ')"><h3 class="t-label"><i></i>' + T.esc(f.label) + " · " + f.members.length + "</h3><ul>" +
        f.members.map(function (m) { return '<li class="' + (hits[m.toLowerCase()] ? "hit" : "") + '">' + T.esc(m) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
    document.querySelectorAll("#matrixGrid li.hit").forEach(function (li, i) { M.animate(li, { scale: [0.6, 1], opacity: [0, 1] }, Object.assign({}, M.SPRING.bouncy, { delay: 0.3 + i * 0.12 })); });
  }

  // ---------- run
  function go(promise, source) {
    if (state.busy) return;
    state.busy = true; $("#analyzeBtn").disabled = true; $("#ctaSample").disabled = true;
    $("#analyzeBtn").classList.add("is-busy"); $("#analyzeLabel").textContent = "Listening…";
    status.set("busy", "Inference running");
    document.getElementById("pipeline").scrollIntoView({ behavior: M.reduced() ? "auto" : "smooth", block: "start" });
    stages.run(promise, 480).then(function (payload) {
      render(payload, source);
      status.set(state.connected ? "online" : "offline", state.connected ? "API online" : "API not connected");
      setTimeout(function () { document.getElementById("results").scrollIntoView({ behavior: M.reduced() ? "auto" : "smooth", block: "start" }); }, 450);
    }).catch(function (e) {
      fail(e); status.set("offline", "Request failed");
      document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
    }).then(function () {
      state.busy = false; $("#analyzeBtn").disabled = false; $("#ctaSample").disabled = false;
      $("#analyzeBtn").classList.remove("is-busy"); $("#analyzeLabel").textContent = "Analyze again";
    });
  }
  function sample() {
    go(new Promise(function (r) { setTimeout(function () { r(T.SAMPLE); }, 3600); }), "README sample response · not a real analysis");
  }
  $("#ctaSample").addEventListener("click", sample);
  $("#analyzeBtn").addEventListener("click", function () {
    if (!state.file) { sample(); return; }
    if (!state.connected) { openDrawer(); return; }
    go(T.api.detect(state.api, state.user, state.pass, state.file).catch(function (e) {
      throw e instanceof TypeError ? new Error("The browser could not reach " + state.api + ". Check the address, that the API is running, and that this page may call it.") : e;
    }), "Live response · " + state.file.name);
  });

  // ---------- API drawer
  var drawer = $("#drawer"), scrim = $("#scrim"), lastFocus = null;
  var fUrl = T.Field($("#fUrl"), { id: "apiUrl", label: "API address", type: "url", value: state.api });
  var fUser = T.Field($("#fUser"), { id: "apiUser", label: "Username", autocomplete: "username" });
  var fPass = T.Field($("#fPass"), { id: "apiPass", label: "Password", type: "password", autocomplete: "current-password" });
  function openDrawer() {
    lastFocus = document.activeElement; drawer.hidden = false; scrim.hidden = false;
    M.animate(drawer, { x: ["100%", "0%"] }, M.SPRING.snappy);
    M.animate(scrim, { opacity: [0, 1] }, { duration: 0.25 });
    drawer.querySelectorAll(".drawer-form > *").forEach(function (el, i) { M.animate(el, { opacity: [0, 1], x: [28, 0] }, Object.assign({}, M.SPRING.soft, { delay: 0.12 + i * 0.06 })); });
    setTimeout(function () { fUser.focus(); }, 80);
  }
  function closeDrawer() {
    var a = M.animate(drawer, { x: ["0%", "100%"] }, { duration: 0.32, ease: M.EASE.inOut });
    M.animate(scrim, { opacity: [1, 0] }, { duration: 0.25 });
    var done = function () { drawer.hidden = true; scrim.hidden = true; if (lastFocus) lastFocus.focus(); };
    if (a && a.then) a.then(done); else if (a && "onfinish" in a) a.onfinish = done; else done();
  }
  $("#accessBtn").addEventListener("click", openDrawer);
  $("#closeDrawer").addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);
  addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) closeDrawer(); });
  $("#accessForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("#accessMsg");
    state.api = fUrl.value.trim().replace(/\/$/, ""); state.user = fUser.value; state.pass = fPass.value;
    if (!state.api || !state.user || !state.pass) { msg.dataset.tone = "bad"; msg.textContent = "Fill in the address, username and password."; return; }
    msg.dataset.tone = ""; msg.textContent = "Checking " + state.api + " …"; status.set("busy", "Connecting");
    T.api.health(state.api, state.user, state.pass).then(function (j) {
      state.connected = true; msg.dataset.tone = "ok"; msg.textContent = "Connected. " + (j.message || "Health check passed.");
      status.set("online", "API online"); strings.strings.forEach(function (_, i) { setTimeout(function () { strings.pluck(i, 0.5, 12); }, i * 70); });
      syncHint(); setTimeout(closeDrawer, 700);
    }).catch(function (err) {
      state.connected = false; msg.dataset.tone = "bad";
      msg.textContent = err instanceof TypeError ? "Could not reach " + state.api + ". Check the address and that the API is running. Pages hosted on claude.ai cannot call other servers; open the page locally instead." : "Connection failed: " + err.message;
      status.set("offline", "API not connected"); syncHint();
    });
  });

  // ---------- first frame: the README sample, labelled as such
  render(T.SAMPLE, "README sample response · not a real analysis");
  syncHint();
})();
