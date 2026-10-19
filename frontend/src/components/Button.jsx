import { Link } from "react-router-dom";

/** variant: primary | glass | ghost · size: sm | md | lg · pass `to` for an internal link, `href` for external. */
export default function Button({ variant = "glass", size = "md", to, href, loading = false, icon, children, className = "", ...rest }) {
  const cls = `btn btn--${variant} btn--${size} ${loading ? "is-loading" : ""} ${className}`;
  const inner = (
    <>
      {variant === "primary" && <span className="btn__shine" aria-hidden="true" />}
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
      <span className="btn__label">{children}</span>
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} target="_blank" rel="noreferrer" {...rest}>{inner}</a>;
  return <button type="button" className={cls} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>{inner}</button>;
}
