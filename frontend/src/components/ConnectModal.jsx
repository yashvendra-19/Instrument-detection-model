import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppState.jsx";
import Button from "./Button.jsx";

export default function ConnectModal() {
  const { connectOpen, setConnectOpen, conn, connect, status, connMessage, enterDemo, exitDemo } = useApp();
  const [form, setForm] = useState(conn);
  const firstField = useRef(null);

  useEffect(() => { if (connectOpen) { setForm(conn); setTimeout(() => firstField.current?.focus(), 50); } }, [connectOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!connectOpen) return;
    const onKey = (e) => e.key === "Escape" && setConnectOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [connectOpen, setConnectOpen]);

  const submit = async (e) => {
    e.preventDefault();
    if (await connect(form)) setTimeout(() => setConnectOpen(false), 500);
  };

  return (
    <AnimatePresence>
      {connectOpen && (
        <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setConnectOpen(false)}>
          <motion.div className="modal__panel glass glass--glow" role="dialog" aria-modal="true" aria-labelledby="connect-title"
            initial={{ opacity: 0, y: 24, scale: 0.96, rotateX: 12 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <div className="modal__head">
              <div>
                <span className="kicker"><span className="kicker__dot" />Backend</span>
                <h2 id="connect-title">Connect to the FastAPI service</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setConnectOpen(false)} aria-label="Close">✕</button>
            </div>
            <p className="muted">Credentials stay in this browser tab only — they are never written to the code or the repository.</p>
            <form className="form" onSubmit={submit}>
              <label className="field"><span>API base URL</span>
                <input ref={firstField} type="url" required value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} /></label>
              <div className="form__row">
                <label className="field"><span>Username</span>
                  <input type="text" autoComplete="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
                <label className="field"><span>Password</span>
                  <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
              </div>
              <div className="modal__actions">
                <Button variant="primary" type="submit" loading={status === "connecting"}>Test connection</Button>
                {status === "demo"
                  ? <Button variant="ghost" onClick={exitDemo}>Exit demo mode</Button>
                  : <Button variant="ghost" onClick={enterDemo}>No backend? Use demo mode</Button>}
              </div>
              <div className={`form__message ${connMessage ? `is-${connMessage.type}` : ""}`} role="status">{connMessage?.text}</div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
