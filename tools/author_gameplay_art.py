#!/usr/bin/env python3
"""Freeze approved painted gameplay sources into final-aligned RGBA atlases.

This development-only authoring step is intentionally separate from
``build_sprite_assets.py``.  It may alpha-clean, crop, slice, and uniformly
resize the documented painted source library.  The runtime compiler only
validates hashes and WebP-packs the resulting checked-in PNGs verbatim.

It never reads from ``assets/sprites``: those files are legacy build outputs,
not source art. Independently authored traps, backdrops, forms, adjacency
paths, walls, and cliffs enter only through reviewed, hash-pinned import
reports.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageEnhance

import build_sprite_assets as build


ROOT = Path(__file__).resolve().parents[1]
QA_ROOT = build.GAMEPLAY_ART_ROOT / "qa"
QA_REPORT = QA_ROOT / "painted_source_normalization_v1.json"
NORMALIZED_ROLES = {
    "ground", "hazard", "massif", "prop", "monster", "npc", "summon",
    "item-icons", "skill-icons", "trap", "backdrop", "form", "cliff",
}
MISC_SOURCE_INDEX = {
    "gold": 17, "potR": 18, "potB": 19, "scroll": 20,
    "glyph": 21, "charm": 22, "cache": 23,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def trim(image: Image.Image, threshold: int = 5) -> Image.Image:
    alpha = image.getchannel("A").point(lambda value: 255 if value > threshold else 0)
    box = alpha.getbbox()
    if not box:
        raise RuntimeError("painted source has no visible alpha")
    return image.crop(box)


def contain(image: Image.Image, width: int, height: int) -> Image.Image:
    image = trim(image.convert("RGBA"))
    scale = min(width / image.width, height / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def normalized_icon(image: Image.Image, size: int, pad: int, bottom: int) -> Image.Image:
    fitted = contain(image, size - pad * 2, size - pad * 2)
    cell = Image.new("RGBA", (size, size))
    cell.alpha_composite(fitted, ((size - fitted.width) // 2, bottom - fitted.height))
    return cell


def diamond_mask(size: tuple[int, int]) -> Image.Image:
    width, height = size
    mask = Image.new("L", size)
    ImageDraw.Draw(mask).polygon(
        ((width // 2, 0), (width - 1, height // 2),
         (width // 2, height - 1), (0, height // 2)),
        fill=255,
    )
    return mask


def material_atlas(source: Path, *, hazard: bool) -> tuple[Image.Image, dict]:
    with Image.open(source) as opened:
        painted = opened.convert("RGB")
    width, height = painted.size
    crop_w, crop_h = max(1, width // 2), max(1, height // 2)
    origins = ((0, 0), (width - crop_w, 0), (0, height - crop_h),
               (width - crop_w, height - crop_h))
    atlas = Image.new("RGBA", (256, 32))
    mask = diamond_mask((64, 32))
    for index, (x, y) in enumerate(origins):
        tile = painted.crop((x, y, x + crop_w, y + crop_h)).resize(
            (64, 32), Image.Resampling.LANCZOS,
        ).convert("RGBA")
        if hazard:
            tile = ImageEnhance.Color(tile).enhance(1.25)
        tile.putalpha(mask)
        atlas.alpha_composite(tile, (index * 64, 0))
    return atlas, {
        "variantCrops": [list(origin) + [crop_w, crop_h] for origin in origins],
        "cell": [64, 32], "diamondMask": True,
        "colorSaturation": 1.25 if hazard else 1.0,
        "resampling": "LANCZOS",
    }


def static_atlas(source: Path, role: str, config: dict) -> tuple[Image.Image, list[int], dict]:
    with Image.open(source) as opened:
        painted = opened.convert("RGBA")
    if role == "massif":
        fit = config.get("fit") or 86
        fitted = contain(painted, fit, 112)
        canvas = Image.new("RGBA", (fit, 112))
        canvas.alpha_composite(fitted, ((fit - fitted.width) // 2, 112 - fitted.height))
        return canvas, [fit // 2, 112], {
            "fit": [fit, 112], "placement": "bottom-center", "resampling": "LANCZOS",
        }
    if role == "prop":
        fit = config.get("fit") or 64
        fitted = contain(painted, fit, max(64, round(fit * 1.4)))
        canvas = Image.new("RGBA", (fit, max(64, fitted.height)))
        canvas.alpha_composite(fitted, ((fit - fitted.width) // 2, canvas.height - fitted.height))
        return canvas, [fit // 2, canvas.height - 8], {
            "fitWidth": fit, "maxFitHeight": max(64, round(fit * 1.4)),
            "placement": "bottom-center", "anchorInset": 8, "resampling": "LANCZOS",
        }
    target = (config.get("height") or 66) * 2
    fitted = contain(painted, target, target)
    canvas = Image.new("RGBA", (max(target, fitted.width), target))
    canvas.alpha_composite(fitted, ((canvas.width - fitted.width) // 2, target - fitted.height))
    return canvas, [canvas.width // 2, target], {
        "displayHeight": config.get("height") or 66, "sourcePixelScale": 2,
        "fit": [target, target], "placement": "bottom-center", "resampling": "LANCZOS",
    }


def item_outputs(source: Path) -> dict[str, tuple[Image.Image, dict]]:
    with Image.open(source) as opened:
        sheet = opened.convert("RGBA")
    cells = []
    for index in range(24):
        col, row = index % 6, index // 6
        crop = sheet.crop((col * sheet.width // 6, row * sheet.height // 4,
                           (col + 1) * sheet.width // 6, (row + 1) * sheet.height // 4))
        cells.append(normalized_icon(crop, 64, 3, 61))

    equipment = Image.new("RGBA", (64 * len(build.ITEM_CATEGORIES), 64 * len(build.TIER_MATERIALS)))
    for tier, color in enumerate(build.TIER_MATERIALS):
        tint = Image.new("RGBA", (64, 64), ImageColor.getrgb(color) + (255,))
        for col, _category in enumerate(build.ITEM_CATEGORIES):
            base = cells[col]
            colored = Image.blend(
                base, Image.composite(tint, Image.new("RGBA", base.size), base.getchannel("A")), .24,
            )
            colored.putalpha(base.getchannel("A"))
            equipment.alpha_composite(colored, (col * 64, tier * 64))

    misc = Image.new("RGBA", (64 * len(build.MISC_ICON_NAMES), 64))
    for col, name in enumerate(build.MISC_ICON_NAMES):
        misc.alpha_composite(cells[MISC_SOURCE_INDEX[name]], (col * 64, 0))
    common = {
        "sourceGrid": [6, 4], "sourceCellOrder": "row-major",
        "normalizedCell": [64, 64], "padding": 3, "bottom": 61,
        "resampling": "LANCZOS",
    }
    return {
        "item-icons:equipment": (equipment, {
            **common, "categories": list(build.ITEM_CATEGORIES),
            "materialTiers": list(build.TIER_MATERIALS), "tintBlend": 0.24,
        }),
        "item-icons:misc": (misc, {
            **common, "names": list(build.MISC_ICON_NAMES),
            "sourceIndices": MISC_SOURCE_INDEX,
        }),
    }


def skill_output(source: Path) -> tuple[Image.Image, dict]:
    with Image.open(source) as opened:
        sheet = opened.convert("RGBA")
    box = sheet.getchannel("A").getbbox()
    if not box:
        raise RuntimeError("skill source has no visible art")
    x0, y0, x1, y1 = box
    source_cols, source_rows = 16, 11
    atlas = Image.new("RGBA", (528, 396))
    for index in range(108):
        col, row = index % source_cols, index // source_cols
        left = round(x0 + col * (x1 - x0) / source_cols)
        right = round(x0 + (col + 1) * (x1 - x0) / source_cols)
        top = round(y0 + row * (y1 - y0) / source_rows)
        bottom = round(y0 + (row + 1) * (y1 - y0) / source_rows)
        frame = sheet.crop((left, top, right, bottom)).resize((44, 44), Image.Resampling.LANCZOS)
        atlas.alpha_composite(frame, ((index % 12) * 44, (index // 12) * 44))
    return atlas, {
        "sourceAlphaBBox": list(box), "sourceGrid": [source_cols, source_rows],
        "outputGrid": [12, 9], "cell": [44, 44], "frameCount": 108,
        "resampling": "LANCZOS",
    }


def painted_sources(art: dict, monsters: dict, npcs: dict, summons: dict) -> dict[str, tuple[Path, dict]]:
    sources: dict[str, tuple[Path, dict]] = {}
    for key, config in art.items():
        if not isinstance(config, dict) or "src" not in config:
            continue
        if key.startswith("ground_"):
            sources[f"ground:{key[7:]}"] = (ROOT / config["src"], config)
        elif key.startswith("hazard_"):
            sources[f"hazard:{key[7:]}"] = (ROOT / config["src"], config)
        elif key.startswith("massif_"):
            sources[f"massif:{key[7:]}"] = (ROOT / config["src"], config)
        elif key.startswith("prop_"):
            sources[f"prop:{key[5:]}"] = (ROOT / config["src"], config)
    for role, definitions in (("monster", monsters), ("npc", npcs), ("summon", summons)):
        for key, config in definitions.items():
            if "src" in config:
                sources[f"{role}:{key}"] = (ROOT / config["src"], config)
    return sources


def imported_traps(expected: dict[str, dict]) -> dict[str, tuple[Image.Image, Path, dict]]:
    report_path = build.SRC / "gameplay_art_authored" / "traps" / "import_v1.json"
    if not report_path.is_file():
        return {}
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("version") != 1 or report.get("review") != build.GAMEPLAY_ART_REVIEW:
        raise RuntimeError("trap import report provenance changed")
    alpha_source = ROOT / report["alphaSource"]
    if sha256(alpha_source) != report.get("alphaSha256"):
        raise RuntimeError("trap import alpha source hash changed")
    generated = {}
    for key in build.TRAP_KINDS:
        metadata = report.get("outputs", {}).get(key)
        if not isinstance(metadata, dict):
            raise RuntimeError(f"trap import report is missing {key}")
        output = ROOT / metadata["path"]
        if output != ROOT / expected[f"trap:{key}"]["path"] or sha256(output) != metadata.get("sha256"):
            raise RuntimeError(f"trap import output provenance changed: {key}")
        with Image.open(output) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (32, 24):
                raise RuntimeError(f"trap output must be RGBA PNG 32x24: {key}")
            image = opened.copy()
        generated[f"trap:{key}"] = (image, alpha_source, {
            "importReport": source_rel(report_path), "operation": report["operation"],
            "sourcePanel": metadata["sourcePanel"], "sourceBBox": metadata["sourceBBox"],
            "uniformScale": metadata["uniformScale"], "position": metadata["position"],
        })
    return generated


def imported_backdrops(expected: dict[str, dict]) -> dict[str, tuple[Image.Image, Path, dict]]:
    report_path = build.SRC / "gameplay_art_authored" / "backdrops" / "import_v1.json"
    if not report_path.is_file():
        return {}
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if (report.get("version") != 1 or report.get("review") != build.GAMEPLAY_ART_REVIEW or
            report.get("operation") != "whole-image-resize-v1"):
        raise RuntimeError("backdrop import report provenance changed")
    generated = {}
    for key in build.BACKDROP_THEMES:
        metadata = report.get("outputs", {}).get(key)
        if not isinstance(metadata, dict):
            raise RuntimeError(f"backdrop import report is missing {key}")
        origin = ROOT / metadata["source"]
        output = ROOT / metadata["path"]
        if (sha256(origin) != metadata.get("sourceSha256") or
                output != ROOT / expected[f"backdrop:{key}"]["path"] or
                sha256(output) != metadata.get("sha256")):
            raise RuntimeError(f"backdrop import provenance changed: {key}")
        with Image.open(output) as opened:
            if (opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (1920, 1080)):
                raise RuntimeError(f"backdrop output must be RGBA PNG 1920x1080: {key}")
            if opened.getchannel("A").getextrema() != (255, 255):
                raise RuntimeError(f"backdrop output must remain fully opaque: {key}")
            image = opened.copy()
        generated[f"backdrop:{key}"] = (image, origin, {
            "importReport": source_rel(report_path),
            "operation": report["operation"],
            "sourceSize": metadata["sourceSize"],
            "outputSize": metadata["size"],
            "resampling": metadata["resampling"],
        })
    return generated


def imported_forms(expected: dict[str, dict]) -> dict[str, tuple[Image.Image, Path, dict]]:
    report_path = build.SRC / "gameplay_art_authored" / "forms" / "import_v1.json"
    if not report_path.is_file():
        return {}
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if (report.get("version") != 1 or report.get("review") != build.GAMEPLAY_ART_REVIEW or
            report.get("operation") != "whole-object-alpha-clean-and-uniform-scale-v1"):
        raise RuntimeError("form import report provenance changed")
    generated = {}
    for key in build.FORM_IDS:
        metadata = report.get("outputs", {}).get(key)
        if not isinstance(metadata, dict):
            raise RuntimeError(f"form import report is missing {key}")
        origin = ROOT / metadata["alphaSource"]
        output = ROOT / metadata["path"]
        if (sha256(origin) != metadata.get("alphaSha256") or
                output != ROOT / expected[f"form:{key}"]["path"] or
                sha256(output) != metadata.get("sha256")):
            raise RuntimeError(f"form import provenance changed: {key}")
        with Image.open(output) as opened:
            if (opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (192, 192)):
                raise RuntimeError(f"form output must be RGBA PNG 192x192: {key}")
            image = opened.copy()
        generated[f"form:{key}"] = (image, origin, {
            "importReport": source_rel(report_path),
            "operation": report["operation"],
            "sourceBBox": metadata["sourceBBox"],
            "uniformScale": metadata["uniformScale"],
            "position": metadata["position"],
        })
    return generated


def imported_walls(expected: dict[str, dict]) -> dict[str, tuple[Image.Image, Path, dict]]:
    report_path = build.SRC / "gameplay_art_authored" / "walls" / "import_v1.json"
    if not report_path.is_file():
        return {}
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if (report.get("version") != 1 or report.get("review") != build.GAMEPLAY_ART_REVIEW or
            report.get("operation") != "painted-two-source-16-mask-composite-v1" or
            report.get("wallContract") != build.WALL_CONTRACT):
        raise RuntimeError("wall import report provenance changed")
    generated = {}
    for key in build.WALL_THEMES:
        metadata = report.get("themes", {}).get(key)
        if not isinstance(metadata, dict):
            raise RuntimeError(f"wall import report is missing {key}")
        wall_source = ROOT / metadata["wallSource"]
        cell_source = ROOT / metadata["cellSource"]
        output = ROOT / metadata["path"]
        if (sha256(wall_source) != metadata.get("wallSourceSha256") or
                sha256(cell_source) != metadata.get("cellSourceSha256") or
                output != ROOT / expected[f"wall:{key}"]["path"] or
                sha256(output) != metadata.get("sha256")):
            raise RuntimeError(f"wall import provenance changed: {key}")
        with Image.open(output) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (512, 512):
                raise RuntimeError(f"wall output must be RGBA PNG 512x512: {key}")
            image = opened.copy()
        generated[f"wall:{key}"] = (image, wall_source, {
            "importReport": source_rel(report_path),
            "operation": report["operation"],
            "secondarySource": relative_or_error(cell_source),
            "secondarySourceSha256": metadata["cellSourceSha256"],
            "wallContract": report["wallContract"],
            "qa": metadata["qa"],
        })
    return generated


def imported_paths(expected: dict[str, dict]) -> dict[str, tuple[Image.Image, Path, dict]]:
    report_path = build.SRC / "gameplay_art_authored" / "paths" / "import_v1.json"
    if not report_path.is_file():
        return {}
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if (report.get("version") != 1 or report.get("review") != build.GAMEPLAY_ART_REVIEW or
            report.get("operation") != "fixed-nominal-panel-slice-and-shared-resize-v2" or
            report.get("cell") != [64, 32] or report.get("atlas") != [256, 128]):
        raise RuntimeError("path import report provenance changed")
    expected_sockets = {
        "N": [48, 8], "E": [48, 24], "S": [16, 24], "W": [16, 8],
        "windowRadius": 2,
    }
    if report.get("socketSemantics") != expected_sockets:
        raise RuntimeError("path import report does not use reviewed isometric midpoint sockets")
    generated = {}
    materials = report.get("materials", {})
    for key in build.THEMES:
        metadata = report.get("outputs", {}).get(key)
        if not isinstance(metadata, dict):
            raise RuntimeError(f"path import report is missing {key}")
        material = metadata.get("material")
        material_meta = materials.get(material)
        if not isinstance(material_meta, dict):
            raise RuntimeError(f"path import material metadata is missing: {material}")
        chroma_source = ROOT / material_meta["chromaSource"]
        alpha_source = ROOT / material_meta["alphaSource"]
        output = ROOT / metadata["path"]
        if (sha256(chroma_source) != material_meta.get("chromaSha256") or
                sha256(alpha_source) != material_meta.get("alphaSha256") or
                output != ROOT / expected[f"path:{key}"]["path"] or
                sha256(output) != metadata.get("sha256")):
            raise RuntimeError(f"path import provenance changed: {key}")
        with Image.open(output) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (256, 128):
                raise RuntimeError(f"path output must be RGBA PNG 256x128: {key}")
            image = opened.copy()
        generated[f"path:{key}"] = (image, alpha_source, {
            "importReport": source_rel(report_path),
            "operation": report["operation"],
            "material": material,
            "chromaSource": relative_or_error(chroma_source),
            "chromaSourceSha256": material_meta["chromaSha256"],
            "sourceSize": report["sourceSize"],
            "sourcePanelBounds": material_meta["sourcePanelBounds"],
            "socketSemantics": report["socketSemantics"],
            "cell": report["cell"],
            "atlas": report["atlas"],
        })
    return generated


def imported_cliffs(expected: dict[str, dict]) -> dict[str, tuple[Image.Image, Path, dict]]:
    report_path = build.SRC / "gameplay_art_authored" / "cliffs" / "import_v1.json"
    if not report_path.is_file():
        return {}
    report = json.loads(report_path.read_text(encoding="utf-8"))
    contract = report.get("contract")
    expected_contract = {
        "size": [256, 256], "cell": [64, 128], "cols": 4, "rows": 2,
        "anchor": [32, 0], "frames": 8,
        "frameOrder": [
            "southwest_1", "southwest_2", "southwest_3", "southwest_4",
            "southeast_1", "southeast_2", "southeast_3", "southeast_4",
        ],
    }
    if (report.get("version") != 1 or report.get("review") != build.GAMEPLAY_ART_REVIEW or
            report.get("operation") != "alpha-clean-slice-shared-uniform-resize-v1" or
            contract != expected_contract):
        raise RuntimeError("cliff import report provenance changed")
    prompt_manifest = ROOT / report.get("promptManifest", "")
    if (not prompt_manifest.is_file() or
            sha256(prompt_manifest) != report.get("promptManifestSha256")):
        raise RuntimeError("cliff prompt provenance changed")
    generated = {}
    for key in build.THEMES:
        metadata = report.get("themes", {}).get(key)
        if not isinstance(metadata, dict):
            raise RuntimeError(f"cliff import report is missing {key}")
        raw_source = ROOT / metadata["rawSource"]
        alpha_source = ROOT / metadata["alphaSource"]
        output = ROOT / metadata["path"]
        if (sha256(raw_source) != metadata.get("rawSourceSha256") or
                sha256(alpha_source) != metadata.get("alphaSourceSha256") or
                output != ROOT / expected[f"cliff:{key}"]["path"] or
                sha256(output) != metadata.get("sha256")):
            raise RuntimeError(f"cliff import provenance changed: {key}")
        with Image.open(output) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (256, 256):
                raise RuntimeError(f"cliff output must be RGBA PNG 256x256: {key}")
            image = opened.copy()
        generated[f"cliff:{key}"] = (image, alpha_source, {
            "importReport": source_rel(report_path),
            "operation": report["operation"],
            "promptManifest": source_rel(prompt_manifest),
            "rawSource": relative_or_error(raw_source),
            "rawSourceSha256": metadata["rawSourceSha256"],
            "alphaClean": metadata["alphaClean"],
            "sourceSize": metadata["sourceSize"],
            "uniformScale": metadata["uniformScale"],
            "contract": contract,
            "qa": metadata["qa"],
        })
    return generated


def relative_or_error(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def qa_contact_sheet(images: list[tuple[str, Image.Image]], path: Path, thumb: tuple[int, int]) -> None:
    cols = min(6, max(1, len(images)))
    label_h = 22
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * thumb[0], rows * (thumb[1] + label_h)), (24, 20, 18, 255))
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(images):
        col, row = index % cols, index // cols
        preview = image.copy()
        preview.thumbnail((thumb[0] - 8, thumb[1] - 8), Image.Resampling.LANCZOS)
        x = col * thumb[0] + (thumb[0] - preview.width) // 2
        y = row * (thumb[1] + label_h) + (thumb[1] - preview.height) // 2
        sheet.alpha_composite(preview, (x, y))
        draw.text((col * thumb[0] + 4, row * (thumb[1] + label_h) + thumb[1] + 3), label, fill=(235, 224, 205, 255))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, "PNG", compress_level=7)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write final PNGs, provenance, and QA sheets")
    args = parser.parse_args()

    data = build.DATA_JS.read_text(encoding="utf-8")
    art, monsters, npcs, summons = build.parse_art_entries(data)
    expected = build._expected_gameplay_descriptors(art, monsters, npcs, summons)
    origins = painted_sources(art, monsters, npcs, summons)
    generated: dict[str, tuple[Image.Image, Path, dict]] = {}

    for descriptor_key, (source, config) in origins.items():
        role = descriptor_key.split(":", 1)[0]
        if role in ("ground", "hazard"):
            image, parameters = material_atlas(source, hazard=role == "hazard")
        elif role in ("massif", "prop", "monster", "npc"):
            image, anchor, parameters = static_atlas(source, role, config)
            expected[descriptor_key]["size"] = list(image.size)
            expected[descriptor_key]["anchor"] = anchor
        elif role == "summon":
            with Image.open(source) as opened:
                image = opened.convert("RGBA")
            parameters = {"operation": "RGBA-pass-through", "expectedAtlas": [1536, 1344]}
        else:
            continue
        generated[descriptor_key] = (image, source, parameters)

    items_source = build.SRC / "ui" / "items_alpha.png"
    for descriptor_key, (image, parameters) in item_outputs(items_source).items():
        generated[descriptor_key] = (image, items_source, parameters)
    skills_source = build.SRC / "ui" / "skills_alpha.png"
    skill_image, skill_parameters = skill_output(skills_source)
    generated["skill-icons:skills"] = (skill_image, skills_source, skill_parameters)
    variants_report = build.SRC / "gameplay_art_authored/items/import_v1.json"
    if variants_report.is_file():
        imported = json.loads(variants_report.read_text(encoding="utf-8"))
        variant_path, variant_source = ROOT / imported["output"], ROOT / imported["source"]
        if sha256(variant_path) != imported["sha256"] or sha256(variant_source) != imported["sourceSha256"]:
            raise RuntimeError("item variant import hashes changed; rerun import_item_variants.py")
        generated["item-icons:variants"] = (Image.open(variant_path).convert("RGBA"), variant_source, imported["parameters"])
    generated.update(imported_traps(expected))
    generated.update(imported_backdrops(expected))
    generated.update(imported_forms(expected))
    generated.update(imported_walls(expected))
    generated.update(imported_paths(expected))
    generated.update(imported_cliffs(expected))

    descriptors: dict[str, dict] = {}
    qa_groups: dict[str, list[tuple[str, Image.Image]]] = {}
    for descriptor_key, (image, origin, parameters) in sorted(generated.items()):
        descriptor = dict(expected[descriptor_key])
        output = ROOT / descriptor["path"]
        if list(image.size) != descriptor["size"]:
            raise RuntimeError(
                f"{descriptor_key}: authoring output {image.size} does not match {descriptor['size']}"
            )
        # Independently authored imports are already the reviewed canonical
        # outputs of their dedicated import tools. Re-encoding them here would
        # invalidate those import reports' byte-for-byte output hashes.
        if args.write and descriptor_key != "item-icons:variants" and descriptor["role"] not in ("trap", "backdrop", "form", "wall", "path", "cliff"):
            output.parent.mkdir(parents=True, exist_ok=True)
            image.save(output, "PNG", compress_level=7)
        elif not output.is_file():
            # Dry run still validates the complete transform in memory; hashes
            # are reported as pending until --write freezes the file.
            pass
        descriptor["sha256"] = sha256(output) if output.is_file() and args.write else (
            sha256(output) if output.is_file() else None
        )
        descriptor["provenance"] = {
            "method": {
                "ground": "painted-material-slice-v1", "hazard": "painted-material-slice-v1",
                "massif": "painted-static-normalize-v1", "prop": "painted-static-normalize-v1",
                "monster": "painted-static-normalize-v1", "npc": "painted-static-normalize-v1",
                "summon": "painted-atlas-pass-through-v1", "item-icons": "authored-item-atlas-pack-v1",
                "skill-icons": "authored-skill-atlas-pack-v1", "trap": "authored-chroma-import-v1",
                "backdrop": "authored-scenic-plate-import-v1",
                "form": "authored-chroma-form-import-v1",
                "wall": "painted-two-source-wall-kit-import-v1",
                "path": "authored-path-adjacency-import-v1",
                "cliff": "authored-cliff-sheet-import-v1",
            }[descriptor["role"]],
            "source": source_rel(origin), "sourceSha256": sha256(origin), "parameters": parameters,
        }
        descriptors[descriptor_key] = descriptor
        qa_groups.setdefault(descriptor["role"], []).append((descriptor["key"], image))

    if args.write:
        build.GAMEPLAY_ART_ROOT.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": build.GAMEPLAY_ART_VERSION,
            "sourceKind": build.GAMEPLAY_ART_SOURCE_KIND,
            "review": build.GAMEPLAY_ART_REVIEW,
            "wallContract": build.WALL_CONTRACT,
            "descriptors": descriptors,
        }
        build.GAMEPLAY_ART_AUTHORSHIP.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8",
        )
        qa_paths = []
        for role, images in sorted(qa_groups.items()):
            thumb = (320, 180) if role == "backdrop" else (
                (280, 150) if role in ("ground", "hazard", "item-icons", "skill-icons") else (180, 180)
            )
            qa_path = QA_ROOT / f"{role.replace('-', '_')}_painted_sources_v1.png"
            qa_contact_sheet(images, qa_path, thumb)
            qa_paths.append(source_rel(qa_path))
        report = {
            "version": 1, "method": "painted-source-normalization-v1",
            "review": build.GAMEPLAY_ART_REVIEW,
            "descriptorCount": len(descriptors),
            "roles": {role: len(images) for role, images in sorted(qa_groups.items())},
            "qaContactSheets": qa_paths,
            "excludedRoles": sorted(set(d["role"] for d in expected.values()) - NORMALIZED_ROLES),
            "sourcePolicy": "approved-painted-libraries-only-never-assets/sprites",
        }
        QA_REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(
        f"{'Wrote' if args.write else 'Validated'} {len(descriptors)} final-aligned sources; "
        f"{len(expected) - len(descriptors)} independently-authored descriptors remain"
    )


if __name__ == "__main__":
    main()
