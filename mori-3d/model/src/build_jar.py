import sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
reset()

glass=mat('Hand blown flint',(249,254,251),.03,trans=1)
cork=mat('Quercus suber',(164,118,77),.89,kind='cork',n=256)
flax=mat('Unbleached flax',(169,137,93),.91)

b=Mesh('jar_glass')
b.lathe(0,0,[(0,0),(.060,0),(.066,.001),(.071,.004),(.074,.008),(.075,.014),(.075,.146),(.0745,.158),(.072,.17),(.066,.183),(.065,.186),(.0675,.187),(.0675,.1985),(.066,.2),(.062,.2),(.061,.1985),(.061,.186),(.062,.18),(.066,.154),(.066,.011),(.064,.006),(.060,.004),(0,.004)],glass,36)
b.finish()
b=Mesh('jar_cork',(0,.212,0))
b.lathe(0,0,[(0,.191),(.060,.191),(.061,.192),(.0658,.231),(.066,.232),(.064,.233),(0,.233)],cork,32,12)
b.uv=[(u*4.8,v) for u,v in b.uv]
b.finish()
b=Mesh('jar_twine')
for j,m in enumerate((flax,flax)):
    pts=[]
    for i in range(145):
        a=tau*i/72+.9; twist=a*18+j*pi
        r=.0673+.00083*cos(twist)
        pts.append((r*cos(a),.1833+.005*i/72+.00083*sin(twist),r*sin(a)))
    b.tube(pts,.00125,m,4)
for j in range(2):
    pts=[]
    for i in range(23):
        a=tau*i/22
        pts.append((.041+.0035*cos(a),.188+.0025*sin(a)+j*.0016,.054+.0025*sin(a)))
    b.tube(pts,.0014,flax,5)
b.tube([(.041,.187,.055),(.043,.182,.057),(.044,.177,.059),(.042,.174,.06)],.0016,flax,6)
b.finish()
export('jar')


