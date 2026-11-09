// EDIT THIS FILE with real organizer content. Anything with `placeholder: true` is shown
// as a clearly marked placeholder and must never be presented as confirmed information.

export const festival = {
  name: "TITANIUM 2027",
  college: "Rajalakshmi Engineering College",
  city: "Chennai, India",
  tagline: "BEYOND THE KNOWN.",
  support: "One planet. Infinite possibilities.",
  dates: "[FESTIVAL DATES TO BE ADDED]",
  venue: "[VENUE / CAMPUS ADDRESS TO BE ADDED]",
  email: "[CONTACT EMAIL TO BE ADDED]",
  phone: "[CONTACT PHONE TO BE ADDED]",
  // Set a verified URL to enable registration buttons everywhere. null = "Registration opens soon".
  registrationUrl: null as string | null,
  referenceSite: null as string | null,
  logo: null as string | null, // e.g. "/assets/logos/rec.svg"
  social: [] as { label: string; href: string }[],
  about: [
    "[ABOUT TEXT TO BE ADDED — organizer-approved description of TITANIUM, its goals, audience and experience.]",
  ],
};

export type Category = "technical" | "non-technical" | "experience";

export interface FestEvent {
  slug: string;
  category: Category;
  title: string;
  summary: string;
  date?: string;
  time?: string;
  eligibility?: string;
  fee?: string;
  venue?: string;
  rulesUrl?: string;
  placeholder: boolean;
}

const ph = (n: number, category: Category, label: string): FestEvent => ({
  slug: `${category}-placeholder-${n}`,
  category,
  title: `[${label} ${n} — TITLE TO BE ADDED]`,
  summary: "[Short description to be added by organizers.]",
  date: "[DATE TBA]",
  eligibility: "[TEAM / INDIVIDUAL TBA]",
  fee: "[FEE TBA]",
  placeholder: true,
});

export const events: FestEvent[] = [
  ph(1, "technical", "TECHNICAL EVENT"),
  ph(2, "technical", "TECHNICAL EVENT"),
  ph(3, "technical", "TECHNICAL EVENT"),
  ph(1, "non-technical", "NON-TECHNICAL EVENT"),
  ph(2, "non-technical", "NON-TECHNICAL EVENT"),
  ph(1, "experience", "EXPERIENCE"),
  ph(2, "experience", "EXPERIENCE"),
];

export interface Workshop {
  slug: string;
  title: string;
  summary: string;
  instructor?: string;
  date?: string;
  duration?: string;
  fee?: string;
  capacity?: string;
  placeholder: boolean;
}

export const workshops: Workshop[] = [1, 2, 3].map((n) => ({
  slug: `workshop-placeholder-${n}`,
  title: `[WORKSHOP ${n} — TITLE TO BE ADDED]`,
  summary: "[Short summary to be added by organizers.]",
  instructor: "[INSTRUCTOR TBA]",
  date: "[DATE TBA]",
  duration: "[DURATION TBA]",
  fee: "[FEE TBA]",
  placeholder: true,
}));

export interface ScheduleItem {
  day: string;
  time: string;
  title: string;
  venue?: string;
  category?: Category | "workshop";
  placeholder: boolean;
}

export const schedule: ScheduleItem[] = [
  { day: "Day 1", time: "[TIME TBA]", title: "[SESSION TO BE ADDED]", venue: "[VENUE TBA]", placeholder: true },
  { day: "Day 1", time: "[TIME TBA]", title: "[SESSION TO BE ADDED]", venue: "[VENUE TBA]", placeholder: true },
  { day: "Day 2", time: "[TIME TBA]", title: "[SESSION TO BE ADDED]", venue: "[VENUE TBA]", placeholder: true },
  { day: "Day 2", time: "[TIME TBA]", title: "[SESSION TO BE ADDED]", venue: "[VENUE TBA]", placeholder: true },
];

export interface Sponsor { name: string; logo?: string; href?: string; }
export const sponsors: Sponsor[] = []; // empty until approved logos are supplied

export interface GalleryItem { id: string; caption: string; src?: string; alt?: string; placeholder: boolean; }
export const gallery: GalleryItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: `g${i + 1}`, caption: `[PHOTO ${i + 1} — CAPTION TO BE ADDED]`, placeholder: true,
}));

export interface Speaker { slug: string; name: string; role: string; topic?: string; photo?: string; placeholder: boolean; }
export const speakers: Speaker[] = [1, 2, 3].map((n) => ({
  slug: `speaker-placeholder-${n}`, name: `[SPEAKER ${n} — NAME TO BE ADDED]`, role: "[ROLE / ORGANISATION TBA]", topic: "[TALK TOPIC TBA]", placeholder: true,
}));
