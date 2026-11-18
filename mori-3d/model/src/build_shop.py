import sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
reset()

oak=mat('Quarter sawn oak',(113,76,48),.46,kind='wood')
walnut=mat('Smoked oak',(77,53,39),.43,kind='wood')
plaster=mat('Lime and chalk',(177,158,132),.89,kind='plaster')
stone=mat('Basalt and shell terrazzo',(108,98,87),.32,kind='stone',n=1024)
stucco=mat('Umbrian earth render',(105,91,78),.86,kind='plaster')
paint=mat('Oxidised bottle green',(51,65,59),.49,kind='wood')
brass=mat('Aged brass',(164,125,73),.38,.77)
iron=mat('Blackened steel',(50,49,47),.43,.73)
dark=mat('Shadow gap',(39,34,30),.71)
glow=mat('Opal amber',(255,211,149),.37,emit=3)
honey=mat('Seeded amber',(242,172,91),.32,emit=.8)
pane=mat('Rolled glazing',(202,224,218),.09,.12,alpha=.095)
paver=mat('Blue limestone',(103,100,94),.52,kind='stone')
asphalt=mat('Wet aggregate',(58,61,64),.32,kind='asphalt')
def simple(name,p,d,m):
    b=Mesh(name,p);b.box(p,d,m);return b.finish()

b=Mesh('room_floor')
b.box((0,-.043,-1),(10,.04,10),dark)
for i in range(74):
    w=10/74; x=-5+(i+.5)*w;z=-6
    while z<3.999:
        end=min(4,z+random.uniform(.45,1.85) if z==-6 else z+random.uniform(1.45,2.65))
        b.box((x,-.012,(z+end)/2),(w-.0016,.024,max(.0001,end-z-.0015)),walnut,1.45)
        z=end
b.finish()
b=Mesh('room_walls')
for side in [-1,1]:
    b.box((side*5.055,1.65,-1),(.11,3.3,10),plaster,.37)
    b.box((side*4.985,.45,-1),(.03,.9,10),walnut)
    for i in range(33): b.box((side*4.958,.43,-5.92+i*.3),(.025,.77,.033),oak)
    for y,w,h in [(.075,.09,.15),(.865,.07,.055),(.90,.08,.025)]:
        b.box((side*(5-w/2),y,-1),(w,h,10),walnut)
b.box((0,1.65,-6.055),(10,3.3,.11),plaster,.37)
# The cabinet covers the centre. Keep the three.js light panel in front of plaster.
for x in [-4.5,4.5]:
    b.box((x,.45,-5.986),(1,.9,.028),walnut)
    b.box((x,.88,-5.97),(1,.045,.06),oak)
b.finish()
b=Mesh('room_ceiling')
for i in range(40): b.box((-4.875+i*.25,3.325,-1),(.249,.05,10),walnut)
for z in [-4.6,-1.15,2.4]:b.box((0,3.22,z),(10,.16,.19),walnut)
b.finish()

b=Mesh('facade')
def wall(x0,x1,y0,y1):
    b.box(((x0+x1)/2,(y0+y1)/2,4),(x1-x0,y1-y0,.3),stucco,.4)
for l,r in [(-12,-4.1),(-.7,.35),(1.55,12)]:wall(l,r,0,7.5)
wall(-4.1,-.7,0,.75);wall(-4.1,-.7,2.65,7.5);wall(.35,1.55,2.45,7.5)
# A fitted timber shopfront with a stepped cornice, fluted pilasters and stone plinths.
for x in [-4.35,-.48,1.8]:
    b.box((x,1.59,4.184),(.24,3.18,.068),paint)
    for off in [-.073,0,.073]:b.box((x+off,1.67,4.229),(.023,2.55,.027),paint)
    for y,w,h,depth in [(.23,.32,.46,.16),(.48,.30,.035,.14),(3.08,.33,.12,.14),(3.17,.39,.06,.19)]:
        b.box((x,y,4.15+depth/2),(w,h,depth),paver if y<.3 else paint)
for y,h,depth,width in [(2.79,.18,.095,3.72),(3.19,.065,.18,6.59),(3.25,.06,.26,6.68),(3.31,.07,.39,6.82),(3.355,.025,.43,6.88)]:
    b.box((-2.41 if y<3 else -1.27,y,4.15+depth/2),(width,h,depth),brass if y>3.35 else paint)
for i in range(8):
    x=-3.89+i*.424
    b.box((x,.39,4.178),(.406,.6,.056),paint)
    b.box((x,.39,4.21),(.32,.46,.016),walnut)
b.box((-2.4,.735,4.11),(3.65,.07,.51),paver)
for x in [-6.5,4.7,8.4]:
    b.tube([(x,7.5,4.25),(x,3.5,4.25),(x+.14,3.32,4.26),(x+.14,.19,4.26),(x+.14,.13,4.34)],.049,iron,12)
    for y in [.55,2.3,4.5,6.8]:b.box((x+(y<3)*.14,y,4.2),(.15,.028,.14),brass)
# Two hand-thrown planters on the outer sill with branching, folded leaves.
clay=mat('Iron rich earthenware',(142,88,63),.78,kind='plaster',n=256)
greens=[mat('Sage '+str(i),col,.7) for i,col in enumerate([(64,83,56),(93,111,70),(117,132,87)])]
for px,pz,size in [(-3.69,4.22,1),(-3.41,4.23,.65)]:
    base=.77
    b.lathe(px,pz,[(r*size,base+h*size) for r,h in [(.075,0),(.083,.014),(.108,.136),(.118,.138),(.118,.16),(.106,.164),(.098,.146),(0,.145)]],clay,36)
    for j in range(26):
        a=random.uniform(0,tau); reach=random.uniform(.062,.16)*size
        h=random.uniform(.12,.31)*size
        stem=[Vector((px+cos(a)*reach*t**1.6,base+.145*size+h*t,pz+sin(a)*reach*t**1.6)) for t in [0,.3,.6,1]]
        b.tube(stem,.0019*size,greens[0],4)
        for k in range(1,8):
            t=k/8;d=a+(-1 if k%2 else 1)*.8
            at=Vector((px+cos(a)*reach*t**1.6,base+.145*size+h*t,pz+sin(a)*reach*t**1.6))
            tip=at+Vector((.054*cos(d),.015+.013*t,.054*sin(d)))*size
            mid=(tip+at)*.5;across=Vector((-sin(d),0,cos(d)))*(.012*size)
            verts=[b.vert(v) for v in [at,mid+across,tip,mid-across,mid+Vector((0,.004*size,0))]]
            for q in range(4):b.face([verts[q],verts[(q+1)%4],verts[4]],greens[j%3])
# Upper-storey recessed-looking sashes and lintels.
for x in [-9,-5.8,-2.6,.6,3.8,7,10.2]:
    b.box((x,5.43,4.166),(1.28,1.64,.032),walnut)
    for s in [-1,1]:
        for t in [-1,1]: b.box((x+s*.26,5.43+t*.33,4.19),(.475,.61,.019),iron)
    b.box((x,4.60,4.24),(1.48,.10,.24),paver)
    b.box((x,6.28,4.20),(1.43,.12,.17),stucco)
b.finish()
b=Mesh('window_frame')
for x,w in [(-4.064,.072),(-3.05,.047),(-1.80,.047),(-.736,.072)]:
    b.box((x,1.70,4.045),(w,1.90,.16),walnut)
for y,h in [(.79,.08),(2.23,.055),(2.61,.08)]:
    b.box((-2.4,y,4.047),(3.4,h,.17),walnut)
    b.box((-2.4,y-h/2+.007,4.14),(3.4,.014,.015),brass)
b.finish()
simple('window_glass',(-2.4,1.70,4),(3.4,1.90,.003),pane)
b=Mesh('door',(.35,0,3.98))
for i in range(9):
    l=1.18*i/9;r=1.18*(i+1)/9
    # Split each board at the true glazed slit.
    for left,right in zip(sorted({l,r,max(l,min(r,.22)),max(l,min(r,.38))}),sorted({l,r,max(l,min(r,.22)),max(l,min(r,.38))})[1:]):
        spans=[(0,.6),(2.1,2.43)] if .22<(left+right)/2<.38 else [(0,2.43)]
        for bot,top in spans:
            b.box((.35+(left+right)/2,(bot+top)/2,3.98),(right-left,top-bot,.05),walnut)
door=b.finish()
b=Mesh('door_slit',(.65,1.35,3.98));b.box((.65,1.35,3.98),(.16,1.5,.017),honey);b.finish(door)
b=Mesh('door_knob',(1.39,1.05,4.042))
for y in [.925,1.175]:
    b.box((1.39,y,4.008),(.044,.052,.012),brass)
b.tube([(1.39,.925,4.007),(1.39,.925,4.052),(1.39,.94,4.065),(1.39,1.16,4.065),(1.39,1.175,4.052),(1.39,1.175,4.007)],.011,brass,12)
b.finish(door)
b=Mesh('sign_plate',(.95,2.95,4.17));b.box((.95,2.95,4.163),(1.3,.5,.010),paint)
for y in [2.718,3.182]:b.box((.95,y,4.18),(1.26,.007,.005),brass)
for x in [.324,1.576]:b.box((x,2.95,4.18),(.007,.47,.005),brass)
b.finish()
simple('street',(0,-.034,14.075),(40,.06,19.85),asphalt)
b=Mesh('curb')
for i in range(40):
    for j in range(3):
        w=1; x=-20+i
        b.box((x+.5,.06,4+(j+.5)*2.2/3),(.995,.12,2.2/3-.004),paver,.6)
b.finish()
b=Mesh('alley')
for x in range(-18,19,3):
    h=random.uniform(5,10)
    b.box((x,h/2,24.8),(2.98,h,1.6),stucco)
    for y in [2.1,4.7]:
        for off in [-.62,.62]:b.box((x+off,y,23.99),(.75,1.3,.07),iron)
for x in [-15,15]:
    for i in range(4):
        h=random.uniform(4,8);b.box((x,h/2,6+i*4),(3,h,3.9),stucco)
for x,y,z in [(-9,3.2,9),(8.5,3,11)]:
    b.lathe(x,z,[(.17,0),(.17,.12),(.105,.16),(.079,.50),(.049,.55),(.039,y-.22),(.12,y-.18),(.08,y-.12)],iron)
    b.lathe(x,z,[(.07,y-.13),(.116,y-.045),(.116,y+.055),(.068,y+.13)],glow,20)
    b.lathe(x,z,[(.15,y+.08),(.14,y+.13),(.038,y+.21),(0,y+.25)],iron,24)
b.finish()

b=Mesh('counter',(0,0,-1.2))
b.disc(0,.055,-1.2,1.58,.11,dark,120)
b.disc(0,.465,-1.2,1.766,.73,walnut,144)
b.lathe(0,-1.2,[(1.766,.825),(1.766,.977)],dark,144)
for i in range(180):
    a=tau*i/180
    b.tube([(1.762*cos(a),.11,-1.2+1.762*sin(a)),(1.762*cos(a),.922,-1.2+1.762*sin(a))],.018,oak,8)
b.ring(0,.135,-1.2,1.776,.007,brass,144)
# Each 60-degree sector is an annulus between one well and the sector boundary.
for i in range(6):
    a=pi/2+i*tau/6
    def point(r,t):return (r*cos(t),r*sin(t))
    edge=[point(1.893*j/18,a-pi/6) for j in range(18)]
    edge += [point(1.893,a-pi/6+j*pi/90) for j in range(30)]
    edge += [point(1.893*(1-j/18),a+pi/6) for j in range(18)]
    cx,cz=point(1.24,a)
    inner=[(cx+.3*(x-cx)/hypot(x-cx,z-cz),cz+.3*(z-cz)/hypot(x-cx,z-cz)) for x,z in edge]
    for y in [.98,1.05]:
        outer=[b.vert((x,y,z-1.2)) for x,z in edge];inside=[b.vert((x,y,z-1.2)) for x,z in inner]
        for j in range(len(edge)):
            k=(j+1)%len(edge);f=[outer[j],inside[j],inside[k],outer[k]]
            b.face(f if y>1 else f[::-1],stone)
b.lathe(0,-1.2,[(1.893,.98),(1.898,.982),(1.9,.987),(1.9,1.043),(1.898,1.048),(1.893,1.05)],stone,180)
b.finish()
for i in range(6):
    a=pi/2+i*tau/6
    x=1.24*cos(a);z=-1.2+1.24*sin(a)
    b=Mesh('well_'+str(i),(x,1.05,z))
    b.lathe(x,z,[(.3,1.05),(.3,.84)],iron,96)
    b.ring(x,1.05,z,.304,.0055,brass,96);b.finish()
    x=1.38*cos(a-.33);z=-1.2+1.38*sin(a-.33)
    b=Mesh('dock_'+str(i),(x,1.065,z));b.disc(x,1.065,z,.06,.03,brass,36)
    b.finish()
    x=2.45*cos(a);z=-1.2+2.45*sin(a)
    b=Mesh('stool_'+str(i),(x,0,z))
    b.lathe(x,z,[(0,.624),(.171,.624),(.188,.632),(.193,.65),(.191,.672),(.179,.68),(0,.68)],oak,48)
    b.ring(x,.635,z,.183,.004,brass)
    for j in range(4):
        t=j*pi/2+a
        b.tube([(x+r*cos(t),y,z+r*sin(t)) for r,y in [(.197,.011),(.19,.10),(.122,.602),(.11,.631)]],.013,iron,10)
    b.ring(x,.23,z,.172,.011,iron);b.finish()
b=Mesh('counter_led',(0,.96,-1.2));b.ring(0,.96,-1.2,1.8,.008,glow,144);b.finish()
b=Mesh('counter_center',(0,1.05,-1.2));b.disc(0,1.05,-1.2,.5,.1,oak,96,.007);b.finish()
b=Mesh('shelf')
for j in range(8):b.box((0,.437+j*.38,-5.84),(8,.026,.3),oak)
for i in range(21):
    x=min(3.987,max(-3.987,-4+i*.4))
    b.box((x,1.767,-5.84),(.026,2.66,.3),oak)
b.box((0,.215,-5.84),(8,.43,.30),walnut)
for j in range(12):
    x=-4+(j+.5)*8/12
    b.box((x,.236,-5.68),(.654,.365,.022),oak)
    b.box((x,.229,-5.665),(.566,.267,.012),walnut)
    b.tube([(x-.045,.34,-5.659),(x-.044,.34,-5.638),(x+.044,.34,-5.638),(x+.045,.34,-5.659)],.005,brass)
b.finish()
for i,(x,z) in enumerate([(-1.6,.2),(-2.6,-2.2),(1.7,-2.6),(2.6,.6)]):
    b=Mesh('pendant_'+str(i),(x,3.3,z))
    b.disc(x,3.284,z,.068,.032,brass)
    b.tube([(x,3.3,z),(x,2.4,z)],.0045,dark)
    b.lathe(x,z,[(.199,2.372),(.196,2.385),(.155,2.401),(.103,2.425),(.071,2.46),(.044,2.505),(.024,2.515),(.024,2.54),(0,2.54)],brass)
    b.lathe(x,z,[(.021,2.50),(.055,2.449),(.11,2.402),(.194,2.37)],plaster)
    b.lathe(x,z,[(0,2.302),(.031,2.312),(.046,2.335),(.048,2.354),(.041,2.38),(.025,2.4),(0,2.407)],glow,32)
    b.finish()
b=Mesh('wall_details')
# Cloak rail, wall lanterns and a slatted return-air grille.
b.box((-4.96,1.67,.4),(.08,.14,1.12),walnut)
for i in range(5):
    z=-.02+i*.21
    b.tube([(-4.92,1.64,z),(-4.85,1.62,z),(-4.81,1.68,z)],.011,brass)
for side,z in [(-1,-2.55),(1,-3.75),(1,1.8)]:
    x=side*4.81
    b.box((side*4.958,1.99,z),(.084,.32,.145),iron)
    b.tube([(side*4.95,1.91,z),(x,1.91,z),(x,1.98,z)],.018,brass)
    b.lathe(x,z,[(.052,1.98),(.077,2.0),(.077,2.18),(.05,2.20)],glow,24)
    for y in [1.99,2.19]:b.disc(x,y,z,.082,.025,brass,32)
b.box((4.974,2.75,-.6),(.05,.34,.75),iron)
for i in range(12):b.box((4.934,2.75,-.93+i*.06),(.033,.29,.017),brass)
b.finish()
export('shop')


