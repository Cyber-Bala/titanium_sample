import { useState } from "react";
import { Link } from "react-router-dom";
import { events, festival, gallery, schedule, speakers, sponsors, workshops } from "../data/festival";
import { destinations } from "../data/navigation";
import { EventCard, Placeholder, RegisterButton, WorkshopCard } from "../components/ui";

/** Destination id -> chapter id, so hub tiles fly the visitor to the station instead of leaving the journey. */
const destToChapter: Record<string, string> = {
  events: "events", workshops: "workshops", gallery: "gallery", speakers: "speakers", experiences: "experience",
  schedule: "schedule", sponsors: "sponsors", about: "about", register: "register",
};

function Schedule() {
  const days = [...new Set(schedule.map((s) => s.day))];
  const [day, setDay] = useState("All");
  const rows = schedule.filter((s) => day === "All" || s.day === day);
  return (
    <>
      <div className="filters" role="group" aria-label="Filter by day">
        {["All", ...days].map((d) => (
          <button key={d} className={`pill ${d === day ? "on" : ""}`} aria-pressed={d === day} onClick={() => setDay(d)}>{d}</button>
        ))}
      </div>
      <ol className="timeline">
        {rows.map((s, i) => (
          <li key={i}>
            <span className="mono t-day">{s.day}</span>
            <span className="mono t-time">{s.time}</span>
            <span className="t-title">{s.title} <Placeholder show={s.placeholder} /></span>
            <span className="muted t-venue">{s.venue}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function PanelBody({ id, goto }: { id: string; goto: (chapterId: string) => void }) {
  switch (id) {
    case "hub":
      return (
        <ul className="dest-grid compact">
          {destinations.map((d, i) => (
            <li key={d.id}>
              <button className="dest" onClick={() => goto(destToChapter[d.id])} aria-label={`Fly to ${d.title}`}>
                <img src={`/assets/destinations/${d.icon}.svg`} alt="" width="32" height="32" />
                <span className="mono num">0{i + 1}</span>
                <strong>{d.title}</strong>
                <span className="muted">{d.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      );
    case "events": {
      const tech = events.filter((e) => e.category === "technical").slice(0, 3);
      const non = events.filter((e) => e.category === "non-technical").slice(0, 3);
      return (
        <>
          <p className="mono sub-eyebrow">TECHNICAL EVENTS · Build. Experiment. Compete.</p>
          <div className="panel-grid">{tech.map((e) => <EventCard key={e.slug} e={e} />)}</div>
          <p className="mono sub-eyebrow">BEYOND THE CODE · Challenge your creativity. Test your skills.</p>
          <div className="panel-grid">{non.map((e) => <EventCard key={e.slug} e={e} />)}</div>
        </>
      );
    }
    case "workshops":
      return <div className="panel-grid">{workshops.map((w) => <WorkshopCard key={w.slug} w={w} />)}</div>;
    case "gallery":
      return (
        <ul className="panel-gallery">
          {gallery.map((g) => (
            <li key={g.id}>
              {g.src ? <img src={g.src} alt={g.alt ?? g.caption} loading="lazy" /> : <div className="gallery-ph" role="img" aria-label="Placeholder photo" />}
              <p>{g.caption} <Placeholder show={g.placeholder} /></p>
            </li>
          ))}
        </ul>
      );
    case "speakers":
      return (
        <div className="panel-grid">
          {speakers.map((s) => (
            <article className="card" key={s.slug}>
              <div className="card-top"><span className="mono tag">SPEAKER</span><Placeholder show={s.placeholder} /></div>
              <h3>{s.name}</h3>
              <p>{s.role}</p>
            </article>
          ))}
        </div>
      );
    case "experience": {
      const list = events.filter((e) => e.category === "experience").slice(0, 3);
      return <div className="panel-grid two">{list.map((e) => <EventCard key={e.slug} e={e} />)}</div>;
    }
    case "schedule":
      return <Schedule />;
    case "sponsors":
      return sponsors.length === 0 ? (
        <p className="muted">[SPONSOR LOGOS TO BE ADDED — approved partners will appear here.]</p>
      ) : (
        <ul className="sponsors">
          {sponsors.map((s) => (
            <li key={s.name}>{s.href ? <a href={s.href} target="_blank" rel="noopener noreferrer"><img src={s.logo} alt={s.name} /></a> : <img src={s.logo} alt={s.name} />}</li>
          ))}
        </ul>
      );
    case "about":
      return (
        <>
          {festival.about.map((t, i) => <p key={i} className="body-text">{t}</p>)}
          <p className="muted">{festival.college}, {festival.city} · {festival.dates}</p>
          <p className="muted">{festival.venue}</p>
        </>
      );
    case "register":
      return (
        <div className="btn-row">
          <RegisterButton />
          <Link className="btn btn-ghost" to="/events">EXPLORE EVENTS</Link>
        </div>
      );
    default:
      return null;
  }
}
