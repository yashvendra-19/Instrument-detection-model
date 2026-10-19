import Button from "../components/Button.jsx";
import GlassCard from "../components/GlassCard.jsx";
import { Kicker, Reveal } from "../components/TextEffects.jsx";
import { COURSE, REPO_URL, TEAM } from "../data/project.js";

const STACK = ["CLAP · laion_clap", "PyTorch", "librosa", "NumPy", "FastAPI", "Uvicorn", "React", "Three.js", "Framer Motion", "Web Audio API"];
const initials = (n) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");

export default function About() {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <Kicker>Team</Kicker>
          <h1 className="page-title">The people behind it</h1>
          <p className="section__lede">Instrument Detection in Indian Music Using Zero-Shot CLAP Embeddings — {COURSE}, VIT Vellore.</p>
        </div>
      </header>

      <div className="team">
        {TEAM.map((m, i) => (
          <Reveal key={m.reg} delay={i * 0.07}>
            <GlassCard tilt className="member">
              <span className="member__avatar" style={{ "--rot": `${i * 70}deg` }} aria-hidden="true"><span>{initials(m.name)}</span></span>
              <h3>{m.name}</h3>
              <span className="mono muted">{m.reg}</span>
            </GlassCard>
          </Reveal>
        ))}
      </div>

      <div className="about-grid about-grid--single">
        <Reveal delay={0.08}>
          <GlassCard className="panel">
            <Kicker>Built with</Kicker>
            <div className="stack">{STACK.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            <div className="panel__actions"><Button variant="glass" href={REPO_URL} icon="↗">View on GitHub</Button></div>
          </GlassCard>
        </Reveal>
      </div>
    </div>
  );
}
