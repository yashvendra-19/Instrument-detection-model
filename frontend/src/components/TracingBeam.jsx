import { motion, useScroll, useSpring } from "framer-motion";
import { useRef } from "react";

// A glowing beam down the left edge that fills as the section scrolls past (Aceternity "Tracing Beam" idea).
export default function TracingBeam({ children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <div className="beam" ref={ref}>
      <div className="beam__rail" aria-hidden="true">
        <motion.div className="beam__fill" style={{ scaleY }} />
      </div>
      <div className="beam__content">{children}</div>
    </div>
  );
}
