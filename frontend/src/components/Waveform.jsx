import { useEffect, useRef } from "react";
import { WINDOW_SEC, parseTimestamp } from "../lib/audio.js";
import { colorForInstrument } from "../data/instruments.js";

// Peak waveform with the 10-second window grid, detected windows and a playhead. Click to seek.
export default function Waveform({ peaks, span, duration, results = [], time = 0, onSeek }) {
  const canvas = useRef(null);
  const wrap = useRef(null);

  useEffect(() => {
    const c = canvas.current, w = wrap.current; if (!c || !w) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, W = w.clientWidth, H = w.clientHeight;
      c.width = W * dpr; c.height = H * dpr;
      const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
      const pts = peaks || Array.from({ length: 180 }, (_, i) => 0.15 + Math.abs(Math.sin(i * 0.21) * Math.cos(i * 0.05)) * 0.5);
      const used = duration && span ? duration / span : 1; // the song may end before the last padded window
      const gap = (W * used) / pts.length, bw = Math.max(1.2, gap * 0.62);
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "#22d3ee"); g.addColorStop(0.5, "#8b5cf6"); g.addColorStop(1, "#e94cc4");
      ctx.fillStyle = g;
      pts.forEach((a, i) => { const h = Math.max(2, a * (H - 16)); ctx.beginPath(); ctx.roundRect(i * gap, (H - h) / 2, bw, h, bw / 2); ctx.fill(); });
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(w);
    return () => ro.disconnect();
  }, [peaks, span, duration]);

  const lines = [];
  for (let t = WINDOW_SEC; t < span; t += WINDOW_SEC) lines.push(t);
  const seek = (e) => {
    if (!onSeek || !span) return;
    const r = wrap.current.getBoundingClientRect();
    onSeek(((e.clientX - r.left) / r.width) * span);
  };
  const onKey = (e) => {
    if (!onSeek) return;
    if (e.key === "ArrowRight") onSeek(time + 5);
    if (e.key === "ArrowLeft") onSeek(time - 5);
  };

  return (
    <div className="wave" ref={wrap} onClick={seek} onKeyDown={onKey} role="slider" tabIndex={0}
      aria-label="Song position" aria-valuemin={0} aria-valuemax={Math.round(duration || 0)} aria-valuenow={Math.round(time)}>
      <canvas ref={canvas} className="wave__canvas" />
      {lines.map((t) => <i key={t} className="wave__line" style={{ left: `${(t / span) * 100}%` }} />)}
      {results.map((r, k) => {
        const p = parseTimestamp(r.timestamp); if (!p) return null;
        return (
          <div key={k} className="wave__hit" style={{ left: `${(p.start / span) * 100}%`, width: `${((p.end - p.start) / span) * 100}%`, "--accent": colorForInstrument(r.instrument) }}>
            <span>{r.instrument}</span>
          </div>
        );
      })}
      <div className="wave__playhead" style={{ left: `${Math.min(100, (time / (span || 1)) * 100)}%` }} />
    </div>
  );
}
