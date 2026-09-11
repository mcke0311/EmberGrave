# Whole-silhouette packing with two-dimensional ownership for touching spell trails.
from collections import deque
from PIL import Image, ImageChops, ImageFilter

def cutouts(image, rows, split_touching=False):
    # Own complete connected silhouettes instead of cutting feet/extended hands
    # at the generator's approximate grid lines. Preserve antialiased edges.
    w,h=image.size;alpha=image.getchannel('A');binary=bytearray(alpha.point(lambda a:255 if a>=96 else 0).tobytes())
    parts=[]
    def part(pixels):
        if len(pixels)<8:return
        xs=[k%w for k in pixels];ys=[k//w for k in pixels]
        parts.append({'pixels':pixels,'x':sum(xs)/len(xs),'y':sum(ys)/len(ys),'bounds':(min(xs),min(ys),max(xs),max(ys))})
    for seed in range(w*h):
        if not binary[seed]:continue
        binary[seed]=0;queue=deque([seed]);pixels=[]
        while queue:
            k=queue.popleft();pixels.append(k);x,y=k%w,k//w
            for n in (k-1 if x else -1,k+1 if x+1<w else -1,k-w,k+w):
                if 0<=n<w*h and binary[n]:binary[n]=0;queue.append(n)
        if len(pixels)<8:continue
        counts={}
        for k in pixels:
            c=min(5,int((k%w)/(w/6)));counts[c]=counts.get(c,0)+1
        columns=[c for c,n in counts.items() if n>len(pixels)*.24]
        buckets=[pixels] if len(columns)<2 else [[k for k in pixels if min(columns,key=lambda c:abs((c+.5)*w/6-k%w))==col] for col in columns]
        for body in buckets:
            ys=[k//w for k in body];top,bottom=min(ys),max(ys)
            if rows>1 and bottom-top>h/rows*1.55:
                # Find the narrow connection between vertically touching spell
                # trails, rather than cutting a raised limb at a grid line.
                profile={y:0 for y in range(top,bottom+1)}
                for y in ys:profile[y]+=1
                lo=round(top+(bottom-top)*.35);hi=round(top+(bottom-top)*.65)
                cut=min(range(lo,hi+1),key=lambda y:sum(profile.get(z,0) for z in range(y-2,y+3)))
                part([k for k in body if k//w<cut]);part([k for k in body if k//w>=cut])
            else:part(body)
    # ImageGen's row heights vary with anatomy. Rank complete body silhouettes
    # within each column; a uniform grid can bisect a crouch or assign a brute
    # to the following dragon row. Small detached debris follows its body.
    masks=[bytearray(w*h) for _ in range(rows*6)]
    for col in range(6):
        column=[p for p in parts if min(5,int(p['x']/(w/6)))==col]
        anchors=[]
        for p in sorted(column,key=lambda p:len(p['pixels']),reverse=True):
            if all(abs(p['y']-a['y'])>h/rows*.38 for a in anchors):anchors.append(p)
            if len(anchors)==rows:break
        if len(anchors)!=rows:raise ValueError(f'Column {col}: {len(anchors)} bodies, expected {rows}')
        anchors.sort(key=lambda p:p['y'])
        for p in column:
            row=min(range(rows),key=lambda r:abs(p['y']-anchors[r]['y']))
            for k in p['pixels']:masks[row*6+col][k]=255
    result=[]
    for mask in masks:
        owned=Image.frombytes('L',(w,h),bytes(mask)).filter(ImageFilter.MaxFilter(7))
        frame=image.copy();frame.putalpha(ImageChops.multiply(alpha,owned));box=frame.getbbox()
        if not box:raise ValueError('Missing complete silhouette')
        frame=frame.crop(box)
        # Retain the complete body and nearby debris. Discard detached wisps
        # from adjacent cells and neutral specks left by source compression.
        fw,fh=frame.size;binary=bytearray(frame.getchannel('A').point(lambda a:255 if a>=96 else 0).tobytes());parts=[]
        for seed in range(fw*fh):
            if not binary[seed]:continue
            binary[seed]=0;queue=deque([seed]);pixels=[]
            while queue:
                k=queue.popleft();pixels.append(k);x,y=k%fw,k//fw
                for n in (k-1 if x else -1,k+1 if x+1<fw else -1,k-fw,k+fw):
                    if 0<=n<fw*fh and binary[n]:binary[n]=0;queue.append(n)
            xs=[k%fw for k in pixels];ys=[k//fw for k in pixels]
            parts.append((pixels,(min(xs),min(ys),max(xs),max(ys))))
        parts.sort(key=lambda p:len(p[0]),reverse=True);main=parts[0][1];selected=bytearray(fw*fh)
        for pixels,b in parts:
            dx=max(0,main[0]-b[2],b[0]-main[2]);dy=max(0,main[1]-b[3],b[1]-main[3])
            if len(pixels)>=12 and (dx*dx+dy*dy)**.5<=w/6*.055:
                for k in pixels:selected[k]=255
        mask=Image.frombytes('L',(fw,fh),bytes(selected)).filter(ImageFilter.MaxFilter(5))
        frame.putalpha(ImageChops.multiply(frame.getchannel('A'),mask))
        result.append(frame.crop(frame.getbbox()))
    return result


