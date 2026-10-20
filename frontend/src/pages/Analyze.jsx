import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy, useMemo, useRef, useState } from "react";
import Button from "../components/Button.jsx";
import GlassCard from "../components/GlassCard.jsx";
import Pipeline from "../components/Pipeline.jsx";
import ResultCard from "../components/ResultCard.jsx";
import SongTimeline from "../components/SongTimeline.jsx";
import Waveform from "../components/Waveform.jsx";
import { Kicker } from "../components/TextEffects.jsx";
import { StatusPill } from "../components/NavBar.jsx";
import { useApp, usePlaybackTime } from "../context/AppState.jsx";
import { WINDOW_SEC, formatBytes, formatTime, normalizeConfidence, parseTimestamp, windowCount } from "../lib/audio.js";

const SoundSphere = lazy(() => import("../components/SoundSphere.jsx"));

function DropZone({ onFile, busy }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  return (
    <label className={`drop ${drag ? "is-drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}>
      <input ref={input} type="file" accept="audio/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      <span className="drop__border" aria-hidden="true" />
      <span className="drop__orb" aria-hidden="true"><i /><i /><i /></span>
      <strong>{busy ? "Preparing audio…" : "Drop a song here"}</strong>
      <span className="muted">or click to browse · MP3 · WAV · M4A · FLAC</span>
    </label>
  );
}

export default function Analyze() {
  const app = useApp();
  const { song, songLoading, loadFile, loadDemoSong, clearSong, run, result, analyze, cancel, status, demo, levelRef, playing, togglePlay, seek, playWindow, setConnectOpen, enterDemo, exitDemo, cacheInfo, clearCache } = app;
  const time = usePlaybackTime();
  const results = result?.instruments || [];

  const span = useMemo(() => {
    let s = song?.duration || 0;
    results.forEach((r) => { const p = parseTimestamp(r.timestamp); if (p) s = Math.max(s, p.end); });
    return Math.max(s, WINDOW_SEC);
  }, [song, results]);

  const windows = windowCount(song?.duration);
  const nowWindow = Math.floor(time / WINDOW_SEC);
  const maxPct = Math.max(...results.map((r) => normalizeConfidence(r).pct), 0);
  const top = results[0];
  const ready = status === "online" || status === "demo";

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ file: song?.name, demo: !!result?.demo, instruments: results }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${(song?.name || "result").replace(/\.[^.]+$/, "")}-instruments.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="page page--studio">
      <header className="page-head">
        <div>
          <Kicker>Studio</Kicker>
          <h1 className="page-title">Analyze a song</h1>
          <p className="section__lede">Load audio, run the detector and listen to every detection in place.</p>
        </div>
        <div className="page-head__actions">
          <StatusPill status={status} />
          {!ready && <Button variant="glass" size="sm" onClick={() => setConnectOpen(true)}>Connect API</Button>}
          {status !== "demo" ? <Button variant="ghost" size="sm" onClick={enterDemo}>Demo mode</Button> : <Button variant="ghost" size="sm" onClick={exitDemo}>Exit demo</Button>}
        </div>
      </header>

      <AnimatePresence>
        {demo && (
          <motion.div className="demo-banner glass" role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <span className="chip chip--warning">Demo mode</span>
            <span>The pipeline is simulated and results are a fixed sample — not real CLAP output.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="studio">
        {/* ---------- left: signal ---------- */}
        <div className="studio__main">
          <GlassCard className="panel" spotlight={false}>
            <div className="panel__head">
              <div><span className="panel__kicker mono">01 / SIGNAL</span><h2>Audio input</h2></div>
              {song && <span className="chip mono">{windows} × 10-s windows</span>}
            </div>
            {!song ? (
              <>
                <DropZone onFile={loadFile} busy={songLoading} />
                <div className="panel__alt"><span className="muted">No song handy?</span><Button variant="ghost" size="sm" onClick={loadDemoSong} loading={songLoading}>Generate demo song</Button></div>
              </>
            ) : (
              <>
                <div className="file-row">
                  <span className="file-row__icon" aria-hidden="true">♫</span>
                  <div className="file-row__meta"><strong>{song.name}</strong><span className="muted mono">{formatBytes(song.size)} · {formatTime(song.duration)}</span></div>
                  <Button variant="ghost" size="sm" onClick={clearSong}>Remove</Button>
                </div>
                <Waveform peaks={song.peaks} span={span} duration={song.duration} results={results} time={time} onSeek={(t) => seek(t)} />
                <div className="player">
                  <button type="button" className={`play-btn ${playing ? "is-playing" : ""}`} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                    <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
                  </button>
                  <span className="mono player__time"><b>{formatTime(time)}</b> / {formatTime(song.duration)}</span>
                  <span className="mono muted player__window">window {Math.min(nowWindow + 1, Math.max(windows, 1))} · {formatTime(nowWindow * 10)}–{formatTime(nowWindow * 10 + 10)}</span>
                </div>
                <div className="panel__actions">
                  {run.phase === "running"
                    ? <Button variant="glass" onClick={cancel}>Cancel</Button>
                    : <Button variant="primary" size="lg" onClick={() => analyze()} icon="◉">{ready ? (results.length ? "Analyze again" : "Analyze audio") : "Connect to analyze"}</Button>}
                  <Button variant="ghost" onClick={loadDemoSong} loading={songLoading}>Use demo song</Button>
                </div>
              </>
            )}
          </GlassCard>

          <AnimatePresence>
            {run.phase !== "idle" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                <GlassCard className="panel" spotlight={false}>
                  <div className="panel__head">
                    <div><span className="panel__kicker mono">02 / PIPELINE</span><h2>Inference</h2></div>
                    <span className={`chip mono ${run.phase === "failed" ? "chip--danger" : run.phase === "done" ? "chip--success" : ""}`}>
                      {run.phase === "running" ? `${run.demo ? "demo · " : ""}${formatTime(run.elapsed)}` : run.phase === "done" ? (run.cached ? "from cache · instant" : `${run.demo ? "simulated in" : "done in"} ${run.elapsed.toFixed(1)} s`) : "failed"}
                    </span>
                  </div>
                  <Pipeline run={run} />
                  {run.error && <p className="form__message is-error" role="alert">{run.error}</p>}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------- right: live visual + summary ---------- */}
        <aside className="studio__side">
          <GlassCard className="panel panel--orb" spotlight={false}>
            <span className="panel__kicker mono">LIVE SIGNAL</span>
            <Suspense fallback={<div className="sound-sphere sound-sphere--fallback" />}>
              <SoundSphere levelRef={levelRef} className="sound-sphere--studio" detail={26} sparkles={false} />
            </Suspense>
            <p className="muted center small">The sphere reacts to the audio level while a song plays.</p>
          </GlassCard>
          <GlassCard className="panel cache-card" spotlight={false}>
            <div className="cache-card__row">
              <div><span className="panel__kicker mono">BROWSER CACHE</span>
                <p className="small"><b className="mono">{cacheInfo.results}</b> analyses · <b className="mono">{cacheInfo.peaks}</b> waveforms</p></div>
              <Button variant="ghost" size="sm" onClick={clearCache} disabled={!cacheInfo.results && !cacheInfo.peaks}>Clear</Button>
            </div>
            <p className="muted small">Songs you analysed before load their results instantly. Stored only in this browser.</p>
          </GlassCard>
          <div className="stat-grid">
            <GlassCard className="stat"><span className="mono muted">detected</span><strong>{results.length || "—"}</strong></GlassCard>
            <GlassCard className="stat"><span className="mono muted">top match</span><strong>{top?.instrument || "—"}</strong></GlassCard>
            <GlassCard className="stat"><span className="mono muted">peak score</span><strong className="mono">{top ? normalizeConfidence(top).raw.toFixed(3) : "—"}</strong></GlassCard>
            <GlassCard className="stat"><span className="mono muted">windows</span><strong className="mono">{windows || "—"}</strong></GlassCard>
          </div>
        </aside>
      </div>

      {/* ---------- results ---------- */}
      <AnimatePresence>
        {result && (
          <motion.section className="section section--flush" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="section__head section__head--row">
              <div><Kicker>03 / Output</Kicker><h2 className="section__title">Detection matrix</h2></div>
              <div className="section__actions">
                {result.cached && <span className="chip chip--success" title="Stored in this browser">From cache · analysed {new Date(result.savedAt).toLocaleString()}</span>}
                {result.cached && <Button variant="ghost" size="sm" onClick={() => analyze({ force: true })}>Re-run analysis</Button>}
                {results.length > 0 && <Button variant="glass" size="sm" onClick={exportJson}>Export JSON</Button>}
              </div>
            </div>
            {results.length === 0 ? (
              <GlassCard className="empty"><strong>No instruments above the threshold</strong><span className="muted">The detector returned no candidates after dynamic filtering.</span></GlassCard>
            ) : (
              <>
                <div className="results">
                  {results.map((r, i) => {
                    const p = parseTimestamp(r.timestamp);
                    const live = playing && p && time >= p.start && time < p.end;
                    return <ResultCard key={`${r.instrument}-${i}`} item={r} rank={i} max={maxPct} live={live} demo={result.demo} onPlay={() => playWindow(r.timestamp)} />;
                  })}
                </div>
                <GlassCard className="panel" spotlight={false}>
                  <div className="panel__head">
                    <div><span className="panel__kicker mono">04 / FULL-SONG MAP</span><h2>Instrument timeline</h2></div>
                    <span className="muted small">Click a lane to play its window · click the ruler to seek</span>
                  </div>
                  <SongTimeline results={results} span={span} duration={song?.duration} time={time} playing={playing} onPlayWindow={playWindow} onSeek={seek} />
                </GlassCard>
                <p className="muted small note">Scores are cosine similarities: the percentage ranks instruments within one song; it is not a calibrated probability.</p>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
