import sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
reset()

sand=mat('Oolitic sand',(199,168,109),.90,kind='stone',n=256)
sea=mat('Indigo water',(44,78,105),.17,.13)
crest=mat('Sea glints',(97,144,156),.19,.22)
foam=mat('Sea froth',(214,220,204),.37)
wool=[mat('Merino '+n,col,.94,kind='knit',n=256) for n,col in [('oat',(210,190,156)),('heather',(164,143,126)),('cream',(228,214,183))]]
cloud=mat('Carded cotton',(238,235,226),.98)
fibre=mat('Cotton wisp',(214,217,216),.99)
peat=mat('Humus',(83,57,40),.96,kind='cork',n=256)
root=mat('Fine root',(154,110,71),.91)
moss=mat('Cushion moss',(79,98,47),.98,kind='moss',n=256)
leaf=mat('New moss tips',(134,146,65),.88)
spore=mat('Sporophyte',(153,110,57),.91)
rock=mat('River shale',(108,106,101),.3,kind='stone',n=256)
night=mat('Midnight pool',(35,46,64),.15,.34)
silver=mat('Moon on water',(161,177,193),.20,.50)
def group(name):
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);return ob
def side(name,r,h,fn,m,parent):
    b=Mesh(name)
    n=88
    loops=[]
    for j in [0,1]:
        ring=[]
        for i in range(n):
            a=tau*i/n;x=r*cos(a);z=r*sin(a)
            ring.append(b.vert((x,h+fn(x,z) if j else .004,z)))
        loops.append(ring)
    for i in range(n):
        k=(i+1)%n;b.face([loops[0][i],loops[1][i],loops[1][k],loops[0][k]],m,True,[(i/n*3,0),(i/n*3,1),((i+1)/n*3,1),((i+1)/n*3,0)])
    return b
def top(name,r,h,fn,m,parent,accent=None):
    b=Mesh(name); n=80; prev=[]
    for j in range(29):
        rr=r*j/28;ring=[]
        for i in range(n if j else 1):
            a=tau*i/n;x=rr*cos(a);z=rr*sin(a)
            ring.append(b.vert((x,h+fn(x,z),z)))
        if j:
            for i in range(n):
                k=(i+1)%n;face=[prev[i%len(prev)],ring[k],ring[i]] if j==1 else [prev[i],prev[k],ring[k],ring[i]]
                b.face(face,m if not accent else accent(rr*cos(tau*i/n),rr*sin(tau*i/n)),True,[(b.v[v][0]*15,b.v[v][1]*15) for v in face])
        prev=ring
    b.finish(parent)
def blob(b,p,radii,m,distort,n=24,rows=14,clip=.0659):
    cx,cy,cz=p;rx,ry,rz=radii;prev=[]
    for j in range(rows+1):
        v=j*pi/rows;ring=[]
        for i in range(n if 0<j<rows else 1):
            a=tau*i/n;xx=sin(v)*cos(a);yy=-cos(v);zz=sin(v)*sin(a)
            k=distort(xx,yy,zz)
            x=cx+rx*k*xx;z=cz+rz*k*zz;d=hypot(x,z)
            if d>clip:x*=clip/d;z*=clip/d
            ring.append(b.vert((x,cy+ry*k*yy,z)))
        if j:
            for i in range(n):
                k=(i+1)%n;f=[prev[i%len(prev)],ring[i%len(ring)],ring[k%len(ring)],prev[k%len(prev)]]
                uv=[(i/n*2,(j-1)/rows),(i/n*2,j/rows),((i+1)/n*2,j/rows),((i+1)/n*2,(j-1)/rows)]
                if j in (1,rows):
                    skip=3 if j==1 else 2;f.pop(skip);uv.pop(skip)
                b.face(f,m,True,uv)
        prev=ring

g=group('k1_wave')
def dune(x,z):return -.005+.0036*sin(x*88+z*30)+.0011*sin(z*420+x*81)
def wave(x,z):return .0013*sin(x*172+z*70+.6*sin(z*110))+.00045*sin(z*240)
side('sand_col',.066,.064,dune,sand,g).finish(g)
top('sand_top',.066,.064,dune,sand,g)
side('water_side',.06535,.122,wave,sea,g).finish(g)
top('water_top',.06535,.122,wave,sea,g,lambda x,z:crest if wave(x,z)>.00132 else sea)
b=Mesh('foam')
for i in range(126):
    a=random.random()*tau;r=random.uniform(.058,.064)
    rad=min(.0659-r,random.uniform(.00065,.0019))
    x,z=r*cos(a),r*sin(a)
    b.ring(x,.1228+wave(x,z),z,rad*.74,rad*.24,foam,8,4)
b.finish(g)

g=group('k2_blanket')
for i,(h,r) in enumerate([(.036,.072),(.083,.069),(.124,.060)]):
    b=Mesh('cloth_'+str(i),(0,h,0))
    def folds(x,y,z):
        u=x*cos(i)+z*sin(i);v=z*cos(i)-x*sin(i)
        return 1+.18*sin(u*9+v*3+i+y*1.8)+.07*sin(v*9-y*4)+.035*cos(u*16)
    blob(b,(0,h,0),(r,.028,r*.94),wool[i],folds,64,36)
    b.finish(g)
g=group('k3_cloud')
puffs=[(0,.04,0,.036),(.028,.032,.02,.028),(-.03,.035,-.014,.03),(.012,.035,-.03,.027),(-.012,.03,.03,.026),(.014,.085,.006,.033),(-.022,.08,.016,.028),(.028,.078,-.018,.025),(-.008,.12,-.01,.028),(.02,.122,.014,.022)]
for i,(x,y,z,r) in enumerate(puffs):
    b=Mesh('puff_'+str(i),(x,y,z))
    def lobes(a,h,c):
        return .77+.14*cos(5*a+1.5*h+i)*cos(6*c-2*h)+.09*cos(8*h+2*a)*sin(6*c+i)
    blob(b,(x,y,z),(r,r*.9,r),cloud,lobes,32,20)
    for j in range(35):
        a=random.random()*tau;h=random.uniform(-1,1);u=sqrt(1-h*h)*cos(a);v=sqrt(1-h*h)*sin(a)
        k=lobes(u,h,v)
        p=Vector((x+r*k*u,y+r*.9*k*h,z+r*k*v))
        end=p+Vector((u,h,v))*r*.10+Vector((.001,0,-.001))
        if hypot(end.x,end.z)<.065:
            b.tube([p,(p+end)*.5+Vector((.00045,.0003,0)),end],.00016,fibre,3)
    b.finish(g)
g=group('k4_moss')
def bed(x,z):return .0017*sin(x*85)*cos(z*80)
b=side('soil_col',.066,.034,bed,peat,g)
for j in range(45):
    a=random.random()*tau;y=random.uniform(.013,.031)
    pts=[]
    for k in range(5):
        t=a+.025*sin(k+j);pts.append((.0658*cos(t),y-k*.00195,.0658*sin(t)))
    b.tube(pts,.00019,root,4)
for j in range(25):
    a=random.random()*tau
    blob(b,(.0648*cos(a),random.uniform(.008,.03),.0648*sin(a)),(.0028,.0014,.0023),rock,lambda x,y,z:1+.1*sin(4*x+z),8,5)
b.finish(g)
top('soil_top',.066,.034,bed,peat,g)
for i,(name,x,y,z,r,ry) in enumerate([('mound',0,.042,0,.064,.022),('moss_ball_0',.016,.07,.008,.026,.02),('moss_ball_1',-.022,.064,-.014,.022,.017),('stone_2',-.016,.06,.026,.016,.011),('stone_3',.03,.058,-.026,.014,.0095),('stone_4',.004,.09,-.006,.014,.011)]):
    b=Mesh(name,(x,y,z))
    def relief(u,h,v):return .94+.055*sin(u*6+h*3+i)*cos(v*7)+.037*cos(u*11+v*4)
    blob(b,(x,y,z),(r,ry,r),moss if i<3 else rock,relief)
    if i<3:
        for j in range(350 if i==0 else 150):
            a=random.random()*tau;h=random.uniform(.05,1);u=cos(a)*sqrt(1-h*h);v=sin(a)*sqrt(1-h*h);k=relief(u,h,v)
            px=x+r*k*u;py=y+ry*k*h;pz=z+r*k*v
            if hypot(px,pz)>.063:continue
            length=random.uniform(.0013,.0034)
            ids=[b.vert(pt) for pt in [(px-.00038,py,pz),(px+.00038,py,pz),(px+u*.001,py+length,pz+v*.0009)]]
            b.face(ids,leaf)
            if j%19==0:
                end=(px+.0017,py+.005,pz)
                b.tube([(px,py,pz),end],.00021,spore,4)
                blob(b,end,(.00055,.00082,.00055),spore,lambda *_:1,6,4)
    b.finish(g)
g=group('k5_moon')
def ripple(x,z):return .0012*cos(hypot(x-.017,z+.013)*524)
side('moon_side',.066,.122,ripple,night,g).finish(g)
top('moon_top',.066,.122,ripple,night,g,lambda x,z:silver if ripple(x,z)>.00105 else night)
b=Mesh('moon_edge');b.ring(0,.122,0,.06495,.00095,silver,96);b.finish(g)
export('contents')

# glTF exporters may sort sibling names. Preserve the site's index-based animation contract.
path=OUT/'contents.glb';raw=path.read_bytes()
size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size])
order=[['sand_col','sand_top','water_side','water_top','foam'],['cloth_'+str(i) for i in range(3)],['puff_'+str(i) for i in range(10)],['soil_col','soil_top','mound','moss_ball_0','moss_ball_1','stone_2','stone_3','stone_4'],['moon_side','moon_top','moon_edge']]
for node in doc['nodes']:
    if 'children' in node:
        names=order[int(node['name'][1])-1]
        node['children'].sort(key=lambda idx:names.index(doc['nodes'][idx]['name']))
encoded=json.dumps(doc,ensure_ascii=False,separators=(',',':')).encode()
encoded+=b' '*(-len(encoded)%4)
tail=raw[20+size:]
path.write_bytes(struct.pack('<4sIIII',b'glTF',2,20+len(encoded)+len(tail),len(encoded),0x4e4f534a)+encoded+tail)

