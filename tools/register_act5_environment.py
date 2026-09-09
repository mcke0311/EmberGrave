"""Initial measured registration of the four original ImageGen kit sheets.

No pixels are painted. Ground sockets follow the observed isometric baselines;
the checked-in registration is the source of truth for subsequent imports.
"""
from pathlib import Path
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act5_environment'
NAMES=['east','south','east_alt','south_alt','outer','inner','end_east','end_south',
       'broken_east','broken_south','connector_east','connector_south','door_east','door_south','ground','pillar']
def main():
    kits=[]
    for key in ['biome','defense','bastion','throne']:
        im=Image.open(AUTH/(key+'.png')).convert('RGBA');rows=3 if key=='biome' else 4
        names=NAMES if rows==4 else NAMES[:10]+['ground','pillar']
        cells=list(range(len(names)))
        # The generated throne sheet's actual directions differ from its prompt.
        if key=='throne':cells=[0,2,1,2,4,5,7,6,8,2,10,11,12,13,14,15]
        if key=='throne':cells[8]=9
        if key=='defense':cells[9]=3
        if key=='bastion':cells[12],cells[13]=13,12
        if key=='biome':cells[9]=3
        # Row four's gateway towers cross nominal sheet cells. Use the complete
        # matching open-arch modules in row three rather than clipped towers.
        if key!='biome':cells[12],cells[13]=10,11
        modules=[]
        for name,index in zip(names,cells):
            col,row=index%4,index//4
            cuts={'defense':[0,325,625,940,1254],'bastion':[0,315,598,940,1254],'throne':[0,320,630,940,1254]}.get(key)
            y0=round(cuts[row]*im.height/1254) if cuts else round(row*im.height/rows)
            y1=round(cuts[row+1]*im.height/1254) if cuts else round((row+1)*im.height/rows)
            if index in [8,9] and key!='biome':
                y1={'defense':915,'bastion':905 if index==8 else 908,'throne':910}[key]
            box=[round(col*im.width/4),y0,round((col+1)*im.width/4),y1]
            cell=im.crop(box);a=cell.getchannel('A');bounds=a.point(lambda v:255 if v>12 else 0).getbbox()
            if not bounds:raise ValueError((key,name))
            l,t,r,b=bounds;w,h=r-l,b-t
            span=4 if key=='biome' else 6
            if name.startswith('end_'):span=3 if key!='biome' else 4
            if name.startswith(('door_','connector_')):span=8
            if name=='pillar':span=1.4 if key!='biome' else 3
            if name in ['outer','inner']:span=6 if key!='biome' else 4
            dx=w*.76;x0=l+w*.12;x1=r-w*.12;bottom=b-h*.075
            y0,y1=(bottom,bottom-dx*.5) if 'south' in name else (bottom-dx*.5,bottom)
            anchor=[(x0+x1)/2,(y0+y1)/2]
            if name in ['outer','inner','pillar','ground']:
                anchor=[(l+r)/2,b-h*(.16 if name=='pillar' else .28 if name=='outer' else .12 if name=='inner' else .5)]
            modules.append(dict(name=name,box=box,span=span,sockets=[[round(x0,2),round(y0,2)],[round(x1,2),round(y1,2)]],anchor=[round(v,2) for v in anchor]))
        kits.append(dict(key=key,source=key+'.png',modules=modules))
    (AUTH/'registration.json').write_text(json.dumps(dict(revision=1,kits=kits),indent=2)+'\n')
if __name__=='__main__':main()
