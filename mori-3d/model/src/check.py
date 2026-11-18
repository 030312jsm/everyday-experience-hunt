"""Run with Blender -b --python-exit-code 1 -P model/src/check.py."""
import sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
import bmesh

groups={
    'k1_wave':['sand_col','sand_top','water_side','water_top','foam'],
    'k2_blanket':[f'cloth_{i}' for i in range(3)],
    'k3_cloud':[f'puff_{i}' for i in range(10)],
    'k4_moss':['soil_col','soil_top','mound','moss_ball_0','moss_ball_1','stone_2','stone_3','stone_4'],
    'k5_moon':['moon_side','moon_top','moon_edge']}
shop='room_floor room_walls room_ceiling facade window_frame window_glass door door_slit door_knob sign_plate street curb alley counter counter_led counter_center shelf wall_details'.split()
for base,count in [('well',6),('dock',6),('stool',6),('pendant',4)]:
    shop.extend(f'{base}_{i}' for i in range(count))
expected={'shop':shop,'jar':['jar_glass','jar_cork','jar_twine'],'contents':list(groups)+sum(groups.values(),[])}
budgets={'shop':(15_000_000,400_000),'jar':(1_000_000,5_000),'contents':(5_000_000,None)}
def close(a,b,tol=.0001):
    assert max(abs(x-y) for x,y in zip(a,b))<tol,(a,b)
def points(ob):
    return [ob.matrix_world@v.co for v in ob.data.vertices]
def bounds(name):
    pts=points(bpy.data.objects[name])
    return [[fn(v[k] for v in pts) for k in range(3)] for fn in (min,max)]
def test_shop():
    ob=bpy.data.objects
    close(ob['door'].location,xyz((.35,0,3.98)))
    close(bounds('door')[0],(.35,-4.005,0));close(bounds('door')[1],(1.53,-3.955,2.43))
    for name in ['door_slit','door_knob']:assert ob[name].parent==ob['door']
    close(ob['door_slit'].location,xyz((.3,1.35,0)))
    for i in range(6):
        a=pi/2+i*pi/3
        x=1.24*cos(a);z=-1.2+1.24*sin(a)
        close(ob[f'well_{i}'].location,xyz((x,1.05,z)))
        close(ob[f'dock_{i}'].location,xyz((1.38*cos(a-.33),1.065,-1.2+1.38*sin(a-.33))))
        for offset in range(9):
            rad=.285 if offset else 0
            world=Vector(xyz((x+rad*cos(offset*pi/4),1.2,z+rad*sin(offset*pi/4))))
            for mesh in (ob['counter'],ob[f'well_{i}']):
                hit,pt,*_=mesh.ray_cast(mesh.matrix_world.inverted()@world,(0,0,-1),distance=.36)
                assert not hit,(mesh.name,pt)
        close((bounds(f'stool_{i}')[1][2],),(.68,))
def test_jar():
    ob=bpy.data.objects['jar_glass']
    close(bounds('jar_glass')[0],(-.075,-.075,0));close(bounds('jar_glass')[1],(.075,.075,.2))
    bm=bmesh.new();bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm,verts=bm.verts[:],dist=.000001)
    assert all(e.is_manifold for e in bm.edges),'Open glass shell'
    bm.free()
def run(name):
    reset()
    path=OUT/(name+'.glb');raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+length]);nodes=doc['nodes']
    names=[o['name'] for o in nodes]
    assert sorted(names)==sorted(expected[name]),(name,set(names)^set(expected[name]))
    assert 'KHR_draco_mesh_compression' not in doc.get('extensionsUsed',[])
    assert all(i['mimeType']=='image/jpeg' and 'bufferView' in i for i in doc['images'])
    assert all(p.get('mode',4)==4 for m in doc['meshes'] for p in m['primitives'])
    tris=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    limit,tri_limit=budgets[name]
    assert len(raw)<=limit and (tri_limit is None or tris<=tri_limit),(name,len(raw),tris)
    bpy.ops.import_scene.gltf(filepath=str(path))
    assert set(names)<=set(bpy.data.objects.keys())
    assert all(max(img.size)<=2048 for img in bpy.data.images)
    if name=='shop':test_shop()
    if name=='jar':test_jar()
    if name=='contents':
        for n in nodes:
            if n['name'] in groups:
                assert 'mesh' not in n
                assert [names[i] for i in n['children']]==groups[n['name']]
        for obj in bpy.context.scene.objects:
            if obj.type=='MESH':
                assert max(hypot(v.x,v.y) for v in points(obj))<=.06601,obj.name
    return f'{name}.glb | {len(names)} nodes | {len(raw):,} bytes | {tris:,} triangles | PASS'
for result in [run(name) for name in expected]:print(result)

