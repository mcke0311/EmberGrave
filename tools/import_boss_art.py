"""Extract authored transparent boss cutouts, register poses, and pack lossless atlases.

The generator's cells are guides: connected weapon/wing pixels may extend into a
gutter. Component ownership keeps those pixels with their actor instead of slicing
off an axe at a mathematical grid boundary. Original PNGs remain untouched.
"""
from __future__ import annotations
import argparse
from collections import deque
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "assets/bosses/sources.json"
MANIFEST = ROOT / "js/sprite_manifest.js"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract_frames(source, phases, source_cols=6, count=None):
    image = Image.open(source).convert("RGBA")
    w, h = image.size
    alpha = image.getchannel("A")
    binary = bytearray(alpha.point(lambda a: 255 if a >= 96 else 0).tobytes())
    count = count or phases*6
    rows = count//source_cols
    masks = [bytearray(w*h) for _ in range(count)]
    components = []
    for seed in range(w*h):
        if not binary[seed]:
            continue
        binary[seed] = 0
        queue = deque([seed])
        pixels = []
        sx = sy = 0
        while queue:
            k = queue.popleft()
            pixels.append(k)
            x, y = k % w, k // w
            sx += x
            sy += y
            for n in (k-1 if x else -1, k+1 if x+1 < w else -1, k-w, k+w):
                if 0 <= n < w*h and binary[n]:
                    binary[n] = 0
                    queue.append(n)
        if len(pixels) < 8:
            continue
        cx, cy = sx/len(pixels), sy/len(pixels)
        col, row = min(source_cols-1, int(cx/(w/source_cols))), min(rows-1, int(cy/(h/rows)))
        owner = row*source_cols+col
        for k in pixels:
            masks[owner][k] = 255
        if len(pixels) > 500:
            components.append({"frame": owner, "area": len(pixels), "center": [round(cx,1),round(cy,1)]})
    frames = []
    boxes = []
    # A single scale per phase preserves relative size across combat poses.
    cutouts = []
    for mask in masks:
        owned = Image.frombytes("L", (w,h), bytes(mask)).filter(ImageFilter.MaxFilter(7))
        cutout = image.copy()
        cutout.putalpha(ImageChops.multiply(alpha, owned))
        box = cutout.getbbox()
        if not box:
            raise ValueError(f"Missing pose in {source}")
        boxes.append(list(box))
        cutouts.append(cutout.crop(box))
    for row in range(phases):
        poses = cutouts[row*6:min(count,(row+1)*6)]
        scale = min(224 / max(p.width for p in poses), 222 / max(p.height for p in poses))
        for pose in poses:
            size = (max(1,round(pose.width*scale)),max(1,round(pose.height*scale)))
            reduced = pose.resize(size, Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", (256,256))
            frame.alpha_composite(reduced, (128-size[0]//2, 236-size[1]))
            frames.append(frame)
    return frames, boxes, components


def pack():
    from build_sprite_assets import actor_hit_shape
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    entries, mapping, reports = {}, {}, {}
    outdir = ROOT / "assets/bosses/packed"
    outdir.mkdir(parents=True, exist_ok=True)
    previews = ROOT / "tests/qa/bosses/art"
    previews.mkdir(parents=True, exist_ok=True)
    for key, spec in config["bosses"].items():
        sources = spec.get("phaseSources", [spec])
        frames, boxes, components, provenance = [], [], [], []
        for source_spec in sources:
            source = ROOT / source_spec["source"]
            ff, bb, cc = extract_frames(source,1 if "phaseSources" in spec else spec["phases"],source_spec.get("sourceCols",6))
            for component in cc: component["frame"] += len(frames)
            frames.extend(ff); boxes.extend(bb); components.extend(cc)
            provenance.append({"source":source_spec["source"],"sha256":digest(source)})
        atlas = Image.new("RGBA", (1536,256*spec["phases"]))
        for i, frame in enumerate(frames):
            atlas.alpha_composite(frame, ((i%6)*256,(i//6)*256))
        output = outdir / (key+".webp")
        atlas.save(output,"WEBP",lossless=True,method=6)
        asset_id = "actor.boss."+key
        entries[asset_id] = {"kind":"atlas","src":output.relative_to(ROOT).as_posix(),"revision":digest(output)[:12],
            "cell":[256,256],"cols":6,"rows":spec["phases"],"anchor":[128,236],"bundle":"boss:"+key,
            "bossArt":True,"isolateFrameSampling":True,"hitShapes":[actor_hit_shape(f) for f in frames]}
        mapping[key] = asset_id
        reports[key] = {"sources":provenance,"output":output.relative_to(ROOT).as_posix(),
            "sha256":digest(output),"frames":len(frames),"sourceBoxes":boxes,"components":components}
        review = Image.new("RGBA",atlas.size,"#343940")
        review.alpha_composite(atlas)
        draw = ImageDraw.Draw(review)
        for i, name in enumerate(config["poses"]):
            for row in range(spec["phases"]):draw.text((i*256+8,row*256+240),f"{row+1}: {name}",fill="white")
        review.convert("RGB").save(previews/(key+".jpg"),quality=93)
    parts = {}
    for key, spec in config.get("parts",{}).items():
        source=ROOT/spec["source"]
        frames, _, _=extract_frames(source,1,spec["sourceCols"],spec["count"])
        atlas=Image.new("RGBA",(256*len(frames),256))
        for i,frame in enumerate(frames):atlas.alpha_composite(frame,(i*256,0))
        output=outdir/(key+".webp");atlas.save(output,"WEBP",lossless=True,method=6)
        entries["actor.boss."+key]={"kind":"atlas","src":output.relative_to(ROOT).as_posix(),"revision":digest(output)[:12],"cell":[256,256],"cols":len(frames),"rows":1,"anchor":[128,128],"bundle":spec["bundle"],"bossArt":True,"isolateFrameSampling":True}
        parts[key]={"sources":[{"source":spec["source"],"sha256":digest(source)}],"output":output.relative_to(ROOT).as_posix(),"sha256":digest(output)}
    report={"version":1,"method":"authored-alpha-component-extraction-v1","cell":[256,256],"bosses":reports,"parts":parts,"entries":entries,"maps":{"bosses":mapping}}
    (ROOT/"assets/bosses/import.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    return report


def install(entries, maps):
    """Called by the main compiler as well as the focused boss import."""
    report=json.loads((ROOT/"assets/bosses/import.json").read_text(encoding="utf-8"))
    for key, spec in {**report["bosses"],**report.get("parts",{})}.items():
        if any(digest(ROOT/s["source"])!=s["sha256"] for s in spec["sources"]) or digest(ROOT/spec["output"])!=spec["sha256"]:
            raise ValueError("Boss art changed; rerun tools/import_boss_art.py: "+key)
    entries.update(report["entries"])
    maps["bosses"]=report["maps"]["bosses"]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check",action="store_true",help="verify source and packed hashes without rewriting")
    args=parser.parse_args()
    if args.check:
        entries,maps={},{};install(entries,maps)
        manifest=json.loads(MANIFEST.read_text(encoding="utf-8").split("DATA.SPRITE_MANIFEST = ",1)[1].strip().removesuffix(";"))
        assert manifest["maps"]["bosses"]==maps["bosses"],"Boss mapping changed"
        for key,entry in entries.items():
            assert manifest["entries"][key]==entry,"Boss manifest changed: "+key
            atlas=Image.open(ROOT/entry["src"])
            assert atlas.mode=="RGBA",key+" requires alpha"
            for n in range(entry["cols"]*entry["rows"]):
                x=n%entry["cols"]*256;y=n//entry["cols"]*256
                alpha=atlas.crop((x,y,x+256,y+256)).getchannel("A")
                bounds=alpha.getbbox()
                assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<256 and bounds[3]<256,key+" empty or clipped pose"
        print("PASS: 96 boss poses and five armor parts; alpha, padding, manifest and source/packed hashes")
        return
    report=pack()
    text=MANIFEST.read_text(encoding="utf-8")
    manifest=json.loads(text.split("DATA.SPRITE_MANIFEST = ",1)[1].rstrip().removesuffix(";"))
    install(manifest["entries"],manifest["maps"])
    MANIFEST.write_text('/* Generated by tools/build_sprite_assets.py. Do not hand-edit. */\n"use strict";\n\nDATA.SPRITE_MANIFEST = '+json.dumps(manifest,indent=2,sort_keys=True)+';\n',encoding="utf-8")
    coverage_path=ROOT/"assets/sprites/coverage.json"
    coverage=json.loads(coverage_path.read_text(encoding="utf-8"))
    coverage["assetCount"]=len(manifest["entries"])
    coverage_path.write_text(json.dumps(coverage,indent=2)+"\n",encoding="utf-8")
    print("Packed",sum(b["frames"] for b in report["bosses"].values()),"authored boss poses in six atlases")


if __name__=="__main__":
    main()
