# Storyboard (one continuous scroll: 2600vh desktop, 1700vh tablet)
Progress P = 0..1 over the pinned stage. Space phase P<0.2, route phase P>=0.2.
| P | Scene |
|---|---|
| 0-0.03 | Hero: title, tagline, spacecraft in deep space, small Earth |
| 0.045-0.08 | Launch: MISSION INITIALIZED / DESTINATION: EARTH / COURSE: TITANIUM 2027 |
| 0.09-0.135 | Earth approach: ONE PLANET. INFINITE POSSIBILITIES. |
| 0.15-0.178 | Atmospheric entry, then cloud whiteout at P=0.2 (hides the swap to the route scene) |
| 0.2-1.0 | Expedition route low above Earth. Camera chases the spacecraft along a Catmull-Rom spline; smootherstep between stations gives a dwell at each: 01 Hub, 02 Arena (events), 03 Forge (workshops), 04 Gallery, 05 Assembly (speakers), 06 Portal (experiences), 07 Timeline (schedule), 08 Partners (sponsors), 09 Mission (about), 10 Gateway (register) |
Each station has a copy panel (opposite side to the 3D model), real links to its page, and a rail button for direct jump. URL hash follows the active chapter (`#events`, `#gateway`...).
Below the journey: destination grid and the full content sections (direct mode). Mobile / reduced-motion / no-WebGL get the static hero + those sections.

## Districts (route phase)
Winding road (S-curves, 60-100 degree bends) with a distinct district per station: 01 downtown hub, 02 stadium plaza (cool blue), 03 foundry (orange industrial, chimneys, containers), 04 gardens (park, trees), 05 harbor (road rises into a bridge over water), 06 neon entertainment (magenta), 07 glass tech quarter (teal), 08 finance (gold), 09 campus (green, low-rise), 10 waterfront gateway at sunset. Fog, sun colour and building tint blend between districts.
