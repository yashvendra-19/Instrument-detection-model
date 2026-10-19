import { WINDOW_SEC, formatTime, parseTimestamp } from "../lib/audio.js";
import { colorForInstrument } from "../data/instruments.js";

// Full-song map: time ruler, one lane per detected instrument, playhead synced to playback.
export default function SongTimeline({ results, span, duration, time, playing, onPlayWindow, onSeek }) {
  const step = span <= 60 ? 10 : span <= 180 ? 30 : span <= 600 ? 60 : 120;
  const ticks = [];
  for (let t = 0; t <= span + 0.01; t += WINDOW_SEC) ticks.push(t);
  const pct = (t) => `${(t / span) * 100}%`;
  const rulerSeek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - r.left) / r.width) * span, true);
  };
  return (
    <div className="timeline">
      <div className="timeline__row timeline__row--ruler">
        <span className="timeline__label mono">SONG · {formatTime(duration || span)}</span>
        <div className="timeline__ruler" onClick={rulerSeek} role="presentation">
          {ticks.map((t) => (
            <i key={t} className={`timeline__tick ${t % step === 0 ? "is-major" : ""}`} style={{ left: pct(t) }}>
              {t % step === 0 && <span className="mono">{formatTime(t)}</span>}
            </i>
          ))}
        </div>
      </div>
      {results.map((r, k) => {
        const p = parseTimestamp(r.timestamp); if (!p) return null;
        const live = playing && time >= p.start && time < p.end;
        return (
          <button type="button" key={k} className={`timeline__row timeline__lane ${live ? "is-live" : ""}`} style={{ "--accent": colorForInstrument(r.instrument) }}
            onClick={() => onPlayWindow(r.timestamp)} aria-label={`Play ${r.instrument}, ${r.timestamp}`}>
            <span className="timeline__label"><b>{r.instrument}</b><small className="mono">{r.timestamp}</small></span>
            <span className="timeline__track"><span className="timeline__bar" style={{ left: pct(p.start), width: pct(p.end - p.start) }} /></span>
          </button>
        );
      })}
      <div className="timeline__playhead-wrap" aria-hidden="true"><div className="timeline__playhead" style={{ left: pct(Math.min(time, span)) }} /></div>
    </div>
  );
}
