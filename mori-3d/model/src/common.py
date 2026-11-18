"""Mesh construction in metres in the website's X/right, Y/up, Z/street space."""
import sys, os, math, random, json, struct, zlib
from pathlib import Path
from math import sin, cos, pi, tau, sqrt, hypot
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / 'model/tmp'
OUT = ROOT / 'assets/models'
TMP.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
os.environ['TMP'] = os.environ['TEMP'] = str(TMP)
bpy.context.preferences.filepaths.temporary_directory = str(TMP)
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.temporary_directory = str(TMP)
    random.seed(2409)
def xyz(p): return (p[0], -p[2], p[1])
def linear(v):
    v = v/255
    return v/12.92 if v < .04045 else ((v+.055)/1.055)**2.4

def bake(name, kind, rgb, n):
    """Sample periodic material fields directly into UV-space JPEGs."""
    rng=np.random.default_rng(zlib.crc32(name.encode()))
    v,u=np.mgrid[:n,:n]/n
    def noise(nx,ny):
        grid=rng.normal(size=(ny,nx))
        x,y=u*nx,v*ny
        i,j=x.astype(int)%nx,y.astype(int)%ny
        a,b=x%1,y%1
        a=a*a*(3-2*a); b=b*b*(3-2*b)
        return ((1-a)*grid[j,i]+a*grid[j,(i+1)%nx])*(1-b)+((1-a)*grid[(j+1)%ny,i]+a*grid[(j+1)%ny,(i+1)%nx])*b
    broad=noise(6,6); grain=rng.normal(size=u.shape)
    fine=noise(n//4,n//4)
    field=.06*broad+.04*fine+.025*grain
    if kind=='wood':
        warp=v+.014*noise(4,5)+.005*noise(8,10)
        field=.12*noise(5,48)+.06*noise(20,150)-.16*(.5+.5*np.cos(tau*(warp*33+.3*noise(3,8))))**8+.026*grain
    elif kind=='stone':
        chips=noise(n//3,n//3)
        field=.035*broad+.035*fine+.38*(chips>1.15)-.3*(chips<-.95)+.03*grain
    elif kind=='cork':
        field=.09*noise(13,13)+.17*noise(53,53)-.42*(fine<-.85)+.055*grain
    elif kind=='knit':
        loops=np.cos(tau*(v*16+.34*np.cos(tau*u*16)))
        field=.18*loops+.09*np.sin(tau*u*32)+.055*grain+.035*broad
    elif kind=='asphalt':
        field+=.16*fine
    elif kind=='moss':
        field+=.14*noise(35,35)+.16*fine
    def save(suffix,data):
        img=bpy.data.images.new(name+suffix,width=n,height=n,alpha=False)
        data=np.broadcast_to(data,(n,n,3))
        pixels=np.ones((n,n,4),np.float32)
        pixels[:,:,:3]=np.clip(data,0,1)
        img.pixels.foreach_set(pixels.ravel())
        img.filepath_raw=str(TMP/(name+suffix+'.jpg'))
        img.file_format='JPEG'; img.save()
        bpy.data.images.remove(img)
        return bpy.data.images.load(str(TMP/(name+suffix+'.jpg')))
    base=np.array(rgb)/255
    color=save('_color',(1+field[:,:,None])*base)
    dx=(np.roll(field,1,1)-np.roll(field,-1,1))*.65
    dy=(np.roll(field,1,0)-np.roll(field,-1,0))*.65
    length=np.sqrt(1+dx*dx+dy*dy)
    normal=save('_normal',np.stack((dx/length,dy/length,1/length),axis=-1)*.5+.5)
    normal.colorspace_settings.name='Non-Color'
    return color,normal,broad

def mat(name,rgb,rough=.55,metal=0,kind=None,n=512,emit=0,trans=0,alpha=1):
    m=bpy.data.materials.new(name); m.use_nodes=True
    tree=m.node_tree; p=tree.nodes.get('Principled BSDF')
    color=tuple(linear(c) for c in rgb)+(1,)
    for key,val in [('Base Color',color),('Roughness',rough),('Metallic',metal),('Emission Color',color),('Emission Strength',emit),('Transmission Weight',trans),('IOR',1.48),('Alpha',alpha)]:
        p.inputs[key].default_value=val
    if kind:
        col,norm,broad=bake(name,kind,rgb,n)
        def tex(img):
            node=tree.nodes.new('ShaderNodeTexImage'); node.image=img; return node.outputs['Color']
        tree.links.new(tex(col),p.inputs['Base Color'])
        nm=tree.nodes.new('ShaderNodeNormalMap')
        tree.links.new(tex(norm),nm.inputs['Color']); tree.links.new(nm.outputs[0],p.inputs['Normal'])
        if kind=='asphalt':
            # glTF metallic/roughness map: wet depressions have softer highlights.
            img=bpy.data.images.new('wetness',width=n,height=n,alpha=False)
            pix=np.ones((n,n,4),np.float32)
            pix[:,:,1]=.13+.59*np.clip((broad+.5)*1.25,0,1);pix[:,:,2]=0
            img.pixels.foreach_set(pix.ravel()); img.file_format='JPEG'
            img.filepath_raw=str(TMP/'wetness.jpg');img.save();bpy.data.images.remove(img)
            img=bpy.data.images.load(str(TMP/'wetness.jpg')); img.colorspace_settings.name='Non-Color'
            sep=tree.nodes.new('ShaderNodeSeparateColor');tree.links.new(tex(img),sep.inputs[0])
            tree.links.new(sep.outputs[1],p.inputs['Roughness']);tree.links.new(sep.outputs[2],p.inputs['Metallic'])
    if alpha<1: m.surface_render_method='BLENDED'
    return m

class Mesh:
    def __init__(self,name,origin=(0,0,0)):
        self.name=name; self.origin=Vector(origin)
        self.v=[]; self.f=[]; self.mi=[]; self.mats=[]; self.smooth=[]; self.uv=[]
    def vert(self,p):
        self.v.append(xyz(Vector(p)-self.origin));return len(self.v)-1
    def face(self,indices,m,smooth=False,uv=None):
        if m not in self.mats:self.mats.append(m)
        self.f.append(indices);self.mi.append(self.mats.index(m));self.smooth.append(smooth)
        self.uv.extend(uv if uv is not None else [(self.v[i][0],self.v[i][1]) for i in indices])
    def finish(self,parent=None):
        data=bpy.data.meshes.new(self.name); data.from_pydata(self.v,[],self.f);data.update()
        for m in self.mats:data.materials.append(m)
        data.polygons.foreach_set('material_index',self.mi);data.polygons.foreach_set('use_smooth',self.smooth)
        uv=data.uv_layers.new(name='Material coordinates')
        uv.data.foreach_set('uv',np.asarray(self.uv,np.float32).ravel())
        ob=bpy.data.objects.new(self.name,data);bpy.context.collection.objects.link(ob)
        ob.location=xyz(self.origin)
        if parent:
            ob.parent=parent; ob.location-=parent.location
        return ob
    def box(self,p,d,m,scale=1):
        x,y,z=p; w,h,t=[v/2 for v in d]
        verts=[(x+i*w,y+j*h,z+k*t) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        ids=[self.vert(pt) for pt in verts]; offset=random.random()*4
        for face,axes in [((3,2,1,0),(0,1)),((4,5,6,7),(0,1)),((0,4,7,3),(2,1)),((1,2,6,5),(2,1)),((3,7,6,2),(0,2)),((0,1,5,4),(0,2))]:
            a,b=sorted(axes,key=lambda k:-d[k])
            self.face([ids[i] for i in face],m,uv=[(verts[i][a]*scale+offset,verts[i][b]*scale+offset) for i in face])
    def lathe(self,x,z,profile,m,n=48,scale=1):
        rings=[];dist=0
        for j,(r,y) in enumerate(profile):
            ring=[self.vert((x+r*cos(i*tau/n),y,z+r*sin(i*tau/n))) for i in range(n)] if r else [self.vert((x,y,z))]*n
            if j:
                old=profile[j-1];newdist=dist+hypot(r-old[0],y-old[1])
                for i in range(n):
                    k=(i+1)%n
                    ids=[rings[i],ring[i],ring[k],rings[k]]
                    uv=[(i/n,dist*scale),(i/n,newdist*scale),((i+1)/n,newdist*scale),((i+1)/n,dist*scale)]
                    if not r or not old[0]:
                        skip=2 if not r else 3
                        ids.pop(skip);uv.pop(skip)
                    if abs(y-old[1])<1e-8:uv=[(self.v[a][0]*scale,self.v[a][1]*scale) for a in ids]
                    self.face(ids,m,abs(y-old[1])>1e-8,uv)
                dist=newdist
            rings=ring
    def disc(self,x,y,z,r,h,m,n=48,edge=.002):
        e=min(edge,h/3,r/4);b=y-h/2;t=y+h/2
        self.lathe(x,z,[(0,b),(r-e,b),(r,b+e),(r,t-e),(r-e,t),(0,t)],m,n)
    def tube(self,pts,r,m,n=8,closed=False):
        pts=list(map(Vector,pts));rings=[]
        for i,p in enumerate(pts):
            tang=(pts[(i+1)%len(pts) if closed else min(i+1,len(pts)-1)]-pts[(i-1)%len(pts) if closed else max(i-1,0)]).normalized()
            ref=Vector((0,1,0)) if abs(tang.y)<.93 else Vector((1,0,0))
            a=tang.cross(ref).normalized();b=tang.cross(a)
            rings.append([self.vert(p+r*(a*cos(j*tau/n)+b*sin(j*tau/n))) for j in range(n)])
        for i in range(len(pts) if closed else len(pts)-1):
            for j in range(n):
                k=(j+1)%n;t=(i+1)%len(pts)
                self.face([rings[i][j],rings[i][k],rings[t][k],rings[t][j]],m,True,[(i/8,j/n),(i/8,(j+1)/n),((i+1)/8,(j+1)/n),((i+1)/8,j/n)])
    def ring(self,x,y,z,r,wire,m,n=64,sides=8):
        self.tube([(x+r*cos(tau*i/n),y,z+r*sin(tau*i/n)) for i in range(n)],wire,m,sides,True)

def export(name):
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_yup=True,export_image_format='JPEG',export_jpeg_quality=88,export_animations=False,export_cameras=False,export_lights=False)

