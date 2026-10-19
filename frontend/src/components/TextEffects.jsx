import { motion } from "framer-motion";
import { Fragment } from "react";

// Word-by-word blur/slide reveal (React Bits "Split Text" idea). Words listed in `gradient` get the aurora gradient.
export function SplitText({ text, as: Tag = "h1", className = "", delay = 0, gradient = [] }) {
  const words = text.split(" ");
  const MotionTag = motion[Tag] || motion.h1;
  return (
    <MotionTag className={className} aria-label={text} initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: delay } } }}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="split__word-wrap" aria-hidden="true">
            <motion.span className={`split__word ${gradient.includes(w.replace(/[.,]/g, "")) ? "text-gradient" : ""}`}
              variants={{ hidden: { y: "0.6em", opacity: 0, filter: "blur(10px)" }, show: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}>
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </MotionTag>
  );
}

// Sweeping highlight across text (React Bits "Shiny Text" idea).
export function ShinyText({ children, className = "" }) {
  return <span className={`shiny ${className}`}>{children}</span>;
}

// Small uppercase label above section titles.
export function Kicker({ children, className = "" }) {
  return <span className={`kicker ${className}`}><span className="kicker__dot" aria-hidden="true" />{children}</span>;
}

// Fade-up on scroll into view.
export function Reveal({ children, delay = 0, className = "", y = 24, as = "div" }) {
  const M = motion[as] || motion.div;
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}
