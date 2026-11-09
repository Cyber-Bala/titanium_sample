import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { events, festival, gallery, schedule, speakers, sponsors, workshops, type Category } from "../data/festival";
import { destinations } from "../data/navigation";
import JourneyExperience from "../journey/JourneyExperience";
import { EventCard, Placeholder, RegisterButton, SectionHeading, WorkshopCard } from "../components/ui";

const catTitle: Record<Category, { eyebrow: string; title: string; line: string }> = {
  technical: { eyebrow: "DESTINATION 01", title: "TECHNICAL EVENTS", line: "Build. Experiment. Compete." },
  "non-technical": { eyebrow: "DESTINATION 02", title: "BEYOND THE CODE", line: "Challenge your creativity. Test your skills." },
  experience: { eyebrow: "DESTINATION 04", title: "ENTER THE EXPERIENCE", line: "Gaming, installations and demonstrations." },
};

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  document.title = `${title} | TITANIUM 2027`;
  return <main id="main" className="page">{children}</main>;
}

function EventsBlock({ cat, limit }: { cat: Category; limit?: number }) {
  const list = events.filter((e) => e.category === cat).slice(0, limit);
  const h = catTitle[cat];
  return (
    <section className="block" id={cat === "technical" ? "technical-events" : cat === "non-technical" ? "non-technical-events" : "experiences"} aria-labelledby={`h-${cat}`}>
      <SectionHeading eyebrow={h.eyebrow} title={h.title} line={h.line} id={`h-${cat}`} />
      {list.length === 0 ? <p className="muted">No events published yet.</p> : <div className="grid">{list.map((e) => <EventCard key={e.slug} e={e} />)}</div>}
      <p><Link className="more" to={`/events?category=${cat}`}>View all {h.title.toLowerCase()} →</Link></p>
    </section>
  );
}

function ScheduleBlock() {
  const days = [...new Set(schedule.map((s) => s.day))];
  const [day, setDay] = useState<string>("All");
  const rows = schedule.filter((s) => day === "All" || s.day === day);
  return (
    <section className="block" id="schedule" aria-labelledby="h-schedule">
      <SectionHeading eyebrow="DESTINATION 05" title="YOUR EXPEDITION TIMELINE" id="h-schedule" />
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
    </section>
  );
}

function SponsorsBlock() {
  return (
    <section className="block" id="sponsors" aria-labelledby="h-sponsors">
      <SectionHeading eyebrow="DESTINATION 06" title="POWERED BY OUR PARTNERS" id="h-sponsors" />
      {sponsors.length === 0 ? (
        <p className="muted">[SPONSOR LOGOS TO BE ADDED — approved partners will appear here.]</p>
      ) : (
        <ul className="sponsors">
          {sponsors.map((s) => (
            <li key={s.name}>{s.href ? <a href={s.href} target="_blank" rel="noopener noreferrer"><img src={s.logo} alt={s.name} /></a> : <img src={s.logo} alt={s.name} />}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AboutBlock() {
  return (
    <section className="block about" id="about" aria-labelledby="h-about">
      <SectionHeading eyebrow="DESTINATION 07" title="THE MISSION BEHIND TITANIUM" id="h-about" />
      {festival.about.map((t, i) => <p key={i} className="body-text">{t}</p>)}
      <p><Link className="more" to="/about">Read more →</Link></p>
    </section>
  );
}

export function Home() {
  return (
    <main id="main">
      <JourneyExperience>
      <div className="content">
        <section className="block" id="destinations" aria-labelledby="h-dest">
          <SectionHeading eyebrow="FESTIVAL NAVIGATION SYSTEM" title="CHOOSE YOUR DESTINATION" line="Eight waypoints. Every one is a real page." id="h-dest" />
          <ul className="dest-grid">
            {destinations.map((d, i) => (
              <li key={d.id}>
                <Link to={d.href} className="dest">
                  <img src={`/assets/destinations/${d.icon}.svg`} alt="" width="48" height="48" />
                  <span className="mono num">0{i + 1}</span>
                  <strong>{d.title}</strong>
                  <span className="muted">{d.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <EventsBlock cat="technical" limit={3} />
        <EventsBlock cat="non-technical" limit={3} />
        <section className="block" id="workshops" aria-labelledby="h-ws">
          <SectionHeading eyebrow="DESTINATION 03" title="LEARN SOMETHING NEW" line="Hands-on sessions. Practical skills. New possibilities." id="h-ws" />
          <div className="grid">{workshops.map((w) => <WorkshopCard key={w.slug} w={w} />)}</div>
          <p><Link className="more" to="/workshops">View all workshops →</Link></p>
        </section>
        <EventsBlock cat="experience" limit={3} />
        <ScheduleBlock />
        <SponsorsBlock />
        <AboutBlock />
        <section className="final" id="register" aria-labelledby="h-final">
          <p className="mono eyebrow">RETURN TO EARTH</p>
          <h2 id="h-final" className="display">YOUR JOURNEY STARTS HERE.</h2>
          <p className="lead">BE PART OF TITANIUM 2027.</p>
          <div className="btn-row center">
            <RegisterButton />
            <Link className="btn btn-ghost" to="/events">EXPLORE EVENTS</Link>
          </div>
        </section>
      </div>
      </JourneyExperience>
    </main>
  );
}

export function EventsPage() {
  const [sp, setSp] = useSearchParams();
  const cat = (sp.get("category") as Category | null) ?? null;
  const list = useMemo(() => events.filter((e) => !cat || e.category === cat), [cat]);
  const opts: [string, Category | null][] = [["All", null], ["Technical", "technical"], ["Non-technical", "non-technical"], ["Experiences", "experience"]];
  return (
    <Page title="Events">
      <SectionHeading eyebrow="EVENT DIRECTORY" title="EVENTS" line="Find your mission." />
      <div className="filters" role="group" aria-label="Filter by category">
        {opts.map(([l, c]) => (
          <button key={l} className={`pill ${c === cat ? "on" : ""}`} aria-pressed={c === cat} onClick={() => (c ? setSp({ category: c }) : setSp({}))}>{l}</button>
        ))}
      </div>
      <div className="grid">{list.map((e) => <EventCard key={e.slug} e={e} />)}</div>
    </Page>
  );
}

export function EventDetail() {
  const { slug } = useParams();
  const e = events.find((x) => x.slug === slug);
  if (!e) return <NotFound />;
  return (
    <Page title={e.title}>
      <p><Link className="more" to="/events">← All events</Link></p>
      <p className="mono eyebrow">{e.category.toUpperCase()} <Placeholder show={e.placeholder} /></p>
      <h1 className="section-title">{e.title}</h1>
      <p className="body-text">{e.summary}</p>
      <dl className="meta big">
        <dt>Date</dt><dd>{e.date ?? "TBA"}</dd>
        <dt>Time</dt><dd>{e.time ?? "[TIME TBA]"}</dd>
        <dt>Eligibility</dt><dd>{e.eligibility ?? "TBA"}</dd>
        <dt>Fee</dt><dd>{e.fee ?? "TBA"}</dd>
        <dt>Venue</dt><dd>{e.venue ?? festival.venue}</dd>
        <dt>Rules</dt><dd>{e.rulesUrl ? <a href={e.rulesUrl} target="_blank" rel="noopener noreferrer">Rulebook</a> : "[RULES LINK TBA]"}</dd>
      </dl>
      <div className="btn-row"><RegisterButton /></div>
    </Page>
  );
}

export function WorkshopsPage() {
  return (
    <Page title="Workshops">
      <SectionHeading eyebrow="WORKSHOPS" title="LEARN SOMETHING NEW" line="Hands-on sessions. Practical skills. New possibilities." />
      <div className="grid">{workshops.map((w) => <WorkshopCard key={w.slug} w={w} />)}</div>
    </Page>
  );
}

export function GalleryPage() {
  return (
    <Page title="Gallery">
      <SectionHeading eyebrow="GALLERY" title="MOMENTS IN ORBIT" line="Photographs and highlights from the festival floor." />
      <ul className="gallery">
        {gallery.map((g) => (
          <li key={g.id}>
            {g.src ? <img src={g.src} alt={g.alt ?? g.caption} loading="lazy" /> : <div className="gallery-ph" role="img" aria-label="Placeholder photo" />}
            <p>{g.caption} <Placeholder show={g.placeholder} /></p>
          </li>
        ))}
      </ul>
    </Page>
  );
}

export function SpeakersPage() {
  return (
    <Page title="Speakers">
      <SectionHeading eyebrow="SPEAKERS" title="VOICES OF THE FUTURE" line="Talks, keynotes and conversations." />
      <div className="grid">
        {speakers.map((s) => (
          <article className="card" key={s.slug}>
            <div className="card-top"><span className="mono tag">SPEAKER</span><Placeholder show={s.placeholder} /></div>
            <h3>{s.name}</h3>
            <p>{s.role}</p>
            <p>{s.topic}</p>
          </article>
        ))}
      </div>
    </Page>
  );
}

export function SchedulePage() {
  return <Page title="Schedule"><ScheduleBlock /></Page>;
}

export function AboutPage() {
  return (
    <Page title="About">
      <SectionHeading eyebrow="ABOUT" title="THE MISSION BEHIND TITANIUM" />
      {festival.about.map((t, i) => <p key={i} className="body-text">{t}</p>)}
      <h2 className="sub">Venue</h2>
      <p className="body-text">{festival.college}, {festival.city}</p>
      <p className="body-text muted">{festival.venue}</p>
      <h2 className="sub">Dates</h2>
      <p className="body-text muted">{festival.dates}</p>
      <SponsorsBlock />
    </Page>
  );
}

export function RegisterPage() {
  return (
    <Page title="Register">
      <SectionHeading eyebrow="REGISTRATION" title="YOUR JOURNEY STARTS HERE." line="Be part of TITANIUM 2027." />
      {festival.registrationUrl ? (
        <p className="body-text">Registration is handled on a verified external page.</p>
      ) : (
        <div className="notice" role="status">
          <strong>Registration opens soon.</strong>
          <p>The official registration link has not been supplied yet. Set <code>registrationUrl</code> in <code>src/data/festival.ts</code> to enable it.</p>
        </div>
      )}
      <div className="btn-row"><RegisterButton /><Link className="btn btn-ghost" to="/events">EXPLORE EVENTS</Link></div>
    </Page>
  );
}

export function Legal() {
  const { doc } = useParams();
  const t = doc === "terms" ? "Terms and conditions" : doc === "accessibility" ? "Accessibility statement" : "Privacy policy";
  return (
    <Page title={t}>
      <SectionHeading eyebrow="LEGAL" title={t.toUpperCase()} />
      <p className="body-text muted">[{t.toUpperCase()} TEXT TO BE SUPPLIED BY THE COLLEGE.]</p>
    </Page>
  );
}

export function NotFound() {
  return (
    <Page title="Lost in space">
      <SectionHeading eyebrow="404" title="SIGNAL LOST" line="That page does not exist." />
      <Link className="btn btn-primary" to="/">Return to Earth</Link>
    </Page>
  );
}
