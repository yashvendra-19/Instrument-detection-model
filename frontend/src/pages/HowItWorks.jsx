import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import GlassCard from "../components/GlassCard.jsx";
import TracingBeam from "../components/TracingBeam.jsx";
import { Kicker, Reveal } from "../components/TextEffects.jsx";
import { PIPELINE } from "../data/project.js";

const LAYERS = [
  { title: "Browser console", sub: "React · Web Audio · Three.js", items: ["Upload & waveform", "Player & timeline", "Demo mode"], color: "var(--cyan)" },
  { title: "FastAPI service", sub: "app.py · HTTP Basic auth", items: ["GET /  health", "POST /detect", "Temp-file handling"], color: "var(--violet)" },
  { title: "Classifier engine", sub: "classifier.py · laion_clap", items: ["10-s windowing", "CLAP audio + text encoders", "Max-pool + threshold"], color: "var(--magenta)" },
];

function Architecture() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const spread = useTransform(scrollYProgress, [0.2, 0.5], [18, 70]);
  const tilt = useTransform(scrollYProgress, [0.1, 0.5], [60, 54]);
  // one motion value per layer (top layer lifted furthest)
  const zs = [useTransform(spread, (s) => 2 * s), useTransform(spread, (s) => s), useTransform(spread, () => 0)];
  return (
    <div className="arch" ref={ref}>
      <motion.div className="arch__stage" style={{ rotateX: tilt, rotateZ: -24 }}>
        {LAYERS.map((l, i) => (
          <motion.div key={l.title} className="arch__layer glass" style={{ "--accent": l.color, z: zs[i] }}>
            <div className="arch__layer-head"><span className="arch__dot" aria-hidden="true" /><strong>{l.title}</strong><span className="mono muted">{l.sub}</span></div>
            <div className="arch__items">{l.items.map((t) => <span key={t} className="chip">{t}</span>)}</div>
          </motion.div>
        ))}
      </motion.div>
      <ol className="arch__legend">
        {LAYERS.map((l, i) => <li key={l.title} style={{ "--accent": l.color }}><b className="mono">{i + 1}</b> {l.title} <span className="muted">— {l.sub}</span></li>)}
      </ol>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <Kicker>How it works</Kicker>
          <h1 className="page-title">Inside the detector</h1>
          <p className="section__lede">The full path a song takes, the maths that decides what gets reported, and the three layers the system is built from.</p>
        </div>
      </header>

      <section className="section section--flush">
        <TracingBeam>
          {PIPELINE.map((p, i) => (
            <Reveal key={p.title} className="step-row">
              <span className="step-row__node mono" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <GlassCard tilt maxTilt={4} className="step-row__card">
                <h3>{p.title}</h3>
                <p className="muted">{p.detail}</p>
              </GlassCard>
            </Reveal>
          ))}
        </TracingBeam>
      </section>

      <section className="section">
        <Reveal className="section__head"><Kicker>Scoring</Kicker><h2 className="section__title">Four lines of maths</h2></Reveal>
        <div className="math-grid">
          {[
            ["Normalise", "uᵢ = aᵢ / ‖aᵢ‖     wₖ = tₖ / ‖tₖ‖", "Audio window i and prompt k become unit vectors."],
            ["Similarity", "Sᵢₖ = uᵢ · wₖ", "Cosine similarity: an N × 32 matrix."],
            ["Max-pool", "sₖ = maxᵢ Sᵢₖ     iₖ* = argmaxᵢ Sᵢₖ", "Best score and best window per instrument."],
            ["Threshold", "τ = 1.15 × (1/32) Σₖ sₖ     report k if sₖ ≥ τ", "Time range = [10·iₖ*, 10·iₖ* + 10] s."],
          ].map(([t, eq, d], i) => (
            <Reveal key={t} delay={i * 0.08}>
              <GlassCard tilt glow={i === 3} className="math">
                <span className="panel__kicker mono">{String(i + 1).padStart(2, "0")} / {t.toUpperCase()}</span>
                <p className="math__eq">{eq}</p>
                <p className="muted small">{d}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal className="section__head"><Kicker>Architecture</Kicker><h2 className="section__title">Three layers, one request</h2>
          <p className="section__lede">Scroll to separate the layers. The console talks only to the API; the API owns the model.</p></Reveal>
        <Architecture />
      </section>
    </div>
  );
}
