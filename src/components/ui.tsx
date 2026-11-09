import { Link } from "react-router-dom";
import type { FestEvent, Workshop } from "../data/festival";
import { festival } from "../data/festival";

export function RegisterButton({ className = "btn btn-primary", label = "REGISTER NOW" }: { className?: string; label?: string }) {
  if (festival.registrationUrl) {
    return <a className={className} href={festival.registrationUrl} target="_blank" rel="noopener noreferrer">{label}</a>;
  }
  return (
    <span className="reg-pending">
      <button className={className} disabled aria-disabled="true" title="Registration opens soon">{label}</button>
      <span className="mono reg-note">Registration opens soon</span>
    </span>
  );
}

export function SectionHeading({ eyebrow, title, line, id }: { eyebrow?: string; title: string; line?: string; id?: string }) {
  return (
    <header className="section-heading">
      {eyebrow && <p className="mono eyebrow">{eyebrow}</p>}
      <h2 id={id} className="section-title">{title}</h2>
      {line && <p className="lead">{line}</p>}
    </header>
  );
}

export function Placeholder({ show }: { show: boolean }) {
  return show ? <span className="chip chip-amber">PLACEHOLDER</span> : null;
}

export function EventCard({ e }: { e: FestEvent }) {
  return (
    <article className="card">
      <div className="card-top">
        <span className="mono tag">{e.category.replace("-", " ").toUpperCase()}</span>
        <Placeholder show={e.placeholder} />
      </div>
      <h3>{e.title}</h3>
      <p>{e.summary}</p>
      <dl className="meta">
        {e.date && (<><dt>Date</dt><dd>{e.date}</dd></>)}
        {e.eligibility && (<><dt>Who</dt><dd>{e.eligibility}</dd></>)}
        {e.fee && (<><dt>Fee</dt><dd>{e.fee}</dd></>)}
      </dl>
      <div className="btn-row">
        <Link className="btn btn-ghost btn-sm" to={`/events/${e.slug}`}>View details</Link>
        <RegisterButton className="btn btn-primary btn-sm" label="Register" />
      </div>
    </article>
  );
}

export function WorkshopCard({ w }: { w: Workshop }) {
  return (
    <article className="card">
      <div className="card-top">
        <span className="mono tag">WORKSHOP</span>
        <Placeholder show={w.placeholder} />
      </div>
      <h3>{w.title}</h3>
      <p>{w.summary}</p>
      <dl className="meta">
        {w.instructor && (<><dt>Instructor</dt><dd>{w.instructor}</dd></>)}
        {w.date && (<><dt>Date</dt><dd>{w.date}</dd></>)}
        {w.duration && (<><dt>Duration</dt><dd>{w.duration}</dd></>)}
        {w.fee && (<><dt>Fee</dt><dd>{w.fee}</dd></>)}
      </dl>
      <div className="btn-row">
        <RegisterButton className="btn btn-primary btn-sm" label="Register" />
      </div>
    </article>
  );
}
