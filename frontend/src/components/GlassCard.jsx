import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Glass panel with optional 3D tilt (Aceternity "3D card" idea), cursor spotlight and animated glow border.
 * Children rendered with data-depth="n" are lifted n px toward the viewer while tilting.
 */
export default function GlassCard({ children, className = "", tilt = false, spotlight = true, glow = false, maxTilt = 8, style, ...rest }) {
  const ref = useRef(null);
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 }), sry = useSpring(ry, { stiffness: 180, damping: 18 });
  const rotateX = useTransform(srx, (v) => `${v}deg`), rotateY = useTransform(sry, (v) => `${v}deg`);

  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    if (tilt && !reduceMotion()) { ry.set((x - 0.5) * maxTilt * 2); rx.set(-(y - 0.5) * maxTilt * 2); }
  };
  const onLeave = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      className={`glass ${spotlight ? "glass--spotlight" : ""} ${glow ? "glass--glow" : ""} ${tilt ? "glass--tilt" : ""} ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1100, ...style } : style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
