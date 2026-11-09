export interface Destination {
  id: string;
  title: string;
  blurb: string;
  href: string; // route or hash
  icon: string;
}

export const destinations: Destination[] = [
  { id: "events", title: "Events", blurb: "Technical and non-technical competitions.", href: "/events", icon: "technical-events" },
  { id: "workshops", title: "Workshops", blurb: "Hands-on sessions. Practical skills.", href: "/workshops", icon: "workshops" },
  { id: "gallery", title: "Gallery", blurb: "Moments from the festival floor.", href: "/gallery", icon: "gallery" },
  { id: "speakers", title: "Speakers", blurb: "Voices of the future.", href: "/speakers", icon: "speakers" },
  { id: "experiences", title: "Gaming & Experiences", blurb: "Enter the experience.", href: "/events?category=experience", icon: "gaming" },
  { id: "schedule", title: "Schedule", blurb: "Your expedition timeline.", href: "/schedule", icon: "schedule" },
  { id: "sponsors", title: "Sponsors", blurb: "Powered by our partners.", href: "/#sponsors", icon: "sponsors" },
  { id: "about", title: "About", blurb: "The mission behind TITANIUM.", href: "/about", icon: "about" },
  { id: "register", title: "Registration", blurb: "Secure your seat.", href: "/register", icon: "registration" },
];

export const navLinks = [
  { label: "Home", to: "/" },
  { label: "Events", to: "/events" },
  { label: "Workshops", to: "/workshops" },
  { label: "Schedule", to: "/schedule" },
  { label: "Gallery", to: "/gallery" },
  { label: "Speakers", to: "/speakers" },
  { label: "About", to: "/about" },
];
