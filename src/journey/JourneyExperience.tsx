import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { festival } from "../data/festival";
import { useJourneyMode } from "../hooks";
import type { SceneHandle } from "./scene";
import { beats, chapters, SPACE_END, stationCenter, stationHalf, stationSpan } from "./chapters";
import PanelBody from "./PanelBody";
import type { ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

const STORAGE = "titanium-static";

const fade = (p: number, [a, b]: readonly [number, number], edge = 0.012) => {
  if (p < a - edge || p > b + edge) return 0;
  if (p < a) return (p - (a - edge)) / edge;
  if (p > b) return 1 - (p - b) / edge;
  return 1;
};

export default function JourneyExperience({ children }: { children?: ReactNode }) {
  const [forceStatic, setForceStatic] = useState(() => {
    try { return localStorage.getItem(STORAGE) === "1"; } catch { return false; }
  });
  const mode = useJourneyMode(forceStatic);
  if (mode === "static") {
    return (
      <>
        <JourneyStatic
          canEnable={forceStatic}
          onEnable={() => {
            try { localStorage.removeItem(STORAGE); } catch { /* ignore */ }
            setForceStatic(false);
          }}
        />
        {children}
      </>
    );
  }
  return (
    <Journey
      mode={mode}
      onDisable={() => {
        try { localStorage.setItem(STORAGE, "1"); } catch { /* ignore */ }
        setForceStatic(true);
      }}
    />
  );
}

function Journey({ mode, onDisable }: { mode: "full" | "lite"; onDisable: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const beatEls = useRef<Record<string, HTMLDivElement | null>>({});
  const panelEls = useRef<(HTMLElement | null)[]>([]);
  const railEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [pct, setPct] = useState(0);
  const heightVh = mode === "lite" ? 1700 : 2600;

  const scrollToP = (P: number) => {
    const el = wrap.current;
    if (!el) return;
    const top = el.offsetTop + P * (el.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    if (!canvas.current || !wrap.current) return;
    let handle: SceneHandle | null = null;
    let dead = false;
    const el = canvas.current;
    let currentId = "";
    const names = ["DEEP SPACE", "LAUNCH", "EARTH APPROACH", "ATMOSPHERIC ENTRY"];

    const st = ScrollTrigger.create({
      trigger: wrap.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        handle?.setProgress(p);
        for (const [k, range] of Object.entries(beats)) {
          const be = beatEls.current[k];
          if (!be) continue;
          const o = fade(p, range);
          be.style.opacity = String(o);
          be.style.transform = `translateY(calc(-50% + ${(1 - o) * 18}px))`;
          be.style.visibility = o > 0.01 ? "visible" : "hidden";
          be.style.pointerEvents = o > 0.6 ? "auto" : "none";
        }
        let active = -1;
        chapters.forEach((c, i) => {
          const centre = stationCenter(i);
          const pe = panelEls.current[i];
          if (pe) {
            const o = fade(p, [Math.max(centre - stationHalf, SPACE_END + 0.0), centre + stationHalf], 0.012);
            pe.style.opacity = String(o);
            pe.style.transform = `translateY(calc(-50% + ${(1 - o) * 24}px))`;
            pe.style.visibility = o > 0.01 ? "visible" : "hidden";
            pe.style.pointerEvents = o > 0.6 ? "auto" : "none";
          }
          if (Math.abs(p - centre) < stationSpan / 2) active = i;
        });
        railEls.current.forEach((b, i) => {
          b?.classList.toggle("on", i === active);
          b?.setAttribute("aria-current", String(i === active));
        });
        const id = active >= 0 ? chapters[active].id : "";
        if (id !== currentId) {
          currentId = id;
          if (id) history.replaceState(null, "", `#${id}`);
        }
        if (hint.current) hint.current.style.display = p > 0.02 ? "none" : "";
        if (bar.current) bar.current.style.transform = `scaleX(${p})`;
        if (label.current) {
          label.current.textContent =
            active >= 0 ? `${chapters[active].number} / ${chapters[active].label}` : p < SPACE_END ? names[Math.min(3, Math.floor((p / SPACE_END) * 4))] : "EXPEDITION ROUTE";
        }
        // cloud whiteout bridging space -> route
        const w = Math.max(0, 1 - Math.abs(p - SPACE_END) / 0.022);
        if (flash.current) flash.current.style.opacity = String(Math.min(1, w * 1.15));
      },
    });

    import("./scene")
      .then(({ createScene }) => {
        if (dead) return;
        handle = createScene(el, {
          low: mode === "lite",
          onProgress: (n) => setPct(Math.round(n * 100)),
          onReady: () => {
            setReady(true);
            handle?.setProgress(st.progress);
            const hash = window.location.hash.slice(1);
            const idx = chapters.findIndex((c) => c.id === hash);
            if (idx >= 0) window.setTimeout(() => scrollToP(stationCenter(idx)), 200);
          },
        });
        handle.setProgress(st.progress);
      })
      .catch(() => onDisable());
    const safety = window.setTimeout(() => setReady(true), 8000);
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    return () => {
      dead = true;
      window.clearTimeout(safety);
      window.removeEventListener("load", refresh);
      st.kill();
      handle?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const skip = () => document.querySelector(".footer")?.scrollIntoView({ behavior: "smooth" });
  const gotoChapter = (cid: string) => {
    const i = chapters.findIndex((c) => c.id === cid);
    if (i >= 0) scrollToP(stationCenter(i));
  };
  const b = (k: string) => (el: HTMLDivElement | null) => { beatEls.current[k] = el; };

  return (
    <div ref={wrap} id="journey" className="journey" style={{ height: `${heightVh}vh` }}>
      <div className="stage">
        <canvas ref={canvas} className="stage-canvas" aria-hidden="true" />
        <div ref={flash} className="stage-flash" aria-hidden="true" />

        {!ready && (
          <div className="loader" role="status">
            <span className="mono">PREPARING EXPEDITION · {pct}%</span>
            <strong>TITANIUM 2027</strong>
            <div className="loader-bar"><i style={{ width: `${pct}%` }} /></div>
            <button className="btn btn-ghost" onClick={() => setReady(true)}>Skip intro</button>
          </div>
        )}

        <div className="beat beat-hero" ref={b("hero")} style={{ opacity: 1 }}>
          <p className="eyebrow">RAJALAKSHMI ENGINEERING COLLEGE PRESENTS</p>
          <h1 className="hero-title"><span>TITANIUM</span><span className="accent">2027</span></h1>
          <p className="hero-tag">{festival.tagline}</p>
          <p className="lead">A journey into technology, innovation and imagination.</p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => scrollToP(0.1)}>BEGIN EXPEDITION</button>
            <Link className="btn btn-ghost" to="/events">EXPLORE EVENTS</Link>
          </div>
        </div>

        <div className="beat beat-center" ref={b("launch")}>
          <p className="mono big-mono">MISSION INITIALIZED</p>
          <p className="mono">DESTINATION: EARTH</p>
          <p className="mono">COURSE: TITANIUM 2027</p>
        </div>
        <div className="beat beat-left" ref={b("approach")}>
          <h2 className="display">ONE PLANET.<br />INFINITE POSSIBILITIES.</h2>
          <p className="lead">A new journey begins here.</p>
        </div>
        <div className="beat beat-center" ref={b("entry")}>
          <p className="mono big-mono">ENTERING ATMOSPHERE</p>
          <h2 className="display small">WELCOME TO THE TITANIUM EXPEDITION</h2>
        </div>

        <div className="beat beat-center" ref={b("descent")}>
          <p className="mono big-mono">ROLL OUT</p>
          <h2 className="display small">ENTERING THE CITY</h2>
        </div>

        {chapters.map((c, i) => (
          <section
            key={c.id}
            ref={(el) => { panelEls.current[i] = el; }}
            className={`panel ${c.side === 1 ? "panel-left" : "panel-right"} ${c.wide ? "panel-wide" : ""}`}
            aria-label={c.label}
            style={{ visibility: "hidden", opacity: 0 }}
          >
            <p className="mono eyebrow">{c.number} / {c.label}</p>
            <h2 className="panel-title">{c.title}</h2>
            <p className="lead">{c.body}</p>
            <PanelBody id={c.id} goto={gotoChapter} />
            {c.id !== "register" && c.id !== "hub" && (
              <div className="btn-row">
                <Link className="btn btn-ghost btn-sm" to={c.href}>{c.action} →</Link>
              </div>
            )}
          </section>
        ))}

        <nav className="rail" aria-label="Expedition chapters">
          {chapters.map((c, i) => (
            <button key={c.id} ref={(el) => { railEls.current[i] = el; }} onClick={() => scrollToP(stationCenter(i))} aria-label={`Go to ${c.label.toLowerCase()}`}>
              <span className="rail-dot" />
              <span className="rail-label mono">{c.label}</span>
            </button>
          ))}
        </nav>

        <div className="hud">
          <div className="hud-line"><div ref={bar} className="hud-fill" /></div>
          <span ref={label} className="mono">DEEP SPACE</span>
          <span className="hud-spacer" />
          <button className="btn-text mono" onClick={onDisable}>Lite mode</button>
          <button className="btn-text mono" onClick={skip}>Skip journey</button>
        </div>
        <p ref={hint} className="scroll-hint mono" aria-hidden="true">SCROLL TO LAUNCH</p>
      </div>
    </div>
  );
}

function JourneyStatic({ canEnable, onEnable }: { canEnable: boolean; onEnable: () => void }) {
  return (
    <section id="journey" className="static-hero" aria-label="TITANIUM 2027 introduction">
      <img className="static-stars" src="/assets/space/starfield.svg" alt="" aria-hidden="true" />
      <div className="static-earth" aria-hidden="true" />
      <img className="static-ship" src="/assets/space/spacecraft-render.png" alt="Original exploration spacecraft flying toward Earth" width="1000" height="500" />
      <div className="static-copy">
        <p className="eyebrow">RAJALAKSHMI ENGINEERING COLLEGE PRESENTS</p>
        <h1 className="hero-title"><span>TITANIUM</span><span className="accent">2027</span></h1>
        <p className="hero-tag">{festival.tagline}</p>
        <p className="lead">A journey into technology, innovation and imagination.</p>
        <div className="btn-row">
          <a className="btn btn-primary" href="#destinations">BEGIN EXPEDITION</a>
          <Link className="btn btn-ghost" to="/events">EXPLORE EVENTS</Link>
        </div>
        {canEnable && <button className="btn-text mono" onClick={onEnable}>Enable 3D journey</button>}
      </div>
    </section>
  );
}
