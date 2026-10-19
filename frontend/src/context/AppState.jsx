import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { checkHealth, postDetect } from "../lib/api.js";
import { simulateDetect, synthDemoSong } from "../lib/demo.js";
import { computePeaks, parseTimestamp } from "../lib/audio.js";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const STEPS = [
  { key: "upload", title: "Uploading audio", sub: "Sending the file to FastAPI /detect" },
  { key: "window", title: "Windowing", sub: "48 kHz mono · 10-second windows" },
  { key: "embed", title: "CLAP embeddings", sub: "Audio windows + 32 text prompts" },
  { key: "match", title: "Similarity + max-pool", sub: "Best window per instrument" },
  { key: "threshold", title: "Dynamic threshold", sub: "Keep scores ≥ 1.15 × mean" },
];
const idleSteps = () => STEPS.map(() => ({ state: "waiting", label: "WAITING" }));

export function AppStateProvider({ children }) {
  // ---- connection ----
  const [conn, setConn] = useState({ apiUrl: "http://127.0.0.1:8000", username: "", password: "" });
  const [status, setStatus] = useState("offline"); // offline | connecting | online | demo
  const [connMessage, setConnMessage] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);

  // ---- song ----
  const [song, setSong] = useState(null); // { file, url, name, size, type, peaks, duration }
  const [songLoading, setSongLoading] = useState(false);

  // ---- analysis ----
  const [run, setRun] = useState({ phase: "idle", steps: idleSteps(), progress: 0, waiting: false, elapsed: 0, error: null });
  const [result, setResult] = useState(null); // { instruments, demo }
  const requestRef = useRef(null);

  // ---- audio ----
  const audioRef = useRef(null);
  const levelRef = useRef(0);
  const stopAtRef = useRef(null);
  const graphRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const demo = status === "demo";

  // connection -------------------------------------------------------------
  const connect = useCallback(async (next) => {
    const c = { ...conn, ...next };
    setConn(c);
    setStatus("connecting");
    setConnMessage({ type: "info", text: "Connecting to FastAPI…" });
    try {
      await checkHealth(c);
      setStatus("online");
      setConnMessage({ type: "success", text: "Connected. Health check passed." });
      return true;
    } catch (e) {
      setStatus("offline");
      setConnMessage({ type: "error", text: `Connection failed: ${e.message}` });
      return false;
    }
  }, [conn]);

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    if (file.type && !file.type.startsWith("audio/")) {
      setConnMessage({ type: "error", text: "Please choose an audio file." });
      return;
    }
    setSongLoading(true);
    setResult(null);
    setRun({ phase: "idle", steps: idleSteps(), progress: 0, waiting: false, elapsed: 0, error: null });
    const url = URL.createObjectURL(file);
    setSong((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return { file, url, name: file.name, size: file.size, type: file.type, peaks: null, duration: 0 }; });
    try {
      const { peaks, duration } = await computePeaks(file);
      setSong((s) => (s && s.file === file ? { ...s, peaks, duration } : s));
    } catch {
      /* duration still arrives from the audio element's metadata */
    } finally {
      setSongLoading(false);
    }
  }, []);

  const loadDemoSong = useCallback(async () => {
    setSongLoading(true);
    try { await loadFile(await synthDemoSong()); } finally { setSongLoading(false); }
  }, [loadFile]);

  const enterDemo = useCallback(async () => {
    setStatus("demo");
    setConnMessage({ type: "success", text: "Demo mode on — analysis is simulated and returns a sample result." });
    setConnectOpen(false);
    if (!song) await loadDemoSong();
  }, [song, loadDemoSong]);

  const exitDemo = useCallback(() => {
    requestRef.current?.abort();
    setStatus("offline");
    setConnMessage(null);
  }, []);

  const clearSong = useCallback(() => {
    requestRef.current?.abort();
    audioRef.current?.pause();
    setSong((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; });
    setResult(null);
    setRun({ phase: "idle", steps: idleSteps(), progress: 0, waiting: false, elapsed: 0, error: null });
  }, []);

  // analysis ---------------------------------------------------------------
  const analyze = useCallback(async () => {
    if (!song?.file) return;
    if (status !== "online" && status !== "demo") { setConnectOpen(true); return; }
    const isDemo = status === "demo";
    const started = performance.now();
    const steps = idleSteps();
    steps[0] = { state: "active", label: "0%" };
    setResult(null);
    setRun({ phase: "running", steps, progress: 0, waiting: false, elapsed: 0, error: null, demo: isDemo });
    const tick = setInterval(() => setRun((r) => ({ ...r, elapsed: (performance.now() - started) / 1000 })), 200);
    const cb = {
      onUploadProgress: (f) => setRun((r) => {
        const s = [...r.steps]; s[0] = { state: "active", label: `${Math.round(f * 100)}%` };
        return { ...r, steps: s, progress: f * 0.3 };
      }),
      onUploaded: () => setRun((r) => ({
        ...r, progress: 0.3, waiting: true,
        steps: r.steps.map((s, i) => (i === 0 ? { state: "done", label: "DONE" } : { state: "active", label: isDemo ? "SIMULATED" : "ON SERVER" })),
      })),
    };
    const req = isDemo ? simulateDetect(song.duration, cb) : postDetect(conn, song.file, cb);
    requestRef.current = req;
    try {
      const payload = await req.promise;
      const instruments = Array.isArray(payload?.instruments) ? payload.instruments : [];
      setResult({ instruments, demo: !!payload.demo });
      setRun({ phase: "done", steps: STEPS.map(() => ({ state: "done", label: "DONE" })), progress: 1, waiting: false, elapsed: (performance.now() - started) / 1000, error: null, demo: isDemo });
    } catch (e) {
      if (e.aborted) {
        setRun({ phase: "idle", steps: idleSteps(), progress: 0, waiting: false, elapsed: 0, error: null });
      } else {
        setRun((r) => ({ ...r, phase: "failed", waiting: false, error: e.message, steps: r.steps.map((s) => (s.state === "active" ? { state: "failed", label: "FAILED" } : s)) }));
      }
    } finally {
      clearInterval(tick);
      requestRef.current = null;
    }
  }, [song, status, conn]);

  const cancel = useCallback(() => requestRef.current?.abort(), []);

  // audio ------------------------------------------------------------------
  const ensureGraph = useCallback(() => {
    if (graphRef.current || !audioRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser); analyser.connect(ctx.destination);
      graphRef.current = { ctx, analyser, buf: new Uint8Array(analyser.fftSize) };
    } catch { /* level meter is optional */ }
  }, []);

  const play = useCallback(() => {
    const a = audioRef.current; if (!a || !song) return;
    ensureGraph();
    graphRef.current?.ctx.resume();
    a.play().catch(() => {});
  }, [song, ensureGraph]);
  const pause = useCallback(() => audioRef.current?.pause(), []);
  const togglePlay = useCallback(() => {
    stopAtRef.current = null;
    if (audioRef.current?.paused) play(); else pause();
  }, [play, pause]);
  const seek = useCallback((sec, andPlay = false) => {
    const a = audioRef.current; if (!a || !song) return;
    stopAtRef.current = null;
    a.currentTime = Math.max(0, Math.min(sec, song.duration || sec));
    if (andPlay) play();
  }, [song, play]);
  const playWindow = useCallback((timestamp) => {
    const p = parseTimestamp(timestamp); if (!p || !audioRef.current) return;
    audioRef.current.currentTime = p.start;
    stopAtRef.current = Math.min(p.end, song?.duration || p.end);
    play();
  }, [song, play]);

  // audio element wiring + level meter for the 3D sphere
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => { if (stopAtRef.current != null && a.currentTime >= stopAtRef.current) { a.pause(); stopAtRef.current = null; } };
    const onMeta = () => setSong((s) => (s && !s.duration && Number.isFinite(a.duration) ? { ...s, duration: a.duration } : s));
    a.addEventListener("play", onPlay); a.addEventListener("pause", onPause); a.addEventListener("ended", onPause);
    a.addEventListener("timeupdate", onTime); a.addEventListener("loadedmetadata", onMeta);
    let raf;
    const loop = () => {
      const g = graphRef.current;
      if (g && !a.paused) {
        g.analyser.getByteTimeDomainData(g.buf);
        let sum = 0; for (let i = 0; i < g.buf.length; i++) { const v = (g.buf[i] - 128) / 128; sum += v * v; }
        levelRef.current = levelRef.current * 0.8 + Math.min(1, Math.sqrt(sum / g.buf.length) * 4) * 0.2;
        if (stopAtRef.current != null && a.currentTime >= stopAtRef.current) { a.pause(); stopAtRef.current = null; }
      } else {
        levelRef.current *= 0.92;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      a.removeEventListener("play", onPlay); a.removeEventListener("pause", onPause); a.removeEventListener("ended", onPause);
      a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const value = useMemo(() => ({
    conn, status, demo, connMessage, setConnMessage, connectOpen, setConnectOpen, connect, enterDemo, exitDemo,
    song, songLoading, loadFile, loadDemoSong, clearSong,
    run, result, analyze, cancel,
    audioRef, levelRef, playing, togglePlay, seek, playWindow,
  }), [conn, status, demo, connMessage, connectOpen, connect, enterDemo, exitDemo, song, songLoading, loadFile, loadDemoSong, clearSong, run, result, analyze, cancel, playing, togglePlay, seek, playWindow]);

  return (
    <AppCtx.Provider value={value}>
      {children}
      <audio ref={audioRef} src={song?.url || undefined} preload="metadata" />
    </AppCtx.Provider>
  );
}

// Re-render a component with the audio element's current time (rAF while playing).
export function usePlaybackTime() {
  const { audioRef, playing, song } = useApp();
  const [t, setT] = useState(0);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    let raf;
    const loop = () => { setT(a.currentTime || 0); if (!a.paused) raf = requestAnimationFrame(loop); };
    loop();
    const onSeek = () => setT(a.currentTime || 0);
    a.addEventListener("seeked", onSeek);
    return () => { cancelAnimationFrame(raf); a.removeEventListener("seeked", onSeek); };
  }, [audioRef, playing, song]);
  return t;
}
