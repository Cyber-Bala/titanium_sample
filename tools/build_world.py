"""TITANIUM 2027 world builder (Blender 5.x, headless).

  blender -b -P tools/build_world.py -- [only_name ...] [--preview]

Exports Draco GLBs to public/assets/models/. Conventions:
  spacecraft: nose +X, origin at hull centre.
  stations:   front faces Blender -Y (glTF +Z), base at z=0, origin centre of footprint.
Named nodes starting with "spin_" are kept separate so the web scene can animate them.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets", "models")
PREVIEW = os.path.join(ROOT, "..", "shots", "models")
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
want = [a for a in argv if not a.startswith("--")]
do_preview = "--preview" in argv

# ----------------------------------------------------------------- materials
_mats = {}


def M(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0, alpha=1.0, coat=0.0):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.1
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    _mats[name] = m
    return m


def palette():
    return dict(
        hull=M("Hull", (0.80, 0.84, 0.88), 0.55, 0.28, coat=0.6),
        hull2=M("HullWarm", (0.72, 0.74, 0.76), 0.65, 0.38),
        graphite=M("Graphite", (0.07, 0.08, 0.11), 0.75, 0.36),
        steel=M("Steel", (0.55, 0.58, 0.62), 1.0, 0.25),
        dark=M("DarkPanel", (0.015, 0.02, 0.03), 0.4, 0.5),
        chrome=M("Chrome", (0.9, 0.92, 0.95), 1.0, 0.08),
        glass=M("Glass", (0.02, 0.09, 0.14), 0.0, 0.04, (0.05, 0.35, 0.55), 0.8),
        cyan=M("Cyan", (0.15, 0.8, 0.95), 0.0, 0.3, (0.22, 0.78, 0.91), 4.0),
        ice=M("Ice", (0.55, 0.85, 1.0), 0.0, 0.3, (0.55, 0.85, 1.0), 3.0),
        amber=M("Amber", (0.95, 0.7, 0.4), 0.0, 0.3, (0.95, 0.65, 0.28), 4.0),
        white=M("WhiteLight", (1, 1, 1), 0.0, 0.3, (1, 1, 1), 5.0),
        rubber=M("Rubber", (0.02, 0.02, 0.025), 0.0, 0.85),
        screen=M("Screen", (0.02, 0.06, 0.1), 0.0, 0.2, (0.1, 0.45, 0.8), 1.2),
        screen2=M("Screen2", (0.06, 0.03, 0.02), 0.0, 0.2, (0.9, 0.5, 0.2), 0.9),
        concrete=M("Concrete", (0.25, 0.27, 0.3), 0.0, 0.8),
    )


# ------------------------------------------------------------------- helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()


def link(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def new_mesh(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    link(o)
    if mat:
        me.materials.append(mat)
    return o


def _finish(o, mat, bevel, smooth=True):
    if mat:
        o.data.materials.clear()
        o.data.materials.append(mat)
    bpy.context.view_layer.objects.active = o
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        md = o.modifiers.new("bv", "BEVEL")
        md.width = bevel
        md.segments = 2
        md.limit_method = "ANGLE"
        md.angle_limit = math.radians(35)
        bpy.ops.object.modifier_apply(modifier="bv")
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def box(name, loc, dim, mat, rot=(0, 0, 0), bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = dim
    return _finish(o, mat, bevel, smooth=False if bevel == 0 else True)


def cyl(name, loc, r, h, mat, rot=(0, 0, 0), seg=32, bevel=0.0, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return _finish(o, mat, bevel)


def sph(name, loc, r, mat, scale=(1, 1, 1), seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    return _finish(o, mat, 0)


def torus(name, loc, major, minor, mat, rot=(0, 0, 0), ms=64, ns=16, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=ms, minor_segments=ns,
                                     location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    return _finish(o, mat, 0)


def prism(name, pts, thick, mat, bevel=0.02, z0=0.0):
    """Extrude 2D polygon pts (x,y) by thick along z."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z0)) for x, y in pts]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    vv = [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, thick), verts=vv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = new_mesh(name, bm, mat)
    return _finish(o, mat, bevel)


def loft(name, rings, mat, n=28):
    """rings: list of (x, w, h_top, h_bot, expo). Superellipse sections along X."""
    bm = bmesh.new()
    grid = []
    for (x, w, ht, hb, e) in rings:
        row = []
        for i in range(n):
            a = 2 * math.pi * i / n
            c, s = math.cos(a), math.sin(a)
            y = w * math.copysign(abs(c) ** (2 / e), c)
            hh = ht if s >= 0 else hb
            z = hh * math.copysign(abs(s) ** (2 / e), s)
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for k in range(len(grid) - 1):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((grid[k][i], grid[k][j], grid[k + 1][j], grid[k + 1][i]))
    bm.faces.new(grid[0][::-1])
    bm.faces.new(grid[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = new_mesh(name, bm, mat)
    md = o.modifiers.new("ss", "SUBSURF")
    md.levels = 1
    md.render_levels = 1
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="ss")
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def ring_of(count, radius, fn, start=0.0):
    for i in range(count):
        a = start + 2 * math.pi * i / count
        fn(i, a, radius * math.cos(a), radius * math.sin(a))


def finalize(name, keep_prefix="spin_"):
    """Join meshes by material (except spin_*), export Draco GLB."""
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    groups = {}
    for o in objs:
        if o.name.startswith(keep_prefix):
            continue
        groups.setdefault(o.data.materials[0].name if o.data.materials else "none", []).append(o)
    for key, lst in groups.items():
        for ob in bpy.context.selected_objects:
            ob.select_set(False)
        for o in lst:
            o.select_set(True)
        bpy.context.view_layer.objects.active = lst[0]
        if len(lst) > 1:
            bpy.ops.object.join()
        bpy.context.active_object.name = f"{name}_{key}"
    path = os.path.join(OUT, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_apply=True, export_yup=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                              export_draco_position_quantization=14, export_draco_normal_quantization=10,
                              export_draco_texcoord_quantization=12)
    tris = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == "MESH")
    print(f"EXPORT {name}: {os.path.getsize(path)//1024} KB, ~{tris} polys")
    if do_preview:
        preview(name)


CAMS = {"spacecraft": ((-9, -7, 4), (0, 0, 0), 50), "hub": ((18, -26, 12), (0, 0, 4), 40), "arena": ((18, -22, 14), (0, 0, 4), 40),
        "forge": ((16, -22, 12), (0, 0, 5), 40), "gallery": ((18, -24, 12), (0, 0, 4), 40), "assembly": ((22, -28, 14), (0, 0, 3), 40),
        "experience": ((18, -24, 12), (0, -1, 5), 40), "timeline": ((16, -22, 12), (0, 0, 6), 40), "partners": ((20, -26, 16), (0, 0, 4), 40),
        "about": ((18, -22, 12), (0, 0, 5), 40), "titan": ((14, -20, 7), (0, 0, 4), 40), "gateway": ((20, -26, 12), (0, 0, 7), 40)}


def preview(name):
    cam, target, lens = CAMS[name]
    sc = bpy.context.scene
    names = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    sc.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in names else "BLENDER_EEVEE_NEXT"
    sc.render.resolution_x, sc.render.resolution_y = 960, 540
    sc.render.film_transparent = False
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.03, 0.06, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sc.world = w
    c = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    link(c)
    c.location = cam
    c.rotation_euler = (Vector(target) - Vector(cam)).to_track_quat("-Z", "Y").to_euler()
    c.data.lens = lens
    sc.camera = c
    for loc, e, col in [((10, -12, 14), 1800, (1, 0.97, 0.92)), ((-14, -6, 5), 900, (0.5, 0.8, 1)), ((0, 14, 6), 700, (0.6, 0.7, 1))]:
        ld = bpy.data.lights.new("l", "AREA")
        ld.energy = e
        ld.color = col
        ld.size = 6
        lo = bpy.data.objects.new("l", ld)
        link(lo)
        lo.location = loc
        lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(PREVIEW, name + ".png")
    if name == "spacecraft" and "--render-ship" in argv:
        sc.render.resolution_x, sc.render.resolution_y = 2000, 1000
        sc.render.film_transparent = True
        sc.render.image_settings.color_mode = "RGBA"
        sc.render.filepath = os.path.join(ROOT, "public", "assets", "space", "spacecraft-render.png")
        c.location = (-9.5, -7.5, 4.5)
        c.rotation_euler = (Vector((0, 0, 0)) - Vector(c.location)).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.render.render(write_still=True)


# ================================================================ SPACECRAFT
def spacecraft():
    P = palette()
    # fuselage: lofted superellipse sections, nose +X
    rings = [
        (-3.0, 0.50, 0.42, 0.34, 3.0),
        (-2.6, 0.62, 0.52, 0.40, 2.8),
        (-1.6, 0.74, 0.60, 0.42, 2.6),
        (-0.2, 0.78, 0.66, 0.40, 2.5),
        (1.0, 0.68, 0.58, 0.34, 2.4),
        (2.0, 0.46, 0.40, 0.26, 2.2),
        (2.8, 0.22, 0.20, 0.14, 2.0),
        (3.35, 0.05, 0.05, 0.04, 2.0),
    ]
    loft("Hull", rings, P["hull"])
    # dorsal spine + dark panel inlays
    box("Spine", (-0.6, 0, 0.63), (2.8, 0.34, 0.12), P["hull2"], bevel=0.04)
    box("PanelA", (0.7, 0, 0.545), (1.2, 0.5, 0.03), P["dark"], bevel=0.01)
    for i, x in enumerate([-1.6, -0.9, -0.2, 0.5, 1.2]):
        box(f"Seam{i}", (x, 0, 0.64), (0.02, 0.6, 0.02), P["graphite"], bevel=0)
    # canopy
    sph("Canopy", (1.35, 0, 0.42), 0.5, P["glass"], scale=(1.15, 0.62, 0.42))
    box("CanopyFrame", (1.35, 0, 0.5), (1.5, 0.08, 0.04), P["graphite"], bevel=0.01)
    # swept wings
    for s in (1, -1):
        pts = [(0.5, 0.62 * s), (-0.2, 0.7 * s), (-2.4, 3.0 * s), (-3.0, 3.0 * s), (-2.7, 0.7 * s)]
        if s < 0:
            pts = pts[::-1]
        prism(f"Wing{s}", pts, 0.09, P["graphite"], bevel=0.025, z0=-0.1)
        # wing leading edge strip + panel
        lead = [(0.4, 0.66 * s), (-0.2, 0.75 * s), (-2.35, 3.0 * s), (-2.25, 3.0 * s), (-0.1, 0.75 * s), (0.32, 0.66 * s)]
        if s < 0:
            lead = lead[::-1]
        prism(f"WingEdge{s}", lead, 0.05, P["hull"], bevel=0.01, z0=-0.015)
        # winglet
        pts2 = [(-2.3, 3.0 * s), (-3.0, 3.0 * s), (-3.1, 3.05 * s), (-2.7, 3.05 * s)]
        box(f"Winglet{s}", (-2.7, 3.02 * s, 0.35), (0.7, 0.05, 0.75), P["graphite"], rot=(math.radians(8 * s), 0, math.radians(-10)), bevel=0.02)
        sph(f"Nav{s}", (-2.7, 3.08 * s, 0.7), 0.06, P["cyan"] if s > 0 else P["amber"], seg=12)
        # engine nacelles
        cyl(f"Nacelle{s}", (-2.2, 0.95 * s, -0.02), 0.28, 1.5, P["hull2"], rot=(0, math.radians(90), 0), bevel=0.02)
        cyl(f"Intake{s}", (-1.45, 0.95 * s, -0.02), 0.3, 0.12, P["graphite"], rot=(0, math.radians(90), 0))
        cyl(f"Nozzle{s}", (-3.05, 0.95 * s, -0.02), 0.26, 0.4, P["steel"], rot=(0, math.radians(90), 0), r2=0.3)
        cyl(f"Burn{s}", (-3.26, 0.95 * s, -0.02), 0.2, 0.05, P["cyan"], rot=(0, math.radians(90), 0))
        # pylons
        box(f"Pylon{s}", (-2.0, 0.82 * s, -0.02), (1.1, 0.28, 0.1), P["graphite"], bevel=0.02)
        # underside sensor pods
        cyl(f"Pod{s}", (0.6, 0.45 * s, -0.4), 0.1, 0.5, P["graphite"], rot=(0, math.radians(90), 0))
    # tail fins (twin canted)
    for s in (1, -1):
        box(f"Fin{s}", (-2.3, 0.4 * s, 0.85), (1.3, 0.05, 0.85), P["hull"], rot=(math.radians(-18 * s), 0, math.radians(-12)), bevel=0.02)
        box(f"FinStripe{s}", (-2.55, 0.4 * s + 0.0, 1.1), (0.4, 0.06, 0.1), P["cyan"], rot=(math.radians(-18 * s), 0, math.radians(-12)), bevel=0)
    # central main engine
    cyl("MainEng", (-3.15, 0, 0.02), 0.34, 0.5, P["graphite"], rot=(0, math.radians(90), 0), bevel=0.02)
    cyl("MainNoz", (-3.45, 0, 0.02), 0.3, 0.45, P["steel"], rot=(0, math.radians(90), 0), r2=0.38)
    cyl("MainBurn", (-3.68, 0, 0.02), 0.3, 0.05, P["ice"], rot=(0, math.radians(90), 0))
    # greebles: antenna, rcs thrusters, radiators, nose lights
    cyl("Antenna", (-0.2, 0.3, 0.9), 0.015, 0.55, P["steel"], seg=8)
    sph("AntTip", (-0.2, 0.3, 1.18), 0.04, P["amber"], seg=10)
    rng = random.Random(7)
    for i in range(10):
        x = -2.2 + i * 0.45
        for s in (1, -1):
            box(f"Vent{i}{s}", (x, 0.69 * s * (1 - abs(x) * 0.04), 0.1), (0.16, 0.03, 0.05), P["dark"], bevel=0)
    for s in (1, -1):
        box(f"Rcs{s}", (2.0, 0.42 * s, 0.1), (0.14, 0.05, 0.05), P["graphite"], bevel=0.01)
        box(f"Stripe{s}", (0.2, 0.775 * s, 0.05), (2.4, 0.02, 0.04), P["cyan"], bevel=0)
    box("NoseLight", (3.1, 0, 0.0), (0.2, 0.06, 0.03), P["white"], bevel=0)
    box("BellyPlate", (0.3, 0, -0.4), (2.8, 0.7, 0.04), P["graphite"], bevel=0.02)
    finalize("spacecraft")


# ===================================================================== HUB
def hub():
    P = palette()
    # main ring
    torus("RingOuter", (0, 0, 4), 8.0, 0.8, P["hull"], rot=(math.radians(90), 0, 0), ms=96, ns=24)
    torus("RingTrim", (0, 0.0, 4), 8.0, 0.84, P["graphite"], rot=(math.radians(90), 0, 0), ms=96, ns=6, scale=(1, 0.18, 1))
    torus("RingGlow", (0, -0.7, 4), 7.35, 0.07, P["cyan"], rot=(math.radians(90), 0, 0), ms=96, ns=8)
    torus("RingGlowB", (0, 0.7, 4), 7.35, 0.07, P["ice"], rot=(math.radians(90), 0, 0), ms=96, ns=8)
    # spokes + core
    for i in range(8):
        a = 2 * math.pi * i / 8
        L = 6.4
        cyl(f"Spoke{i}", (math.cos(a) * L / 2, 0, 4 + math.sin(a) * L / 2), 0.13, L, P["steel"], rot=(0, math.pi / 2 - a, 0), seg=10)
    sph("Core", (0, 0, 4), 1.9, P["hull"], scale=(1, 1, 1))
    sph("CoreGlass", (0, -0.9, 4), 1.1, P["glass"], scale=(1, 0.5, 1))
    torus("CoreBand", (0, 0, 4), 1.95, 0.12, P["cyan"], rot=(math.radians(90), 0, 0), ms=48, ns=8)
    # docking arms with beacons
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        x, z = math.cos(a) * 8.0, math.sin(a) * 8.0
        box(f"Dock{i}", (x * 1.12, 0, 4 + z * 1.12), (0.7, 1.0, 0.7), P["graphite"], bevel=0.06)
        sph(f"Beacon{i}", (x * 1.2, 0, 4 + z * 1.2), 0.18, P["amber"], seg=12)
    # solar panels
    for s in (1, -1):
        box(f"PanelFrame{s}", (11.8 * s, 0.3, 4), (3.2, 0.06, 6.0), P["graphite"], bevel=0.04)
        for r in range(3):
            box(f"Cell{s}{r}", (11.8 * s, 0.2, 4 + (r - 1) * 2.0), (3.0, 0.04, 1.8), P["screen"], bevel=0.02)
        box(f"Arm{s}", (9.7 * s, 0.3, 4), (1.6, 0.14, 0.14), P["steel"], bevel=0.02)
    # landing base
    cyl("Base", (0, 0, 0.2), 3.5, 0.4, P["graphite"], bevel=0.04)
    cyl("BaseStem", (0, 0, 1.5), 0.6, 2.2, P["steel"], seg=20)
    torus("BaseGlow", (0, 0, 0.42), 3.0, 0.05, P["cyan"], ms=64, ns=8)
    finalize("hub")
    return dict(cam=(18, -26, 12), target=(0, 0, 4))


# ================================================================== ARENA
def arena():
    P = palette()
    cyl("Base", (0, 0, 0.4), 9.0, 0.8, P["concrete"], bevel=0.05, seg=64)
    for i, (r, h) in enumerate([(8.0, 1.2), (6.6, 2.0), (5.2, 2.8)]):
        cyl(f"Tier{i}", (0, 0, h), r, 0.7, P["hull2"] if i % 2 == 0 else P["graphite"], bevel=0.04, seg=64)
        torus(f"TierGlow{i}", (0, 0, h + 0.36), r - 0.1, 0.05, P["cyan"] if i != 1 else P["amber"], ms=96, ns=8)
    cyl("Floor", (0, 0, 3.3), 4.4, 0.5, P["dark"], bevel=0.02, seg=64)
    torus("FloorRing", (0, 0, 3.58), 3.8, 0.06, P["ice"], ms=64, ns=8)
    torus("FloorRing2", (0, 0, 3.58), 2.2, 0.05, P["cyan"], ms=64, ns=8)
    # truss arches
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        x, y = math.cos(a) * 9.2, math.sin(a) * 9.2
        box(f"Mast{i}", (x, y, 6), (0.45, 0.45, 12), P["steel"], bevel=0.05)
        box(f"Light{i}", (x * 0.92, y * 0.92, 11.8), (1.1, 0.3, 0.5), P["white"], bevel=0.04)
    torus("TrussRing", (0, 0, 12.2), 9.2, 0.18, P["steel"], ms=96, ns=10)
    for i in range(24):
        a = 2 * math.pi * i / 24
        box(f"Truss{i}", (math.cos(a) * 9.2, math.sin(a) * 9.2, 11.7), (0.1, 0.1, 0.9), P["steel"], bevel=0)
    # robot arm
    cyl("ArmBase", (0, 0, 4.0), 0.9, 0.9, P["graphite"], bevel=0.04)
    cyl("ArmJ0", (0, 0, 4.6), 0.5, 0.5, P["hull"], bevel=0.02)
    box("Arm1", (0.9, 0, 6.0), (0.5, 0.5, 3.2), P["hull"], rot=(0, math.radians(-25), 0), bevel=0.06)
    sph("ArmJ1", (1.7, 0, 7.5), 0.45, P["steel"])
    box("Arm2", (2.8, 0, 7.4), (3.0, 0.4, 0.4), P["hull"], rot=(0, math.radians(15), 0), bevel=0.06)
    sph("ArmJ2", (4.3, 0, 7.8), 0.34, P["steel"])
    box("ClawA", (4.9, 0.2, 7.6), (0.9, 0.12, 0.18), P["graphite"], rot=(0, math.radians(-20), 0), bevel=0.02)
    box("ClawB", (4.9, -0.2, 7.6), (0.9, 0.12, 0.18), P["graphite"], rot=(0, math.radians(-20), 0), bevel=0.02)
    sph("ClawCore", (4.65, 0, 7.8), 0.14, P["cyan"], seg=12)
    # steps and banners
    for i in range(3):
        box(f"Stair{i}", (0, -8.6 - i * 0.7, 0.6 + (2 - i) * 0.3), (4.0, 1.0, 0.3 + (2 - i) * 0.25), P["hull2"], bevel=0.04)
    finalize("arena")
    return dict(cam=(18, -22, 14), target=(0, 0, 4))


# =================================================================== FORGE
def forge():
    P = palette()
    cyl("Deck", (0, 0, 0.35), 9.0, 0.7, P["concrete"], bevel=0.05, seg=6)
    box("Bench", (0, -3.2, 1.7), (7.0, 2.2, 0.3), P["steel"], bevel=0.05)
    for sx in (-3.1, 3.1):
        for sy in (-3.9, -2.5):
            box(f"Leg{sx}{sy}", (sx, sy, 0.95), (0.25, 0.25, 1.4), P["graphite"], bevel=0.02)
    # laptop
    box("LapBase", (-2.0, -3.1, 1.9), (1.7, 1.2, 0.08), P["steel"], bevel=0.02)
    box("LapScreen", (-2.0, -3.65, 2.55), (1.7, 0.06, 1.2), P["graphite"], rot=(math.radians(-10), 0, 0), bevel=0.02)
    box("LapDisp", (-2.0, -3.6, 2.55), (1.55, 0.02, 1.05), P["screen"], rot=(math.radians(-10), 0, 0), bevel=0)
    # gears (spin)
    def gear(name, loc, r, teeth, h, mat, rot_dir):
        o = cyl(name, loc, r, h, mat, rot=(math.radians(90), 0, 0), seg=48, bevel=0.03)
        for i in range(teeth):
            a = 2 * math.pi * i / teeth
            t = box(f"{name}_t{i}", (loc[0] + math.cos(a) * (r + 0.18), loc[1], loc[2] + math.sin(a) * (r + 0.18)),
                    (0.38, h, 0.34), mat, rot=(0, -a, 0), bevel=0.02)
        cyl(f"{name}_hub", loc, r * 0.35, h * 1.4, P["graphite"], rot=(math.radians(90), 0, 0), seg=24)
    gear("GearBig", (0, 2.5, 6.5), 3.0, 20, 0.7, P["steel"], 1)
    gear("GearSmall", (4.5, 2.5, 8.9), 1.6, 12, 0.7, P["amber"], -1)
    torus("HeatCore", (0, 2.1, 6.5), 1.5, 0.12, P["amber"], rot=(math.radians(90), 0, 0), ms=48, ns=10)
    box("Frame", (0, 3.4, 4.5), (0.5, 0.5, 9.0), P["graphite"], bevel=0.04)
    box("Frame2", (4.5, 3.4, 5.5), (0.4, 0.4, 7.0), P["graphite"], bevel=0.04)
    # drone
    dz = 5.0
    sph("DroneBody", (-4.2, -1.0, dz), 0.8, P["hull"], scale=(1.1, 1.1, 0.55))
    sph("DroneLens", (-4.2, -1.8, dz), 0.25, P["glass"], scale=(1, 0.6, 1), seg=16)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        x, y = -4.2 + math.cos(a) * 1.8, -1.0 + math.sin(a) * 1.8
        box(f"DArm{i}", (-4.2 + math.cos(a) * 0.9, -1.0 + math.sin(a) * 0.9, dz), (1.8, 0.14, 0.12), P["graphite"], rot=(0, 0, a), bevel=0.02)
        cyl(f"Motor{i}", (x, y, dz + 0.12), 0.2, 0.3, P["steel"], seg=16)
        cyl(f"Rotor{i}", (x, y, dz + 0.32), 1.0, 0.025, P["dark"], seg=40)
        sph(f"DLed{i}", (x, y, dz - 0.05), 0.07, P["cyan"] if i < 2 else P["amber"], seg=10)
    # toolboard, pipes, chimney
    box("Board", (7.4, 0, 3.0), (0.3, 4.0, 4.0), P["graphite"], bevel=0.04)
    for i in range(6):
        box(f"Tool{i}", (7.18, -1.6 + i * 0.65, 3.0 + (i % 2) * 0.6), (0.08, 0.12, 1.2), P["steel"], bevel=0.01)
    cyl("Chimney", (-6.5, 4.0, 3.5), 0.6, 6.0, P["steel"], seg=24, bevel=0.02)
    torus("ChimRing", (-6.5, 4.0, 6.4), 0.65, 0.08, P["amber"], ms=32, ns=8)
    finalize("forge")
    return dict(cam=(16, -22, 12), target=(0, 0, 5))


# ================================================================ GALLERY
def gallery():
    P = palette()
    cyl("Plinth", (0, 0, 0.3), 9.5, 0.6, P["graphite"], bevel=0.04, seg=64)
    torus("PlinthGlow", (0, 0, 0.62), 9.3, 0.05, P["cyan"], ms=96, ns=8)
    n = 7
    for i in range(n):
        a = math.radians(-70 + i * (140 / (n - 1)))  # arc facing -Y
        r = 8.0
        x, y = math.sin(a) * r, math.cos(a) * r * 0.5 + 1.5
        h = 4.6 + (i % 3) * 0.5
        rot = (0, 0, -a * 0.9)
        zc = 3.3 + (i % 3) * 0.25 + (0.6 if i % 2 else 0)
        box(f"Frame{i}", (x, y, zc + 0.6), (3.4, 0.22, h), P["graphite"], rot=rot, bevel=0.05)
        sc = P["screen"] if i % 2 == 0 else P["screen2"]
        dx, dy = math.sin(a) * 0.0, -0.13
        o = box(f"Image{i}", (x + math.sin(-a) * 0 , y - 0.13, zc + 0.6), (3.0, 0.04, h - 0.4), sc, rot=rot, bevel=0)
        box(f"Stand{i}", (x, y + 0.1, (zc + 0.6 - h / 2) / 2 + 0.3), (0.18, 0.18, zc + 0.6 - h / 2 - 0.3), P["steel"], bevel=0.02)
        sph(f"Spot{i}", (x, y - 0.5, zc + 0.6 + h / 2 + 0.35), 0.1, P["white"], seg=10)
    # central sculpture
    cyl("Pedestal", (0, 0.5, 1.0), 1.4, 1.6, P["hull"], bevel=0.06)
    sph("Sculpt", (0, 0.5, 3.4), 1.6, P["chrome"], seg=48)
    torus("spin_SculptRing", (0, 0.5, 3.4), 2.4, 0.07, P["cyan"], rot=(math.radians(70), 0, 0), ms=64, ns=8)
    torus("spin_SculptRing2", (0, 0.5, 3.4), 2.9, 0.05, P["amber"], rot=(math.radians(110), 0, math.radians(30)), ms=64, ns=8)
    finalize("gallery")
    return dict(cam=(18, -24, 12), target=(0, 0, 4))


# =============================================================== ASSEMBLY
def assembly():
    P = palette()
    cyl("Stage", (0, 0, 0.6), 8.0, 1.2, P["hull2"], bevel=0.05, seg=64)
    cyl("StageTop", (0, 0, 1.28), 7.4, 0.16, P["dark"], bevel=0.02, seg=64)
    torus("StageGlow", (0, 0, 1.4), 7.3, 0.06, P["cyan"], ms=96, ns=8)
    cyl("StageGlow2", (0, 0, 1.38), 3.0, 0.03, P["ice"], seg=64)
    for i in range(4):
        box(f"Step{i}", (0, -8.2 - i * 0.7, 0.45 - i * 0.1), (6 - i * 0.6, 0.8, 0.9 - i * 0.2), P["hull2"], bevel=0.04)
    # backdrop arc wall
    for i in range(13):
        a = math.radians(-65 + i * 10)
        x, y = math.sin(a) * 7.5, 6.0 + math.cos(a) * 1.5
        h = 7 + 3 * math.cos(a * 2.0)
        box(f"Slat{i}", (x, y, h / 2 + 1.3), (1.1, 0.4, h), P["graphite"] if i % 2 else P["hull"], rot=(0, 0, -a), bevel=0.04)
        box(f"SlatLight{i}", (x, y - 0.22, h + 1.2), (0.7, 0.05, 0.12), P["cyan"] if i % 3 else P["amber"], rot=(0, 0, -a), bevel=0)
    # podium + mic
    box("Podium", (0, -0.5, 2.2), (1.7, 1.0, 1.8), P["hull"], bevel=0.08)
    box("PodiumTop", (0, -0.55, 3.2), (1.9, 1.15, 0.12), P["graphite"], rot=(math.radians(-8), 0, 0), bevel=0.03)
    cyl("MicStem", (0.3, -0.5, 3.8), 0.03, 1.0, P["steel"], seg=8)
    sph("Mic", (0.3, -0.62, 4.35), 0.09, P["chrome"], seg=14)
    box("PodiumLogo", (0, -1.02, 2.3), (0.9, 0.04, 0.9), P["cyan"], bevel=0)
    # overhead lighting ring
    torus("LightRing", (0, 0, 9.5), 6.5, 0.22, P["steel"], ms=96, ns=12)
    for i in range(16):
        a = 2 * math.pi * i / 16
        sph(f"Spot{i}", (math.cos(a) * 6.5, math.sin(a) * 6.5, 9.2), 0.2, P["white"], seg=10)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        cyl(f"Wire{i}", (math.cos(a) * 6.5, math.sin(a) * 6.5, 11), 0.04, 3.4, P["steel"], seg=6)
    # seating arcs
    for row in range(4):
        r = 11.0 + row * 1.4
        for i in range(15 + row * 2):
            a = math.radians(-100 + i * (200 / (14 + row * 2)))
            x, y = math.sin(a) * r * 0.9, -math.cos(a) * r * 0.55 - 4.0
            box(f"Seat{row}_{i}", (x, y, 0.5 + row * 0.18), (0.8, 0.8, 0.9 + row * 0.2), P["graphite"] if (i + row) % 2 else P["hull2"], rot=(0, 0, -a), bevel=0.08)
    finalize("assembly")
    return dict(cam=(22, -28, 14), target=(0, 0, 3))


# ============================================================= EXPERIENCE
def experience():
    P = palette()
    cyl("Base", (0, 0, 0.3), 8.5, 0.6, P["graphite"], bevel=0.04, seg=64)
    torus("BaseGlow", (0, 0, 0.62), 8.3, 0.05, P["ice"], ms=96, ns=8)
    torus("PortalOuter", (0, 0, 6.5), 5.2, 0.55, P["hull"], rot=(math.radians(90), 0, 0), ms=96, ns=24)
    torus("PortalTrim", (0, 0, 6.5), 4.55, 0.08, P["white"], rot=(math.radians(90), 0, 0), ms=96, ns=8)
    torus("spin_PortalInner", (0, 0, 6.5), 4.1, 0.12, P["cyan"], rot=(math.radians(90), 0, 0), ms=96, ns=10)
    cyl("PortalField", (0, 0, 6.5), 4.0, 0.03, P["glass"], rot=(math.radians(90), 0, 0), seg=64)
    for s in (1, -1):
        box(f"Pylon{s}", (6.6 * s, 0, 3.0), (0.9, 1.0, 5.2), P["graphite"], bevel=0.08)
        box(f"PylonLight{s}", (6.6 * s, -0.52, 3.0), (0.2, 0.04, 4.2), P["cyan"], bevel=0)
        box(f"Foot{s}", (4.6 * s, 0, 1.0), (3.0, 1.6, 0.8), P["hull2"], bevel=0.05)
    # VR headset floating in front
    hz = 4.2
    box("HeadsetBody", (0, -3.8, hz), (2.2, 1.2, 1.2), P["hull"], bevel=0.35)
    box("HeadsetFace", (0, -4.42, hz), (2.1, 0.12, 1.0), P["dark"], bevel=0.05)
    cyl("LensL", (-0.5, -4.5, hz), 0.34, 0.1, P["glass"], rot=(math.radians(90), 0, 0), seg=24)
    cyl("LensR", (0.5, -4.5, hz), 0.34, 0.1, P["glass"], rot=(math.radians(90), 0, 0), seg=24)
    torus("Strap", (0, -2.7, hz), 1.25, 0.12, P["rubber"], rot=(0, math.radians(0), 0), ms=48, ns=10)
    box("Visor", (0, -3.85, hz + 0.65), (2.0, 1.0, 0.04), P["cyan"], bevel=0)
    # floating fragments
    rng = random.Random(3)
    for i in range(22):
        a = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(6.5, 11)
        z = rng.uniform(2, 12)
        s = rng.uniform(0.15, 0.6)
        box(f"Frag{i}", (math.cos(a) * r, math.sin(a) * r * 0.6 + 2, z), (s, s, s), P["steel"] if i % 3 else P["cyan"],
            rot=(rng.random(), rng.random(), rng.random()), bevel=0.02)
    finalize("experience")
    return dict(cam=(18, -24, 12), target=(0, -1, 5))


# =============================================================== TIMELINE
def timeline():
    P = palette()
    cyl("Base", (0, 0, 0.3), 6.5, 0.6, P["graphite"], bevel=0.04, seg=64)
    cyl("Pillar", (0, 0, 2.5), 0.7, 4.0, P["steel"], seg=24)
    sph("Sun", (0, 0, 7.5), 1.3, P["amber"], seg=48)
    sph("SunCore", (0, 0, 7.5), 1.45, P["glass"], seg=32)
    torus("spin_RingA", (0, 0, 7.5), 3.4, 0.14, P["hull"], rot=(math.radians(90), 0, 0), ms=96, ns=16)
    torus("spin_RingB", (0, 0, 7.5), 4.6, 0.12, P["cyan"], rot=(math.radians(60), 0, math.radians(20)), ms=96, ns=16)
    torus("spin_RingC", (0, 0, 7.5), 5.8, 0.18, P["steel"], rot=(math.radians(110), 0, math.radians(-30)), ms=120, ns=16)
    for i in range(12):
        a = 2 * math.pi * i / 12
        box(f"Tick{i}", (math.cos(a) * 6.3, 0, 7.5 + math.sin(a) * 6.3), (0.14, 0.14, 0.6), P["white"], rot=(0, -a + math.pi / 2, 0), bevel=0)
    sph("PlanetA", (3.4, 0, 7.5), 0.35, P["ice"], seg=16)
    sph("PlanetB", (-4.6 * math.cos(0.5), 4.6 * math.sin(0.5) * 0.3, 7.5), 0.28, P["cyan"], seg=16)
    sph("PlanetC", (0, 5.8, 7.5 + 0.0), 0.4, P["steel"], seg=16)
    torus("BaseGlow", (0, 0, 0.62), 6.2, 0.05, P["amber"], ms=64, ns=8)
    finalize("timeline")
    return dict(cam=(16, -22, 12), target=(0, 0, 6))


# ================================================================ PARTNERS
def partners():
    P = palette()
    cyl("Base", (0, 0, 0.4), 9.5, 0.8, P["graphite"], bevel=0.05, seg=6)
    torus("BaseGlow", (0, 0, 0.82), 9.2, 0.05, P["cyan"], ms=6, ns=8)
    rng = random.Random(11)
    pos = [(0, 0)] + [(math.cos(a) * 4.2, math.sin(a) * 4.2) for a in [i * math.pi / 3 for i in range(6)]]
    pos += [(math.cos(a) * 7.4, math.sin(a) * 7.4) for a in [math.pi / 6 + i * math.pi / 3 for i in range(6)]]
    for i, (x, y) in enumerate(pos):
        h = 4 + (rng.random() * 5 if i else 8)
        w = 1.9 if i else 2.4
        box(f"Mono{i}", (x, y, 0.8 + h / 2), (w, w * 0.45, h), P["hull"] if i % 2 else P["graphite"], bevel=0.1)
        box(f"Face{i}", (x, y - w * 0.226, 0.8 + h / 2), (w * 0.7, 0.03, h * 0.82), P["screen"] if i % 3 else P["screen2"], bevel=0)
        box(f"Cap{i}", (x, y, 0.8 + h + 0.05), (w * 1.02, w * 0.47, 0.1), P["cyan"], bevel=0)
    finalize("partners")
    return dict(cam=(20, -26, 16), target=(0, 0, 4))


# ================================================================== ABOUT
def about():
    P = palette()
    cyl("Base", (0, 0, 0.3), 5.5, 0.6, P["graphite"], bevel=0.04, seg=48)
    cyl("Mast", (0, 0, 2.6), 0.5, 4.5, P["steel"], seg=20)
    # dish via flattened sphere (kept full; hollow look via dark inner)
    bm = bmesh.new()
    # revolve profile for parabolic dish
    prof = []
    for i in range(0, 13):
        r = i * 0.5
        prof.append((r, 0.09 * r * r - 0.0))
    segs = 48
    rings = []
    for (r, z) in prof:
        rings.append([bm.verts.new((math.cos(2 * math.pi * k / segs) * r, math.sin(2 * math.pi * k / segs) * r, z)) for k in range(segs)])
    for a in range(len(rings) - 1):
        for k in range(segs):
            bm.faces.new((rings[a][k], rings[a][(k + 1) % segs], rings[a + 1][(k + 1) % segs], rings[a + 1][k]))
    bmesh.ops.solidify(bm, geom=bm.faces[:] + bm.edges[:] + bm.verts[:], thickness=0.12)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    dish = new_mesh("Dish", bm, P["hull"])
    bpy.context.view_layer.objects.active = dish
    for p in dish.data.polygons:
        p.use_smooth = True
    dish.scale = (0.9, 0.9, 0.9)
    dish.rotation_euler = (math.radians(-65), 0, 0)
    dish.location = (0, -0.4, 6.4)
    bpy.context.view_layer.update()
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    dish.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # feed horn
    d = Vector((0, 1.0, 0.0))
    cyl("FeedArm", (0, -2.2, 8.6), 0.06, 4.4, P["steel"], rot=(math.radians(-25 + 90 - 90), 0, 0), seg=8)
    sph("Feed", (0, -3.3, 9.6), 0.25, P["amber"], seg=16)
    torus("spin_OrbitRing", (0, 0, 7.5), 6.6, 0.05, P["cyan"], rot=(math.radians(75), 0, 0), ms=96, ns=8)
    # solar wings
    for s in (1, -1):
        box(f"Wing{s}", (5.2 * s, 1.2, 3.8), (4.2, 0.08, 2.2), P["graphite"], bevel=0.04)
        box(f"WingCells{s}", (5.2 * s, 1.14, 3.8), (4.0, 0.03, 2.0), P["screen"], bevel=0)
        box(f"WingArm{s}", (2.3 * s, 1.2, 3.8), (1.6, 0.12, 0.12), P["steel"], bevel=0.02)
    for i in range(6):
        a = i * math.pi / 3
        box(f"Whisker{i}", (math.cos(a) * 3.8, math.sin(a) * 3.8, 0.9), (0.15, 0.15, 1.2), P["steel"], bevel=0.02)
        sph(f"Lamp{i}", (math.cos(a) * 3.8, math.sin(a) * 3.8, 1.6), 0.12, P["cyan"], seg=10)
    finalize("about")
    return dict(cam=(18, -22, 12), target=(0, 0, 5))


# =================================================================== GATE
def gateway():
    P = palette()
    cyl("Base", (0, 0, 0.35), 8.0, 0.7, P["graphite"], bevel=0.05, seg=64)
    torus("BaseGlow", (0, 0, 0.72), 7.8, 0.06, P["amber"], ms=96, ns=8)
    torus("GateOuter", (0, 0, 7.4), 6.2, 0.7, P["hull"], rot=(math.radians(90), 0, 0), ms=96, ns=24)
    torus("GateRimOut", (0, -0.0, 7.4), 6.2, 0.74, P["graphite"], rot=(math.radians(90), 0, 0), ms=96, ns=6, scale=(1, 0.15, 1))
    torus("GateGlow", (0, -0.0, 7.4), 5.4, 0.12, P["amber"], rot=(math.radians(90), 0, 0), ms=96, ns=10)
    torus("spin_GateInner", (0, 0, 7.4), 4.8, 0.06, P["cyan"], rot=(math.radians(90), 0, 0), ms=96, ns=8)
    cyl("GateField", (0, 0, 7.4), 4.7, 0.03, P["glass"], rot=(math.radians(90), 0, 0), seg=64)
    for s in (1, -1):
        box(f"Foot{s}", (5.0 * s, 0, 1.3), (2.6, 2.2, 1.2), P["hull2"], bevel=0.08)
        box(f"Column{s}", (6.2 * s, 0, 2.6), (1.0, 1.2, 3.0), P["graphite"], bevel=0.08)
    cyl("Beacon", (0, 0, 15.0), 0.18, 3.0, P["steel"], seg=10)
    sph("BeaconTip", (0, 0, 16.7), 0.35, P["amber"], seg=16)
    for i in range(12):
        a = 2 * math.pi * i / 12
        sph(f"RingLamp{i}", (math.cos(a) * 6.2, -0.45, 7.4 + math.sin(a) * 6.2), 0.14, P["white"], seg=10)
    finalize("gateway")
    return dict(cam=(20, -26, 12), target=(0, 0, 7))



# ================================================================= TITAN (transformer)
def titan():
    """Original transforming mech-vehicle. Robot pose = authored pose, vehicle pose = keyframe 30.
    One glTF animation clip animates every part robot -> vehicle. Robot: feet at z=0, front faces -Y."""
    P = palette()
    P["cobalt"] = M("Cobalt", (0.04, 0.16, 0.62), 0.55, 0.3, coat=0.5)
    P["silver"] = M("Silver", (0.78, 0.82, 0.86), 0.9, 0.22)
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, 30
    parts = []

    def part(name, kind, mat, rloc, rdim, vloc, vdim, vrot=(0, 0, 0), rrot=(0, 0, 0)):
        if kind == "box":
            bpy.ops.mesh.primitive_cube_add(size=1)
        else:
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=1)
        o = bpy.context.active_object
        o.name = name
        o.data.materials.append(mat)
        if kind == "box":
            md = o.modifiers.new("bv", "BEVEL")
            md.width, md.segments = 0.07, 2
            md.limit_method = "ANGLE"
            bpy.ops.object.modifier_apply(modifier="bv")
        for p_ in o.data.polygons:
            p_.use_smooth = kind != "box"
        o.location, o.scale = rloc, rdim
        o.rotation_euler = tuple(math.radians(a) for a in rrot)
        for dp in ("location", "rotation_euler", "scale"):
            o.keyframe_insert(dp, frame=1)
        o.location, o.scale = vloc, vdim
        o.rotation_euler = tuple(math.radians(a) for a in vrot)
        for dp in ("location", "rotation_euler", "scale"):
            o.keyframe_insert(dp, frame=30)
        parts.append(o)

    C, CY, B = "cyl", "cyl", "box"
    # torso / cab
    part("Torso", B, P["cobalt"], (0, 0, 5.6), (2.6, 1.6, 2.4), (0.7, 0, 1.4), (4.4, 2.6, 1.2))
    part("Windshield", B, P["glass"], (0, -0.82, 5.95), (2.2, 0.12, 1.0), (1.9, 0, 2.05), (1.9, 0.12, 0.9), vrot=(-28, 0, 90))
    part("Grille", B, P["graphite"], (0, -0.84, 5.0), (1.6, 0.1, 0.8), (3.0, 0, 1.2), (1.8, 0.1, 0.55), vrot=(0, 0, 90))
    part("GrilleLight", B, P["cyan"], (0, -0.9, 4.75), (1.2, 0.04, 0.1), (3.04, 0, 1.0), (1.4, 0.04, 0.1), vrot=(0, 0, 90))
    part("Pelvis", B, P["graphite"], (0, 0, 3.95), (1.9, 1.2, 0.9), (-2.3, 0, 1.2), (2.4, 2.4, 1.0))
    # head
    part("Head", B, P["silver"], (0, 0, 7.5), (0.95, 0.9, 0.95), (0.4, 0, 2.15), (0.6, 0.5, 0.25))
    part("Crest", B, P["cobalt"], (0, 0, 8.15), (0.3, 0.9, 0.45), (-0.6, 0, 2.2), (0.3, 0.2, 0.1))
    part("Eyes", B, P["cyan"], (0, -0.47, 7.55), (0.62, 0.05, 0.14), (3.05, 0, 0.75), (1.5, 0.05, 0.12), vrot=(0, 0, 90))
    for s_, n in ((1, "R"), (-1, "L")):
        part(f"Shoulder{n}", B, P["silver"], (2.0 * s_, 0, 6.5), (1.1, 1.1, 1.0), (1.9, 1.55 * s_, 0.95), (1.7, 0.7, 0.7))
        part(f"UpperArm{n}", B, P["graphite"], (2.05 * s_, 0, 5.2), (0.7, 0.7, 1.5), (0.4, 1.55 * s_, 0.8), (2.4, 0.4, 0.5))
        part(f"Forearm{n}", B, P["cobalt"], (2.05 * s_, 0, 3.7), (0.95, 0.95, 1.5), (-2.0, 1.7 * s_, 0.85), (2.2, 0.7, 0.7))
        part(f"Hand{n}", B, P["graphite"], (2.05 * s_, 0, 2.7), (0.65, 0.65, 0.7), (3.0, 1.0 * s_, 0.5), (0.7, 0.5, 0.25))
        part(f"Thigh{n}", B, P["silver"], (0.75 * s_, 0, 2.85), (0.95, 1.05, 1.6), (-3.2, 0.9 * s_, 1.15), (1.8, 0.9, 0.9))
        part(f"Shin{n}", B, P["cobalt"], (0.75 * s_, 0, 1.2), (1.0, 1.15, 1.9), (-3.7, 1.7 * s_, 1.0), (2.4, 0.9, 0.9))
        part(f"Foot{n}", B, P["graphite"], (0.75 * s_, -0.25, 0.25), (1.05, 1.7, 0.5), (0.4, 0.9 * s_, 0.35), (3.2, 0.5, 0.2))
        part(f"Pack{n}", C, P["steel"], (0.7 * s_, 0.95, 6.5), (0.26, 0.26, 1.5), (-1.2, 0.6 * s_, 2.0), (0.3, 0.3, 1.5), vrot=(0, 90, 0))
        part(f"PackFlame{n}", C, P["amber"], (0.7 * s_, 0.95, 5.7), (0.18, 0.18, 0.1), (-2.0, 0.6 * s_, 2.0), (0.22, 0.22, 0.1), vrot=(0, 90, 0))
        part(f"Wing{n}", B, P["graphite"], (1.35 * s_, 0.95, 5.5), (0.18, 0.9, 2.2), (-1.2, 2.6 * s_, 1.0), (2.4, 2.4, 0.1), vrot=(0, 0, -22 * s_))
        part(f"Glow{n}", C, P["cyan"], (0.75 * s_, -0.25, 0.04), (0.25, 0.25, 0.03), (-4.97, 1.7 * s_, 1.0), (0.75, 0.75, 0.05), vrot=(0, 90, 0))
    # --- detail pass: vents, stacks, knee guards, head fins, cannons, hip skirt, emblem
    part("ChestEmblem", B, P["amber"], (0, -0.9, 5.55), (0.5, 0.04, 0.5), (0.7, 0, 2.03), (2.2, 0.35, 0.03))
    part("Faceplate", B, P["graphite"], (0, -0.47, 7.28), (0.62, 0.08, 0.5), (3.02, 0, 0.45), (0.9, 0.08, 0.3), vrot=(0, 0, 90))
    part("HipSkirt", B, P["cobalt"], (0, -0.1, 3.45), (2.2, 1.3, 0.35), (-2.3, 0, 0.62), (2.7, 2.3, 0.28))
    for s_, n in ((1, "R"), (-1, "L")):
        part(f"ChestVent{n}", B, P["dark"], (0.9 * s_, -0.85, 5.3), (0.5, 0.08, 0.5), (1.5, 0.6 * s_, 2.03), (0.9, 0.5, 0.05))
        part(f"Stack{n}", C, P["steel"], (2.25 * s_, 0.4, 7.35), (0.18, 0.18, 1.1), (-0.4, 1.1 * s_, 2.3), (0.2, 0.2, 1.6), vrot=(0, 90, 0))
        part(f"Knee{n}", B, P["silver"], (0.75 * s_, -0.58, 2.0), (0.8, 0.35, 0.5), (-2.6, 1.3 * s_, 0.55), (1.2, 0.4, 0.3))
        part(f"HeadFin{n}", B, P["cobalt"], (0.6 * s_, 0.05, 7.75), (0.12, 0.5, 0.75), (0.2, 0.3 * s_, 2.1), (0.2, 0.3, 0.1))
        part(f"Cannon{n}", C, P["steel"], (2.5 * s_, -0.25, 3.4), (0.22, 0.22, 1.2), (-1.0, 1.9 * s_, 0.8), (0.22, 0.22, 1.4), vrot=(0, 90, 0))
        part(f"Ankle{n}", B, P["silver"], (0.75 * s_, 0, 0.62), (1.1, 1.2, 0.2), (0.4, 1.0 * s_, 0.5), (3.0, 0.5, 0.1))
    for o in parts:
        pass
    path = os.path.join(OUT, "titan.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_apply=False, export_yup=True,
                              export_animations=True, export_animation_mode="SCENE",
                              export_draco_mesh_compression_enable=False)
    print(f"EXPORT titan: {os.path.getsize(path)//1024} KB, parts {len(parts)}")
    if do_preview:
        for fr, tag in ((1, "robot"), (30, "vehicle")):
            sc.frame_set(fr)
            CAMS["titan"] = ((14, -20, 7), (0, 0, 4), 40) if fr == 1 else ((-8, -12, 5), (0, 0, 1), 40)
            preview("titan")
            os.replace(os.path.join(PREVIEW, "titan.png"), os.path.join(PREVIEW, f"titan_{tag}.png"))

# ================================================================== MAIN
JOBS = [("spacecraft", spacecraft, dict(cam=(-9, -7, 4), target=(0, 0, 0), lens=50)), ("hub", hub, None), ("arena", arena, None),
        ("forge", forge, None), ("gallery", gallery, None), ("assembly", assembly, None), ("experience", experience, None),
        ("timeline", timeline, None), ("partners", partners, None), ("about", about, None), ("gateway", gateway, None), ("titan", titan, None)]

for name, fn, pv in JOBS:
    if want and name not in want:
        continue
    reset()
    _cam = fn()
    if do_preview and isinstance(_cam, dict):
        pass
print("DONE")
