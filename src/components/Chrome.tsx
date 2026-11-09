import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { festival } from "../data/festival";
import { navLinks } from "../data/navigation";
import { RegisterButton } from "./ui";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  return (
    <header className={`nav ${solid || open ? "nav-solid" : ""}`}>
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="TITANIUM 2027 home">
          {festival.logo ? <img src={festival.logo} alt="" height="28" /> : <img src="/assets/space/spacecraft.svg" alt="" height="22" width="44" />}
          <span><strong>TITANIUM</strong> 2027</span>
        </Link>
        <nav aria-label="Primary" className="nav-links">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>{l.label}</NavLink>
          ))}
        </nav>
        <Link to="/register" className="btn btn-primary btn-sm nav-cta">Register</Link>
        <button className="burger" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="mobile-menu">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}>{l.label}</NavLink>
          ))}
          <Link to="/register" className="btn btn-primary">Register</Link>
        </nav>
      )}
    </header>
  );
}

export function MobileRegisterBar() {
  const { pathname } = useLocation();
  if (pathname === "/register") return null;
  return (
    <div className="sticky-reg">
      {festival.registrationUrl ? (
        <a className="btn btn-primary" href={festival.registrationUrl} target="_blank" rel="noopener noreferrer">Register</a>
      ) : (
        <Link className="btn btn-primary" to="/register">Register · opens soon</Link>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <p className="brand-big"><strong>TITANIUM</strong> 2027</p>
          <p>{festival.college}</p>
          <p>{festival.city}</p>
          <p className="muted">{festival.venue}</p>
        </div>
        <div>
          <p className="mono eyebrow">EXPLORE</p>
          <ul>
            {navLinks.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
            <li><Link to="/register">Registration</Link></li>
          </ul>
        </div>
        <div>
          <p className="mono eyebrow">CONTACT</p>
          <ul>
            <li className="muted">{festival.email}</li>
            <li className="muted">{festival.phone}</li>
            {festival.social.map((s) => <li key={s.href}><a href={s.href} rel="noopener noreferrer" target="_blank">{s.label}</a></li>)}
            {festival.social.length === 0 && <li className="muted">[SOCIAL LINKS TO BE ADDED]</li>}
          </ul>
        </div>
        <div>
          <p className="mono eyebrow">LEGAL</p>
          <ul>
            <li><Link to="/legal/privacy">Privacy policy</Link></li>
            <li><Link to="/legal/terms">Terms and conditions</Link></li>
            <li><Link to="/legal/accessibility">Accessibility statement</Link></li>
          </ul>
        </div>
      </div>
      <p className="legal mono">© 2027 {festival.college}. All rights reserved.</p>
    </footer>
  );
}

export { RegisterButton };
