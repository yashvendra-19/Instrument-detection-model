import { Link } from "react-router-dom";
import { COURSE, REPO_URL } from "../data/project.js";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <strong className="footer__brand">Instrument<b>Intelligence</b></strong>
          <p className="muted">Zero-shot instrument detection for Indian music · {COURSE}</p>
        </div>
        <nav className="footer__links" aria-label="Footer">
          <Link to="/analyze">Studio</Link>
          <Link to="/instruments">Instruments</Link>
          <Link to="/how-it-works">How it works</Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
      </div>
    </footer>
  );
}
