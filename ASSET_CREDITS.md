# Asset credits
| Asset | Type | Source / licence |
|---|---|---|
| public/assets/models/spacecraft.glb + 10 station GLBs (hub, arena, forge, gallery, assembly, experience, timeline, partners, about, gateway) | generated | `tools/build_world.py`, Blender 5.2, original designs, Draco-compressed (~550 KB total) |
| public/assets/models/titanium-text.glb | supplied | TITANIUM 3D wordmark from the project's own earlier site (`frontend/public/TITANIUM.glb`) |
| public/assets/space/spacecraft-render.png | generated | Blender render of the same spacecraft (static/mobile hero) |
| public/assets/tex/earth_*.jpg/png | sourced | three.js `examples/textures/planets` (r167, MIT licence); Earth imagery derived from NASA public-domain data. Re-confirm before production use. |
| public/assets/space/*.svg, destinations/*.svg | generated | supplied asset pack + two added icons (gallery, speakers) |
| public/draco/* | sourced | three.js Draco decoder (Apache-2.0) |
| Fonts | sourced | Google Fonts: Space Grotesk, Inter, JetBrains Mono (OFL) |
| public/assets/models/robot.glb (unused now) | sourced | "RobotExpressive" by Tomas Laulhe, CC0, from three.js examples (r167). Generic robot; not a Transformers character. |
| Nebula sky | procedural | GLSL shader in `src/journey/scene.ts` |
| public/assets/models/titan.glb | generated | Original transforming mech-vehicle ("TITAN"), `tools/build_world.py`. One glTF clip per part animates robot to vehicle. Not a Transformers character or design. |
| City (buildings, road, traffic, clouds) | procedural | `src/journey/city.ts` |
| public/assets/tex/venice_sunset_1k.hdr, asphalt_02_*_1k.jpg, concrete_floor_02_diff_1k.jpg | sourced | Poly Haven (polyhaven.com), CC0 |
