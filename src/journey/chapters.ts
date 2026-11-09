import { events, schedule, workshops } from "../data/festival";

export interface Chapter {
  id: string;
  model: string; // glb in /assets/models
  number: string;
  label: string;
  title: string;
  body: string;
  href: string;
  action: string;
  wide?: boolean;
  side: 1 | -1; // which side of the route the 3D station sits on (copy sits opposite)
  items: { label: string; href: string; placeholder?: boolean }[];
}

const ev = (c: string) =>
  events.filter((e) => e.category === c).slice(0, 3).map((e) => ({ label: e.title, href: `/events/${e.slug}`, placeholder: e.placeholder }));

export const chapters: Chapter[] = [
  {
    wide: true, id: "hub", model: "hub", number: "01", label: "THE HUB", title: "CHOOSE YOUR DESTINATION",
    body: "Eight waypoints. Click one and the expedition flies you there.",
    href: "/about", action: "About the festival", side: 1, items: [],
  },
  {
    wide: true, id: "events", model: "arena", number: "02", label: "THE ARENA", title: "BUILT TO CHALLENGE",
    body: "Technical and non-technical competitions. Build. Experiment. Compete.",
    href: "/events", action: "All events", side: -1, items: [...ev("technical"), ...ev("non-technical")].slice(0, 3),
  },
  {
    wide: true, id: "workshops", model: "forge", number: "03", label: "THE FORGE", title: "LEARN BY MAKING",
    body: "Hands-on sessions. Practical skills. New possibilities.",
    href: "/workshops", action: "All workshops", side: 1,
    items: workshops.slice(0, 3).map((w) => ({ label: w.title, href: "/workshops", placeholder: w.placeholder })),
  },
  {
    wide: true, id: "gallery", model: "gallery", number: "04", label: "THE GALLERY", title: "MOMENTS IN ORBIT",
    body: "Photographs and highlights from the festival floor.",
    href: "/gallery", action: "Open the gallery", side: -1, items: [],
  },
  {
    wide: true, id: "speakers", model: "assembly", number: "05", label: "THE ASSEMBLY", title: "VOICES OF THE FUTURE",
    body: "Talks, keynotes and conversations moving technology forward.",
    href: "/speakers", action: "Meet the speakers", side: 1, items: [],
  },
  {
    id: "experience", model: "experience", number: "06", label: "THE PORTAL", title: "ENTER THE EXPERIENCE",
    body: "Gaming, installations and demonstrations you step into.",
    href: "/events?category=experience", action: "Explore experiences", side: -1, items: ev("experience"),
  },
  {
    wide: true, id: "schedule", model: "timeline", number: "07", label: "THE TIMELINE", title: "YOUR EXPEDITION TIMELINE",
    body: "Every session, every arena, day by day.",
    href: "/schedule", action: "View schedule", side: 1,
    items: schedule.slice(0, 3).map((s) => ({ label: `${s.day} · ${s.time} · ${s.title}`, href: "/schedule", placeholder: s.placeholder })),
  },
  {
    id: "sponsors", model: "partners", number: "08", label: "THE PARTNERS", title: "POWERED BY OUR PARTNERS",
    body: "The organisations that make the expedition possible.",
    href: "/#sponsors", action: "See partners", side: -1, items: [],
  },
  {
    id: "about", model: "about", number: "09", label: "THE MISSION", title: "THE MISSION BEHIND TITANIUM",
    body: "Rajalakshmi Engineering College, Chennai. A festival of technology, innovation and imagination.",
    href: "/about", action: "Read the mission", side: 1, items: [],
  },
  {
    id: "register", model: "gateway", number: "10", label: "THE GATEWAY", title: "YOUR JOURNEY STARTS HERE.",
    body: "Be part of TITANIUM 2027.",
    href: "/register", action: "Register", side: -1, items: [],
  },
];

/** Journey progress layout (0..1). Space phase first, then ten stations along the route. */
export const SPACE_END = 0.2;
export const beats = {
  hero: [0, 0.03],
  launch: [0.045, 0.08],
  approach: [0.09, 0.135],
  entry: [0.15, 0.178],
  descent: [0.225, 0.3],
} as const;

export const FIRST = 0.335;
export const LAST = 0.95;
export const stationCenter = (i: number) => FIRST + ((LAST - FIRST) * i) / (chapters.length - 1);
export const stationHalf = ((LAST - FIRST) / (chapters.length - 1)) * 0.4;
export const stationSpan = (LAST - FIRST) / (chapters.length - 1);
