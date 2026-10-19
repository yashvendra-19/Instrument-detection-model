import { motion } from "framer-motion";
import { Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import GlassCard from "../components/GlassCard.jsx";
import Marquee from "../components/Marquee.jsx";
import { Kicker, Reveal, ShinyText, SplitText } from "../components/TextEffects.jsx";
import { useApp } from "../context/AppState.jsx";
import { CATEGORIES, INSTRUMENTS, categoryOf } from "../data/instruments.js";
import { PIPELINE } from "../data/project.js";

const SoundSphere = lazy(() => import("../components/SoundSphere.jsx"));

const STATS = [
  { value: "32", label: "instrument prompts" },
  { value: "15", label: "Indian instruments" },
  { value: "10 s", label: "analysis windows" },
  { value: "0", label: "task-specific training" },
];

function InstrumentChip({ inst }) {
  const cat = categoryOf(inst.category);
  return <span className="inst-chip glass" style={{ "--accent": cat.color }}><i aria-hidden="true" />{inst.name}</span>;
}

export default function Home() {
  const { levelRef, enterDemo } = useApp();
  const navigate = useNavigate();
  const startDemo = async () => { navigate("/analyze"); await enterDemo(); };
  const half = Math.ceil(INSTRUMENTS.length / 2);

  return (
    <div className="page page--home">
      {/* ---------- hero ---------- */}
      <section className="hero">
        <div className="hero__copy">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="badge glass"><span className="badge__pulse" aria-hidden="true" /> <ShinyText>Zero-shot · CLAP embeddings · FastAPI</ShinyText></span>
          </motion.div>
          <SplitText className="hero__title" text="Hear every instrument in Indian music." gradient={["instrument", "Indian", "music"]} delay={0.15} />
          <motion.p className="hero__lede" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.7 }}>
            Upload a song and a contrastive audio–text model listens to it in 10-second windows, matches each one against
            32 described instruments — from tabla and sitar to 808 bass — and tells you where each is heard most clearly.
          </motion.p>
          <motion.div className="hero__cta" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7 }}>
            <Button variant="primary" size="lg" to="/analyze" icon="◉">Open the studio</Button>
            <Button variant="glass" size="lg" onClick={startDemo} icon="▶">Try the demo</Button>
          </motion.div>
          <motion.dl className="hero__stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }}>
            {STATS.map((s) => <div key={s.label}><dt className="mono">{s.value}</dt><dd>{s.label}</dd></div>)}
          </motion.dl>
        </div>
        <motion.div className="hero__visual" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="hero__halo" aria-hidden="true" />
          <Suspense fallback={<div className="sound-sphere sound-sphere--fallback" />}>
            <SoundSphere levelRef={levelRef} />
          </Suspense>
          <GlassCard className="float-card float-card--a" spotlight={false}>
            <span className="mono muted">best window</span><strong>Tabla · 0:40 – 0:50</strong>
          </GlassCard>
          <GlassCard className="float-card float-card--b" spotlight={false}>
            <span className="mono muted">threshold</span><strong>τ = 1.15 × mean</strong>
          </GlassCard>
        </motion.div>
      </section>

      {/* ---------- instrument marquee ---------- */}
      <section className="section section--tight" aria-label="Supported instruments">
        <Marquee speed={55}>{INSTRUMENTS.slice(0, half).map((i) => <InstrumentChip key={i.id} inst={i} />)}</Marquee>
        <Marquee speed={60} reverse>{INSTRUMENTS.slice(half).map((i) => <InstrumentChip key={i.id} inst={i} />)}</Marquee>
      </section>

      {/* ---------- bento ---------- */}
      <section className="section">
        <Reveal className="section__head">
          <Kicker>Why it works</Kicker>
          <h2 className="section__title">Language becomes the label set.</h2>
          <p className="section__lede">Instead of training a classifier per instrument, every class is a sentence. CLAP places audio and text in one embedding space, so a song window can be compared directly with a description.</p>
        </Reveal>
        <div className="bento">
          <Reveal className="bento__a" delay={0.05}>
            <GlassCard tilt glow className="bento__card">
              <span className="bento__icon" aria-hidden="true">✦</span>
              <h3>Zero-shot prompts</h3>
              <p className="muted">32 descriptive prompts define the vocabulary. Adding an instrument means adding one sentence — no data collection, no retraining.</p>
              <code className="prompt-sample mono">"A traditional Indian tabla playing rapid rhythmic percussion strokes"</code>
            </GlassCard>
          </Reveal>
          <Reveal className="bento__b" delay={0.1}>
            <GlassCard tilt className="bento__card">
              <span className="bento__icon" aria-hidden="true">▤</span>
              <h3>Whole-song windows</h3>
              <p className="muted">48 kHz mono, sliced into 10-second windows.</p>
              <div className="mini-windows" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} className={i === 4 ? "is-hit" : ""} style={{ "--h": `${30 + ((i * 37) % 60)}%` }} />)}</div>
            </GlassCard>
          </Reveal>
          <Reveal className="bento__c" delay={0.15}>
            <GlassCard tilt className="bento__card">
              <span className="bento__icon" aria-hidden="true">◷</span>
              <h3>Time-stamped</h3>
              <p className="muted">Max-pooling keeps each instrument's strongest window, so every detection comes with where to listen.</p>
            </GlassCard>
          </Reveal>
          <Reveal className="bento__d" delay={0.2}>
            <GlassCard tilt className="bento__card">
              <span className="bento__icon" aria-hidden="true">⌁</span>
              <h3>Adaptive threshold</h3>
              <p className="muted">Scores must reach 1.15 × the song's mean — the cut-off adapts to every recording.</p>
            </GlassCard>
          </Reveal>
          <Reveal className="bento__e" delay={0.25}>
            <GlassCard tilt className="bento__card bento__card--api">
              <span className="bento__icon" aria-hidden="true">{"{ }"}</span>
              <h3>A service, not a script</h3>
              <p className="muted">Authenticated FastAPI endpoint returning JSON — this console is one client.</p>
              <pre className="code mono">{`POST /detect
{ "instrument": "Tabla",
  "confidence": 0.3142,
  "timestamp": "0:40 - 0:50" }`}</pre>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      {/* ---------- pipeline teaser ---------- */}
      <section className="section">
        <Reveal className="section__head">
          <Kicker>Pipeline</Kicker>
          <h2 className="section__title">From waveform to answer in eight steps.</h2>
        </Reveal>
        <div className="teaser">
          <div className="teaser__beam" aria-hidden="true" />
          {PIPELINE.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06} className="teaser__step">
              <span className="teaser__node mono">{String(i + 1).padStart(2, "0")}</span>
              <strong>{p.title}</strong>
            </Reveal>
          ))}
        </div>
        <div className="center"><Button variant="glass" to="/how-it-works">See how it works →</Button></div>
      </section>

      {/* ---------- categories + CTA ---------- */}
      <section className="section">
        <Reveal>
          <GlassCard glow className="cta">
            <div>
              <Kicker>Coverage</Kicker>
              <h2 className="section__title">Seven families. One model.</h2>
              <div className="cat-legend">
                {CATEGORIES.map((c) => (
                  <span key={c.id} className="cat-legend__item" style={{ "--accent": c.color }}>
                    <i aria-hidden="true" />{c.label}<b className="mono">{INSTRUMENTS.filter((i) => i.category === c.id).length}</b>
                  </span>
                ))}
              </div>
            </div>
            <div className="cta__actions">
              <Button variant="primary" size="lg" to="/instruments">Browse all 32</Button>
              <Button variant="ghost" to="/analyze">Analyze a song</Button>
            </div>
          </GlassCard>
        </Reveal>
      </section>
    </div>
  );
}
