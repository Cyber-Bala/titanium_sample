import { useEffect, useState } from "react";

export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    h();
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return m;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

export type Mode = "full" | "lite" | "static";

/** full = desktop 3D, lite = tablet reduced 3D, static = mobile / reduced-motion / no WebGL / user opt-out */
export function useJourneyMode(forceStatic: boolean): Mode {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const mobile = useMedia("(max-width: 767px)");
  const tablet = useMedia("(max-width: 1099px)");
  if (forceStatic || reduced || mobile || !hasWebGL()) return "static";
  return tablet ? "lite" : "full";
}
