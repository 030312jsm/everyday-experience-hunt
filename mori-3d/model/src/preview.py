import sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
reset()

PRE=ROOT/'model/previews'
PRE.mkdir(exist_ok=True)
def studio():
    s=bpy.context.scene
    s.render.engine='BLENDER_EEVEE'
    s.render.resolution_x=1080;s.render.resolution_y=690;s.render.resolution_percentage=100
    s.eevee.taa_render_samples=24
    s.eevee.use_raytracing=True
    s.world=bpy.data.worlds.new('Blue hour')
    s.world.color=(.055,.065,.088)
    cam=bpy.data.cameras.new('40 degree vertical')
    cam.sensor_fit='VERTICAL';cam.lens=cam.sensor_height/(2*math.tan(math.radians(20)))
    cam.clip_start=.003;cam.clip_end=100
    o=bpy.data.objects.new('Study camera',cam);s.collection.objects.link(o);s.camera=o
def aim(o,target):
    o.rotation_euler=(Vector(xyz(target))-o.location).to_track_quat('-Z','Y').to_euler()
def light(name,pos,target,power,col,size,other=None):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=col
    d.shape='RECTANGLE';d.size=size;d.size_y=other or size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=xyz(pos);aim(o,target)
def shot(name,pos,target):
    s=bpy.context.scene;s.camera.location=xyz(pos);aim(s.camera,target)
    s.render.filepath=str(PRE/(name+'.png'));bpy.ops.render.render(write_still=True)
def get(name):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT/(name+'.glb')))
    return set(bpy.data.objects)-before
def assembly(name,objects):
    c=bpy.data.collections.new(name)
    for ob in objects:
        for current in list(ob.users_collection):current.objects.unlink(ob)
        c.objects.link(ob)
    return c
def instance(name,c,pos):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
    o.instance_type='COLLECTION';o.instance_collection=c;o.location=xyz(pos)
def shop():
    studio();get('shop')
    jars=assembly('Bottle master',get('jar'))
    fill=Mesh('Preview stock and paper tags')
    colors=[mat('Stock '+str(k),c,.72) for k,c in enumerate([(168,143,99),(89,106,63),(199,191,168),(88,115,135),(149,92,59),(168,138,78)])]
    paper=mat('Unprinted kraft',(184,150,103),.89)
    for i in range(20):
        for j in range(7):
            x=-3.8+i*.4;y=.45+j*.38;z=-5.84
            instance('Stock',jars,(x,y,z))
            h=.080+.061*random.random()
            fill.disc(x,y+.005+h/2,z,.065,h,colors[(i*7+j*3+i*j%5)%6],20)
            fill.box((x+random.uniform(-.012,.012),y+.132,z+.078),(.040,.072,.0008),paper)
    fill.finish()
    # Preview of the runtime lettering and illuminated backing; excluded from exports.
    ink=mat('Painted lettering',(242,225,195),.5,emit=.25)
    ft=bpy.data.curves.new('mori lettering','FONT');ft.body='mori';ft.align_x='CENTER';ft.align_y='CENTER';ft.size=.355;ft.space_character=1.23
    font=Path('C:/Windows/Fonts/georgia.ttf')
    if font.exists():ft.font=bpy.data.fonts.load(str(font))
    ob=bpy.data.objects.new('Preview lettering',ft);bpy.context.collection.objects.link(ob);ob.location=xyz((.95,2.95,4.19));ob.rotation_euler.x=pi/2;ft.materials.append(ink)
    # Graduated light in each cell, as in shelfBack in store.js.
    b=Mesh('Preview shelf backing')
    backing=mat('Niche glow',(255,255,255),.83,emit=.5)
    n=128;v,u=np.mgrid[:n,:n]/n
    fall=np.exp(-((u-.50)**2*6+(v-.54)**2*4.7))
    pix=np.ones((n,n,4),np.float32)
    for channel,(low,span) in enumerate([(.15,.57),(.08,.41),(.05,.23)]):
        pix[:,:,channel]=low+fall*span
    img=bpy.data.images.new('Preview falloff',width=n,height=n)
    img.pixels.foreach_set(pix.ravel())
    nt=backing.node_tree;tex=nt.nodes.new('ShaderNodeTexImage');tex.image=img
    p=nt.nodes.get('Principled BSDF')
    for key in ['Emission Color','Base Color']:nt.links.new(tex.outputs[0],p.inputs[key])
    for i in range(20):
        for j in range(7):
            x=-4+i*.4;y=.45+j*.38;z=-5.989
            ids=[b.vert((x+dx*.4,y+dy*.38,z)) for dx,dy in [(0,0),(1,0),(1,1),(0,1)]]
            b.face(ids,backing,uv=[(0,0),(1,0),(1,1),(0,1)])
    b.finish()
    warm=(1,.68,.40)
    light('Street bounce',(-3,5.8,8.7),(-1,1.3,4),440,(.62,.73,1),6)
    light('Fascia pool',(1.1,3.34,4.72),(.9,1.65,4),58,warm,.58)
    light('Light behind the window',(-2.5,2.9,3.55),(-2.7,.5,1.8),140,warm,1.25)
    for x,z in [(-1.6,.2),(-2.6,-2.2),(1.7,-2.6),(2.6,.6)]:
        light('Pendant spill',(x,2.31,z),(x*.7,.7,-1.2),66,warm,.28)
    light('Reflected oak',(1.8,2.8,2.2),(-1,.9,-2),220,(1,.82,.65),3.2)
    light('Shelves softbox',(-1,2.9,-4.25),(0,1.4,-5.9),145,(1,.80,.56),4.8,.7)
    light('Shelf edge',(2.8,1.85,-4.98),(0,1.5,-5.86),48,(1,.88,.65),1.2,.5)
    light('Side wall',(-4,2.75,-1),(-4.9,1.6,-2.4),85,warm,2.1)
    shot('01_front',(.6,1.5,10.5),(-1,1.75,3.6))
    shot('02_counter',(1.1,1.72,2.9),(-.8,1.05,-1.6))
    shot('03_shelf',(.65,1.7,-3.3),(.65,1.79,-6))
def product(contents=False):
    reset();studio()
    if contents:
        get('contents')
        for i,name in enumerate(['k1_wave','k2_blanket','k3_cloud','k4_moss','k5_moon']):
            bpy.data.objects[name].location.x=(i-2)*.168
    else:get('jar')
    m=mat('Studio slate',(82,77,68),.61)
    b=Mesh('Studio sweep')
    profile=[(2,0),(-.28,0)]+[(-.28-.34*sin(t*pi/32),.34*(1-cos(t*pi/32))) for t in range(1,17)]+[(-.62,2)]
    for (z0,y0),(z1,y1) in zip(profile,profile[1:]):
        b.face([b.vert(v) for v in [(-3,y0,z0),(3,y0,z0),(3,y1,z1),(-3,y1,z1)]],m,True)
    b.finish()
    light('Background wash',(0,.65,-.15),(0,.37,-.60),5.8,(.9,.85,.78),.9)
    light('Silk',(-.31,.48,.27),(0,.1,0),6.8,(1,.86,.70),.28,.48)
    light('Strip',(.32,.29,-.20),(0,.08,0),9,(.74,.87,1),.10,.48)
    light('Back edge',(-.18,.29,-.31),(0,.12,0),5,(1,.84,.66),.29,.2)
    if contents:
        bpy.context.scene.render.resolution_x=1400;bpy.context.scene.render.resolution_y=570
        shot('05_contents',(.009,.281,.496),(0,.070,0))
    else:
        shot('04_jar',(.215,.216,.354),(0,.115,0))
if '--products' not in sys.argv:shop()
if '--shop' not in sys.argv:
    product();product(True)


