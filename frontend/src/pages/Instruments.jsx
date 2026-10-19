import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { Kicker, Reveal } from "../components/TextEffects.jsx";
import { CATEGORIES, INSTRUMENTS, categoryOf } from "../data/instruments.js";

export default function Instruments() {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => INSTRUMENTS.filter((i) =>
    (cat === "all" || i.category === cat) &&
    (!q || `${i.name} ${i.prompt}`.toLowerCase().includes(q.toLowerCase()))), [cat, q]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <Kicker>Library</Kicker>
          <h1 className="page-title">32 instruments, described in words</h1>
          <p className="section__lede">Each instrument is a sentence the CLAP text encoder turns into an embedding. These are the exact prompts in <code className="mono">classifier.py</code>.</p>
        </div>
      </header>

      <Reveal className="filters glass">
        <div className="filters__chips" role="tablist" aria-label="Instrument family">
          {[{ id: "all", label: "All", color: "var(--text-1)" }, ...CATEGORIES].map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id}
              className={`filter-chip ${cat === c.id ? "is-active" : ""}`} style={{ "--accent": c.color }} onClick={() => setCat(c.id)}>
              {cat === c.id && <motion.span layoutId="filter-pill" className="filter-chip__pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <span className="filter-chip__text">{c.label}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Search instruments</span>
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search name or prompt…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </Reveal>

      <p className="muted small" role="status">{list.length} of {INSTRUMENTS.length} shown</p>

      <motion.div layout className="inst-grid">
        <AnimatePresence mode="popLayout">
          {list.map((i, k) => {
            const c = categoryOf(i.category);
            return (
              <motion.div key={i.id} layout initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4, delay: Math.min(k, 12) * 0.025, ease: [0.22, 1, 0.36, 1] }}>
                <GlassCard tilt className="inst-card" style={{ "--accent": c.color }}>
                  <div className="inst-card__top">
                    <span className="inst-card__num mono">{String(i.id).padStart(2, "0")}</span>
                    <span className="inst-card__cat">{c.label}</span>
                  </div>
                  <h3>{i.name}</h3>
                  <p className="inst-card__prompt mono">“{i.prompt}”</p>
                  <span className="inst-card__glow" aria-hidden="true" />
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <GlassCard className="panel note-card" spotlight={false}>
        <strong>Add your own instrument</strong>
        <p className="muted">Append a sentence to <code className="mono">CANDIDATE_PROMPTS</code> in <code className="mono">classifier.py</code> and map the same string to a display name in <code className="mono">PROMPT_TO_INSTRUMENT</code>. No retraining — it takes effect at the next start. Mandolin is grouped with the Indian strings because of its frequent use in Indian film and folk music.</p>
      </GlassCard>
    </div>
  );
}
