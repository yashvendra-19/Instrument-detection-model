import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AuroraBackground from "./components/AuroraBackground.jsx";
import ConnectModal from "./components/ConnectModal.jsx";
import Footer from "./components/Footer.jsx";
import NavBar from "./components/NavBar.jsx";
import About from "./pages/About.jsx";
import Analyze from "./pages/Analyze.jsx";
import Home from "./pages/Home.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Instruments from "./pages/Instruments.jsx";

const TITLES = { "/": "Instrument Intelligence", "/analyze": "Studio · Instrument Intelligence", "/instruments": "Instruments · Instrument Intelligence", "/how-it-works": "How it works · Instrument Intelligence", "/about": "Team · Instrument Intelligence" };

// Each page enters with a short depth move: slightly behind the screen, blurred, then into place.
function PageTransition({ children }) {
  return (
    <motion.main id="main" className="page-wrap"
      initial={{ opacity: 0, y: 24, scale: 0.985, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -16, scale: 0.99, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.main>
  );
}

export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = TITLES[location.pathname] || TITLES["/"];
  }, [location.pathname]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <AuroraBackground />
      <NavBar />
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/instruments" element={<Instruments />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </AnimatePresence>
      <Footer />
      <ConnectModal />
    </>
  );
}
