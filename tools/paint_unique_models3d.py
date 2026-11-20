"""Prepare the equipped-item paint atlas from the authored inventory paintings."""
from collections import deque
from io import BytesIO
from math import atan, degrees, hypot

from PIL import Image, ImageChops, ImageDraw


CELL, GUTTER, COLUMNS, ROWS = 192, 3, 12, 10
THRESHOLD = [0] * 36 + [255] * 220


def opaque_crop(image):
    bounds = image.getchannel('A').point(THRESHOLD).getbbox()
    return image.crop(bounds) if bounds else image


def single_limb(image):
    """Separate the rightmost painted boot or gauntlet from its matching pair."""
    mask = image.getchannel('A').point(THRESHOLD)
    w, h = image.size
    remaining = bytearray(mask.tobytes())
    components = []
    for i in range(len(remaining)):
        if not remaining[i]:
            continue
        queue, pixels = deque([i]), []
        remaining[i] = 0
        while queue:
            p = queue.pop()
            pixels.append(p)
            x, y = p % w, p // w
            for n in (p-1 if x else p, p+1 if x+1<w else p,
                      p-w if y else p, p+w if y+1<h else p):
                if remaining[n]:
                    remaining[n] = 0
                    queue.append(n)
        if len(pixels) > w*h*.035:
            components.append(pixels)
    if len(components) >= 2:
        pair = sorted(components, key=len, reverse=True)[:2]
        chosen = max(pair, key=lambda part: sum(p % w for p in part) / len(part))
        selected = bytearray(w*h)
        for p in chosen:
            selected[p] = 255
        image.putalpha(ImageChops.multiply(image.getchannel('A'), Image.frombytes('L', image.size, bytes(selected))))
    else:
        image = image.crop((w//2, 0, w, h))
    return opaque_crop(image)


def straighten(image, recipe):
    angle = 225 if recipe['id'] == 'u_widow' else 45
    def rotated(a):
        return opaque_crop(image.rotate(a, Image.Resampling.BICUBIC, expand=True))
    upright = rotated(angle)
    if recipe['category'] == 'bow':
        return upright
    # Find the shaft axis below the head. A tilted axe head or a long guard
    # makes principal-axis alignment of the entire silhouette unreliable.
    alpha = upright.getchannel('A').point(THRESHOLD)
    centers = []
    for y in range(int(.64*upright.height), int(.88*upright.height), 3):
        span = alpha.crop((0, y, upright.width, y+1)).getbbox()
        if span:
            centers.append((y, (span[0]+span[2])/2))
    if len(centers) >= 3:
        cy, cx = (sum(v)/len(centers) for v in zip(*centers))
        slope = sum((y-cy)*(x-cx) for y, x in centers) / sum((y-cy)**2 for y, _ in centers)
        upright = rotated(angle + max(-18, min(18, -degrees(atan(slope)))))
    return upright


# Height of the cutting head above the pommel, measured on the upright
# painting. Hardware below this mark comes from the modeled socket or guard.
CUTS = {
    'dawn':.397, 'fork':.408, 'saw':.412, 'cleaver':.439, 'crescent':.414,
    'obsidian':.432, 'aurora':.409, 'vow':.379, 'flame':.382, 'royal':.385,
    'lock':.372, 'sun':.38, 'gilded':.374, 'throne':.397,
    'dirk':.464, 'fang':.48, 'moon':.46, 'coffin':.456, 'segments':.39,
    'serpent':.437, 'thorn':.43, 'leaf':.458,
    'jaw':.465, 'crown':.54, 'hook':.532, 'double':.643, 'square':.59,
    'fragment':.573, 'femur':.52, 'cathedral':.532, 'tusk':.495, 'ribs':.55,
    'wolf':.54, 'dragon':.555, 'antler':.535,
    'comet':.735, 'zigzag':.758, 'wing':.715, 'trident':.745,
    'ribbon':.66, 'feather':.686,
}


def simplify(points, tolerance):
    ax, ay = points[0]
    bx, by = points[-1]
    span = hypot(bx-ax, by-ay)
    if not span or len(points)<3:
        return [points[0], points[-1]]
    distance, split = max((abs((bx-ax)*(ay-y)-(ax-x)*(by-ay))/span, i)
                          for i, (x,y) in enumerate(points[1:-1], 1))
    if distance <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[:split+1], tolerance)[:-1] + simplify(points[split:], tolerance)


def head_contours(image, recipe):
    cut = .423 if recipe['category']=='axe' and recipe['shape']=='cleaver' else CUTS[recipe['shape']]
    mask = image.getchannel('A').resize((round(200*image.width/image.height), 200), Image.Resampling.LANCZOS)
    w, height = mask.size
    h = round(height*(1-cut))
    # The grip locates the tang even when an axe is very asymmetric.
    low = mask.point(THRESHOLD)
    grip = [low.crop((0, y, w, y+1)).getbbox() for y in range(142, 163)]
    centers = sorted((b[0]+b[2])/2 for b in grip if b)
    cx = centers[len(centers)//2]
    if recipe['category'] in ('sword','dagger','spear'):
        # High guard tips may cross the cutting plane as separate islands.
        # Follow the steel connected to the blade and center its foot on the tang.
        head = mask.crop((0,0,w,h)).point([0]*105+[255]*151)
        candidates = []
        for y in range(h):
            run = head.crop((0,y,w,y+1)).getbbox()
            if run:
                candidates.append((run[2]-run[0], y))
            if len(candidates)==8: break
        _, y = max(candidates)
        seed = next(x for x in range(w) if head.getpixel((x,y)))
        ImageDraw.floodfill(head, (seed,y), 128)
        head = head.point([255 if v==128 else 0 for v in range(256)])
        base = head.crop((0,h-3,w,h)).getbbox()
        if base:
            cx = (base[0]+base[2])/2
            mask = head
    px = mask.load()
    edges = {}
    def edge(a,b):
        edges.setdefault(a, []).append(b)
    for y in range(h):
        for x in range(w):
            if px[x,y] < 105:
                continue
            if y==0 or px[x,y-1]<105: edge((x,y), (x+1,y))
            if x+1==w or px[x+1,y]<105: edge((x+1,y), (x+1,y+1))
            if y+1==h or px[x,y+1]<105: edge((x+1,y+1), (x,y+1))
            if x==0 or px[x-1,y]<105: edge((x,y+1), (x,y))
    paths = []
    while edges:
        start = p = next(iter(edges))
        path = [p]
        while True:
            options = edges[p]
            q = options.pop()
            if not options: del edges[p]
            path.append(q)
            if q == start: break
            p = q
        area = abs(sum(x*by-bx*y for (x,y),(bx,by) in zip(path,path[1:])))/2
        if area < max(6, w*h*.0012): continue
        opposite = max(range(len(path)), key=lambda i:hypot(path[i][0]-start[0],path[i][1]-start[1]))
        ring = simplify(path[:opposite+1], .85)[:-1]+simplify(path[opposite:], .85)[:-1]
        if len(ring)>=3:
            paths.append((area, [[round((x-cx)/h,3),round(1-y/h,3)] for x,y in ring]))
    assert paths, recipe['id']
    return {'cut':cut,'loops':[ring for _,ring in sorted(paths,reverse=True)]}


def item_image(root, recipe):
    with Image.open(root/recipe['reference']['source']) as source:
        image = opaque_crop(source.convert('RGBA'))
    image.thumbnail((550, 550), Image.Resampling.LANCZOS)
    if recipe['slot'] == 'main':
        image = straighten(image, recipe)
    elif recipe['slot'] in ('gloves', 'boots'):
        image = single_limb(image)

    return image


def item_cell(image, recipe):
    # Register each horizontal section with the corresponding section of the
    # sculpt. Retain the transparent holes between prongs and in open metalwork.
    size = CELL-2*GUTTER
    strip = image.resize((image.width, size), Image.Resampling.LANCZOS)
    alpha = strip.getchannel('A').point(THRESHOLD)
    cell = Image.new('RGBA', (CELL, CELL))
    for y in range(size):
        row = strip.crop((0, y, strip.width, y+1))
        bounds = alpha.crop((0, y, strip.width, y+1)).getbbox()
        if bounds:
            if recipe['category']=='bow':
                # The live bowstring is a separate animated line. Remove the
                # isolated painted hairline before stretching the wooden limb.
                occupancy = alpha.crop((0,y,strip.width,y+1)).tobytes()
                solid = [x for x in range(2,strip.width-2) if all(occupancy[x-2:x+3])]
                if solid:
                    bounds = (max(0,solid[0]-2),0,min(strip.width,solid[-1]+3),1)
            row = row.crop(bounds).resize((size, 1), Image.Resampling.BICUBIC)
            cell.paste(row, (GUTTER, y+GUTTER))
            cell.paste(row.getpixel((0, 0)), (0, y+GUTTER, GUTTER, y+GUTTER+1))
            cell.paste(row.getpixel((size-1, 0)), (CELL-GUTTER, y+GUTTER, CELL, y+GUTTER+1))
    for y in range(GUTTER):
        cell.paste(cell.crop((0, GUTTER, CELL, GUTTER+1)), (0, y))
        cell.paste(cell.crop((0, CELL-GUTTER-1, CELL, CELL-GUTTER)), (0, CELL-1-y))
    return cell


def build_item_paint(root, models):
    atlas = Image.new('RGBA', (CELL*COLUMNS, CELL*ROWS))
    forgings = {}
    for recipe in models.values():
        i = recipe['paintIndex']
        image = item_image(root, recipe)
        atlas.paste(item_cell(image, recipe), (i%COLUMNS*CELL, i//COLUMNS*CELL))
        if recipe['category'] in ('sword','dagger','axe','spear'):
            forgings[recipe['id']] = head_contours(image, recipe)
    output = BytesIO()
    atlas.save(output, format='WEBP', quality=90, method=5)
    return output.getvalue(), forgings
