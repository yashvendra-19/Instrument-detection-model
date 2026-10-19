// Infinite horizontal scroller (Aceternity "infinite moving cards" idea). Content is duplicated once for a seamless loop.
export default function Marquee({ children, reverse = false, speed = 40, className = "" }) {
  return (
    <div className={`marquee ${className}`}>
      <div className={`marquee__track ${reverse ? "is-reverse" : ""}`} style={{ "--marquee-dur": `${speed}s` }}>
        <div className="marquee__group">{children}</div>
        <div className="marquee__group" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
