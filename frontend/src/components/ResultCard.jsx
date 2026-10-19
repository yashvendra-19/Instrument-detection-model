import { motion } from "framer-motion";
import GlassCard from "./GlassCard.jsx";
import { normalizeConfidence } from "../lib/audio.js";
import { colorForInstrument, instrumentByName, categoryOf } from "../data/instruments.js";

export default function ResultCard({ item, rank, live, demo, onPlay, max }) {
  const score = normalizeConfidence(item);
  const color = colorForInstrument(item.instrument);
  const cat = categoryOf(instrumentByName(item.instrument)?.category);
  return (
    <motion.div initial={{ opacity: 0, y: 24, rotateX: -12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.6, delay: rank * 0.08, ease: [0.22, 1, 0.36, 1] }} style={{ perspective: 900 }}>
      <GlassCard tilt maxTilt={5} className={`result ${live ? "is-live" : ""}`} style={{ "--accent": color }}>
        <div className="result__head">
          <span className="result__rank">#{String(rank + 1).padStart(2, "0")}</span>
          <div className="result__name">
            <h3>{item.instrument}</h3>
            <span className="muted">{cat?.label || "Instrument"}</span>
          </div>
          <div className="result__score">
            <strong className="mono">{score.pct.toFixed(2)}%</strong>
            <span className="mono muted">raw {score.raw.toFixed(4)}</span>
          </div>
        </div>
        <div className="meter" aria-hidden="true"><motion.div className="meter__fill" initial={{ width: 0 }} animate={{ width: `${(score.pct / (max || score.pct || 1)) * 92}%` }} transition={{ duration: 1.1, delay: 0.2 + rank * 0.08, ease: [0.22, 1, 0.36, 1] }} /></div>
        <div className="result__foot">
          <span className="chip mono">{item.timestamp}</span>
          {demo && <span className="chip chip--warning">Sample · demo</span>}
          <button type="button" className="btn btn--ghost btn--sm result__play" onClick={onPlay} aria-label={`Play ${item.instrument} window ${item.timestamp}`}>
            <span aria-hidden="true">▶</span> Play window
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
