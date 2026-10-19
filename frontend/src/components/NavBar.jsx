import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { useApp } from "../context/AppState.jsx";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/analyze", label: "Studio" },
  { to: "/instruments", label: "Instruments" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "Team" },
];

const STATUS = {
  online: { label: "API online", tone: "success" },
  demo: { label: "Demo mode", tone: "warning" },
  connecting: { label: "Connecting…", tone: "info" },
  offline: { label: "Not connected", tone: "danger" },
};

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.offline;
  return (
    <span className={`status-pill status-pill--${s.tone}`} role="status">
      <span className="status-pill__dot" aria-hidden="true" />{s.label}
    </span>
  );
}

export default function NavBar() {
  const { status, setConnectOpen } = useApp();
  const { pathname } = useLocation();
  return (
    <header className="nav">
      <motion.nav className="nav__bar glass" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} aria-label="Main">
        <NavLink to="/" className="nav__brand" aria-label="Instrument Intelligence home">
          <span className="nav__logo" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="nav__brand-text">Instrument<b>Intelligence</b></span>
        </NavLink>
        <ul className="nav__links">
          {LINKS.map((l) => {
            const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
            return (
              <li key={l.to}>
                <NavLink to={l.to} className={`nav__link ${active ? "is-active" : ""}`}>
                  {active && <motion.span layoutId="nav-pill" className="nav__pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <span className="nav__link-text">{l.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
        <div className="nav__end">
          <StatusPill status={status} />
          <button type="button" className="btn btn--glass btn--sm" onClick={() => setConnectOpen(true)}>Connect</button>
        </div>
      </motion.nav>
    </header>
  );
}
