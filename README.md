# TITANIUM 2027 - Space Expedition Website

Vite + React + TypeScript, GSAP ScrollTrigger, Three.js.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # http://localhost:4173
```
Rebuild Blender assets (Blender 5.x): `blender -b -P tools/build_world.py -- [spacecraft hub arena forge gallery assembly experience timeline partners about gateway titan] [--preview]`
Browser smoke test (Chrome + `npm run preview`): `OUT=../shots node tools/shots.mjs` and `OUT=../shots PTS=0,0.3,0.5 node tools/voyage.mjs`

## Journey
Space (hero, launch, Earth, atmosphere) -> cloud whiteout -> descent into a procedural city -> drive down an avenue stopping at ten stations (hub, events, workshops, gallery, speakers, experiences, schedule, sponsors, about, register). The original transforming vehicle "TITAN" becomes a robot at each stop. See `STORYBOARD.md`, `ASSET_CREDITS.md`.
Modes: full (desktop) / lite (tablet) / static (mobile, reduced-motion, no WebGL, or "Lite mode" button).

## Content
Edit `src/data/festival.ts` and `src/data/navigation.ts`. Items with `placeholder: true` show a PLACEHOLDER chip. Set `registrationUrl` to enable Register buttons.
Still needed: dates, venue, contacts, socials, logo, real events/workshops/schedule/speakers/gallery/sponsors, about and legal text.
