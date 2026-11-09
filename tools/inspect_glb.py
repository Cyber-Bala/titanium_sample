import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
for o in bpy.data.objects:
    print(o.type, o.name, tuple(round(x,2) for x in o.dimensions), len(o.data.vertices) if o.type=='MESH' else '')
