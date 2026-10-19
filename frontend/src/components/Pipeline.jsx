import { motion } from "framer-motion";
import { STEPS } from "../context/AppState.jsx";

// Vertical stepper with an animated beam that fills as steps complete.
export default function Pipeline({ run }) {
  const done = run.steps.filter((s) => s.state === "done").length;
  return (
    <div className="pipeline">
      <div className="pipeline__rail" aria-hidden="true">
        <motion.div className="pipeline__beam" animate={{ height: `${(done / STEPS.length) * 100}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <ol className="pipeline__list">
        {STEPS.map((s, i) => {
          const st = run.steps[i];
          return (
            <li key={s.key} className={`pipeline__step is-${st.state}`}>
              <span className="pipeline__node" aria-hidden="true">{st.state === "done" ? "✓" : String(i + 1).padStart(2, "0")}</span>
              <div className="pipeline__text"><strong>{s.title}</strong><small>{s.sub}</small></div>
              <span className="pipeline__state">{st.label}</span>
            </li>
          );
        })}
      </ol>
      <div className={`progress ${run.waiting ? "is-waiting" : ""}`}><div className="progress__fill" style={{ width: `${run.progress * 100}%` }} /></div>
      <p className="pipeline__note">Steps 02–05 run inside one server request. The API reports no per-step progress, so they stay “on server” until the response arrives.</p>
    </div>
  );
}
