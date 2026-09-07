#!/usr/bin/env python3
"""Inspect or alpha-convert final-aligned authored armor chroma atlases.

This is an artist-delivery helper, not a compiler or importer.  It never
resizes, translates, crops, rotates, flips, splits, or manufactures artwork.
The ``inspect`` command may project a wrong-sized source into the canonical
192px coordinate system for measurements only; projected pixels are never
exported.  The ``convert`` command is fail-closed and accepts only an exact
1536x1728, 8x9 final-aligned PNG.

Conversion removes a green matte in place.  Every output pixel has the same
(x, y) coordinate as its source pixel.  The result remains unreviewed and must
still pass ``import_authored_player_equipment.py check`` plus visual review.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from collections import deque
from pathlib import Path
from statistics import median
from typing import Any, Iterable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RIG_ROOT = ROOT / "assets" / "sprites_src" / "player_rig"
REGISTRATION = RIG_ROOT / "registrations.json"

CELL = 192
COLS = 8
ROWS = 9
ATLAS = (CELL * COLS, CELL * ROWS)
ANCHOR = [96, 184]
RIG_REVISION = "grip-rig-v1"
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
POSES = (
    "idle", "walkA", "walkB", "attackWindup", "attackImpact",
    "cast", "hit", "death", "dead",
)
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
ARMOR_FAMILIES = ("light", "mail", "plate", "mythic")


class AuditError(RuntimeError):
    """The source cannot be inspected or converted safely."""


def parse_hex_color(value: str) -> tuple[int, int, int]:
    text = value.strip().removeprefix("#")
    if len(text) != 6:
        raise argparse.ArgumentTypeError("key color must be six hex digits, for example 00ff00")
    try:
        return tuple(int(text[index:index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]
    except ValueError as exc:
        raise argparse.ArgumentTypeError("key color must contain only hex digits") from exc


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_registration(class_id: str) -> list[dict[str, Any]]:
    try:
        document = json.loads(REGISTRATION.read_text(encoding="utf-8"))
    except Exception as exc:
        raise AuditError(f"cannot read canonical registration {REGISTRATION}: {exc}") from exc
    if document.get("revision") != RIG_REVISION:
        raise AuditError(
            f"registration revision is {document.get('revision')!r}, expected {RIG_REVISION!r}"
        )
    if document.get("directions") != list(DIRECTIONS) or document.get("poses") != list(POSES):
        raise AuditError("canonical registration direction/pose ordering changed")
    frames = document.get("classes", {}).get(class_id, {}).get("frames")
    if not isinstance(frames, list) or len(frames) != COLS * ROWS:
        raise AuditError(f"canonical registration for {class_id} must have 72 frames")
    for index, frame in enumerate(frames):
        if (
            not isinstance(frame, dict)
            or frame.get("index") != index
            or frame.get("pose") != POSES[index // COLS]
            or frame.get("direction") != DIRECTIONS[index % COLS]
        ):
            raise AuditError(f"canonical registration frame {index} has changed ordering")
    return frames


def open_png(path: Path) -> tuple[Image.Image, str]:
    if not path.is_file():
        raise AuditError(f"source is missing: {path}")
    try:
        with Image.open(path) as opened:
            opened.load()
            image_format = opened.format or "unknown"
            return opened.copy(), image_format
    except Exception as exc:
        raise AuditError(f"cannot decode source image {path}: {exc}") from exc


def is_chroma(
    rgb: tuple[int, int, int],
    key: tuple[int, int, int],
    tolerance: int,
    dominance: int,
) -> bool:
    r, g, b = rgb
    if max(abs(r - key[0]), abs(g - key[1]), abs(b - key[2])) <= tolerance:
        return True
    # Image-generation output commonly varies a nominally flat green matte.
    # This second branch is intentionally green-specific and is reported.
    return g >= 128 and g - max(r, b) >= dominance


def chroma_mask(
    image: Image.Image,
    key: tuple[int, int, int],
    tolerance: int,
    dominance: int,
) -> Image.Image:
    rgb = image.convert("RGB")
    values = [
        0 if is_chroma(pixel, key, tolerance, dominance) else 255
        for pixel in rgb.get_flattened_data()
    ]
    result = Image.new("L", rgb.size, 0)
    result.putdata(values)
    return result


def proportional_bounds(length: int, cells: int, index: int) -> tuple[int, int]:
    # Diagnostic-only boundaries.  A conversion never calls this to place art.
    return round(index * length / cells), round((index + 1) * length / cells)


def canonical_cell_box(index: int) -> tuple[int, int, int, int]:
    col, row = index % COLS, index // COLS
    return (col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)


def expand_roi(roi: list[int], amount: int) -> tuple[int, int, int, int]:
    x, y, width, height = roi
    return (
        max(0, x - amount),
        max(0, y - amount),
        min(CELL, x + width + amount),
        min(CELL, y + height + amount),
    )


def roi_box(roi: list[int]) -> tuple[int, int, int, int]:
    x, y, width, height = roi
    return x, y, x + width, y + height


def count_on(image: Image.Image) -> int:
    histogram = image.histogram()
    return sum(histogram[1:])


def intersects(image: Image.Image, box: tuple[int, int, int, int]) -> int:
    return count_on(image.crop(box))


def edge_count(image: Image.Image) -> int:
    width, height = image.size
    if width == 0 or height == 0:
        return 0
    top = count_on(image.crop((0, 0, width, 1)))
    bottom = count_on(image.crop((0, height - 1, width, height)))
    left = count_on(image.crop((0, 1, 1, max(1, height - 1))))
    right = count_on(image.crop((width - 1, 1, width, max(1, height - 1))))
    return top + bottom + left + right


def connected_components(image: Image.Image) -> int:
    """Count 8-connected foreground components in one 192px diagnostic mask."""
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    components = 0
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if visited[offset] or not pixels[x, y]:
                continue
            components += 1
            visited[offset] = 1
            queue: deque[tuple[int, int]] = deque(((x, y),))
            while queue:
                cx, cy = queue.popleft()
                for ny in range(max(0, cy - 1), min(height, cy + 2)):
                    for nx in range(max(0, cx - 1), min(width, cx + 2)):
                        child = ny * width + nx
                        if not visited[child] and pixels[nx, ny]:
                            visited[child] = 1
                            queue.append((nx, ny))
    return components


def and_count(first: Image.Image, second: Image.Image) -> int:
    # Pillow's logical_and requires mode 1, while multiply preserves exact L masks.
    from PIL import ImageChops

    return count_on(ImageChops.multiply(first, second))


def analyze_frames(
    foreground: Image.Image,
    body: Image.Image,
    frames: list[dict[str, Any]],
    slot: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    width, height = foreground.size
    body_alpha = body.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    required_key = "headROI" if slot == "head" else "chestROI"
    other_key = "chestROI" if slot == "head" else "headROI"
    metrics: list[dict[str, Any]] = []
    total_foreground = 0
    total_far = 0
    total_body_overlap = 0
    total_other_overlap = 0
    empty: list[int] = []
    edge: list[int] = []
    roi_misses: list[int] = []
    body_like_frames: list[int] = []
    far_frames: list[int] = []
    center_offsets: list[float] = []

    for index, frame in enumerate(frames):
        col, row = index % COLS, index // COLS
        sx0, sx1 = proportional_bounds(width, COLS, col)
        sy0, sy1 = proportional_bounds(height, ROWS, row)
        native = foreground.crop((sx0, sy0, sx1, sy1))
        # NEAREST is analysis-only: it creates no deliverable and cannot be used by convert.
        normalized = native.resize((CELL, CELL), Image.Resampling.NEAREST)
        count = count_on(normalized)
        total_foreground += count
        native_edge = edge_count(native)
        if count == 0:
            empty.append(index)
        if native_edge:
            edge.append(index)

        required = roi_box(frame[required_key])
        required_pixels = intersects(normalized, required)
        if required_pixels == 0:
            roi_misses.append(index)
        other_pixels = intersects(normalized, roi_box(frame[other_key]))
        total_other_overlap += other_pixels

        expanded = expand_roi(frame[required_key], 24)
        inside_expanded = intersects(normalized, expanded)
        far_pixels = max(0, count - inside_expanded)
        total_far += far_pixels
        far_ratio = far_pixels / count if count else 0.0
        if far_ratio > 0.35:
            far_frames.append(index)

        canonical_body = body_alpha.crop(canonical_cell_box(index))
        body_pixels = count_on(canonical_body)
        body_overlap = and_count(normalized, canonical_body)
        total_body_overlap += body_overlap
        body_coverage = body_overlap / body_pixels if body_pixels else 0.0
        if body_coverage > 0.55:
            body_like_frames.append(index)

        box = normalized.getbbox()
        center_offset = None
        if box:
            cx = (box[0] + box[2] - 1) / 2
            cy = (box[1] + box[3] - 1) / 2
            rx, ry, rw, rh = frame[required_key]
            rcx, rcy = rx + (rw - 1) / 2, ry + (rh - 1) / 2
            center_offset = round(math.hypot(cx - rcx, cy - rcy), 3)
            center_offsets.append(center_offset)

        native_box = native.getbbox()
        normalized_box = normalized.getbbox()
        metrics.append({
            "index": index,
            "pose": frame["pose"],
            "direction": frame["direction"],
            "nativeCellBounds": [sx0, sy0, sx1, sy1],
            "nativeForegroundBBox": list(native_box) if native_box else None,
            "canonicalEquivalentBBox": list(normalized_box) if normalized_box else None,
            "foregroundPixelsCanonicalEquivalent": count,
            "foregroundEdgePixelsNative": native_edge,
            "connectedComponentsCanonicalEquivalent": connected_components(normalized),
            "requiredROI": frame[required_key],
            "requiredROIIntersectionPixels": required_pixels,
            "centerOffsetFromRequiredROIPixels": center_offset,
            "foregroundFartherThan24pxFromRequiredROI": far_pixels,
            "farForegroundRatio": round(far_ratio, 6),
            "otherArmorROIIntersectionPixels": other_pixels,
            "canonicalBodyIntersectionPixels": body_overlap,
            "canonicalBodyCoverageRatio": round(body_coverage, 6),
        })

    aggregate = {
        "emptyFrames": empty,
        "edgeTouchFrames": edge,
        "requiredROIMissFrames": roi_misses,
        "framesWithMoreThan35PercentForegroundBeyond24pxReviewHalo": far_frames,
        "framesCoveringMoreThan55PercentOfCanonicalBody": body_like_frames,
        "foregroundPixelsCanonicalEquivalent": total_foreground,
        "foregroundFartherThan24pxFromRequiredROIPixels": total_far,
        "farForegroundRatio": round(total_far / total_foreground, 6) if total_foreground else None,
        "canonicalBodyIntersectionPixels": total_body_overlap,
        "otherArmorROIIntersectionPixels": total_other_overlap,
        "medianCenterOffsetFromRequiredROIPixels": round(median(center_offsets), 3) if center_offsets else None,
        "maxCenterOffsetFromRequiredROIPixels": round(max(center_offsets), 3) if center_offsets else None,
    }
    return metrics, aggregate


def chroma_statistics(
    image: Image.Image,
    foreground: Image.Image,
    key: tuple[int, int, int],
) -> dict[str, Any]:
    rgb = image.convert("RGB")
    total = rgb.width * rgb.height
    foreground_count = count_on(foreground)
    pixels: Iterable[tuple[int, int, int]] = rgb.get_flattened_data()
    exact = 0
    near_12 = 0
    chroma_r: list[int] = []
    chroma_g: list[int] = []
    chroma_b: list[int] = []
    mask_values = foreground.get_flattened_data()
    for pixel, mask_value in zip(pixels, mask_values):
        if pixel == key:
            exact += 1
        if max(abs(pixel[0] - key[0]), abs(pixel[1] - key[1]), abs(pixel[2] - key[2])) <= 12:
            near_12 += 1
        if mask_value == 0:
            chroma_r.append(pixel[0])
            chroma_g.append(pixel[1])
            chroma_b.append(pixel[2])
    return {
        "totalPixels": total,
        "foregroundPixelsNative": foreground_count,
        "foregroundRatioNative": round(foreground_count / total, 6),
        "exactKeyPixels": exact,
        "exactKeyRatio": round(exact / total, 6),
        "within12OfKeyPixels": near_12,
        "within12OfKeyRatio": round(near_12 / total, 6),
        "classifiedChromaPixels": total - foreground_count,
        "classifiedChromaRatio": round((total - foreground_count) / total, 6),
        "classifiedChromaChannelRange": {
            "r": [min(chroma_r), max(chroma_r)] if chroma_r else None,
            "g": [min(chroma_g), max(chroma_g)] if chroma_g else None,
            "b": [min(chroma_b), max(chroma_b)] if chroma_b else None,
        },
    }


def render_native_qa(
    image: Image.Image,
    foreground: Image.Image,
    frames: list[dict[str, Any]],
    slot: str,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    width, height = image.size
    overlay = image.convert("RGBA")
    dim = Image.new("RGBA", overlay.size, (0, 0, 0, 105))
    overlay = Image.alpha_composite(overlay, dim)
    draw = ImageDraw.Draw(overlay, "RGBA")
    required_key = "headROI" if slot == "head" else "chestROI"
    other_key = "chestROI" if slot == "head" else "headROI"

    for index, frame in enumerate(frames):
        col, row = index % COLS, index // COLS
        x0, x1 = proportional_bounds(width, COLS, col)
        y0, y1 = proportional_bounds(height, ROWS, row)
        draw.rectangle((x0, y0, x1 - 1, y1 - 1), outline=(255, 80, 80, 220), width=1)
        for roi_key, color in ((required_key, (255, 230, 80, 255)), (other_key, (100, 180, 255, 210))):
            rx, ry, rw, rh = frame[roi_key]
            px0 = x0 + round(rx * (x1 - x0) / CELL)
            py0 = y0 + round(ry * (y1 - y0) / CELL)
            px1 = x0 + round((rx + rw) * (x1 - x0) / CELL) - 1
            py1 = y0 + round((ry + rh) * (y1 - y0) / CELL) - 1
            draw.rectangle((px0, py0, px1, py1), outline=color, width=1)
        draw.text((x0 + 2, y0 + 2), str(index), fill=(255, 255, 255, 255))

    overlay.save(output_dir / "native_grid_roi_overlay.png", "PNG", compress_level=7)
    foreground.save(output_dir / "native_foreground_mask.png", "PNG", compress_level=7)


def convert_chroma(
    image: Image.Image,
    key: tuple[int, int, int],
    tolerance: int,
    dominance: int,
    alpha_floor: int,
) -> Image.Image:
    """Remove green matte in place; never change image dimensions or coordinates."""
    rgb = image.convert("RGB")
    output: list[tuple[int, int, int, int]] = []
    for r, g, b in rgb.get_flattened_data():
        if max(abs(r - key[0]), abs(g - key[1]), abs(b - key[2])) <= tolerance:
            output.append((0, 0, 0, 0))
            continue
        if g >= 128 and g - max(r, b) >= dominance:
            # Unmix against (0,255,0), assuming equipment itself contains no
            # chroma-like green.  The explicit CLI/report records that rule.
            alpha = max(r, b, 255 - g)
            if alpha <= alpha_floor:
                output.append((0, 0, 0, 0))
                continue
            scale = 255 / alpha
            red = min(255, round(r * scale))
            blue = min(255, round(b * scale))
            green = min(255, max(0, round((g - (255 - alpha)) * scale)))
            output.append((red, green, blue, alpha))
            continue
        output.append((r, g, b, 255))
    converted = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    converted.putdata(output)
    return converted


def audit(args: argparse.Namespace) -> tuple[dict[str, Any], Image.Image, list[dict[str, Any]]]:
    source = args.source.resolve()
    image, image_format = open_png(source)
    frames = load_registration(args.class_id)
    body_path = RIG_ROOT / args.class_id / "body.png"
    body, body_format = open_png(body_path)
    if body_format != "PNG" or body.mode != "RGBA" or body.size != ATLAS:
        raise AuditError(f"canonical body is not exact RGBA {ATLAS[0]}x{ATLAS[1]}: {body_path}")

    foreground = chroma_mask(image, args.key_color, args.key_tolerance, args.green_dominance)
    frame_metrics, aggregate = analyze_frames(foreground, body, frames, args.slot)
    stats = chroma_statistics(image, foreground, args.key_color)

    width, height = image.size
    errors: list[str] = []
    if image_format != "PNG":
        errors.append(f"source format is {image_format}, expected PNG")
    if image.size != ATLAS:
        errors.append(
            f"source dimensions are {width}x{height}, expected exact {ATLAS[0]}x{ATLAS[1]}; "
            "resizing/repositioning is forbidden"
        )
    if width % COLS or height % ROWS:
        errors.append(
            f"source cannot form an exact 8x9 grid: {width}%8={width % COLS}, "
            f"{height}%9={height % ROWS}"
        )
    if aggregate["emptyFrames"]:
        errors.append(f"mandatory worn plane has empty frames: {aggregate['emptyFrames']}")
    if aggregate["edgeTouchFrames"]:
        errors.append(f"foreground touches native cell edges in frames: {aggregate['edgeTouchFrames']}")
    if aggregate["requiredROIMissFrames"]:
        errors.append(
            f"foreground misses canonical {args.slot} ROI in frames: "
            f"{aggregate['requiredROIMissFrames']}"
        )
    if stats["classifiedChromaRatio"] < 0.50:
        errors.append(
            f"only {stats['classifiedChromaRatio']:.1%} of pixels classify as chroma; "
            "source is not a usable equipment-only green-matte sheet"
        )

    review_findings: list[str] = []
    if stats["exactKeyPixels"] == 0:
        review_findings.append(
            "the declared #00ff00 key color occurs zero times; the nominal flat background is "
            "color-varied and requires matte conversion, not exact-color deletion"
        )
    if aggregate["framesWithMoreThan35PercentForegroundBeyond24pxReviewHalo"]:
        review_findings.append(
            f"{len(aggregate['framesWithMoreThan35PercentForegroundBeyond24pxReviewHalo'])}/72 "
            f"frames place more than 35% of foreground farther than 24 canonical pixels from the "
            f"{args.slot} ROI; inspect for baked limbs/body or pose drift"
        )
    if aggregate["framesCoveringMoreThan55PercentOfCanonicalBody"]:
        review_findings.append(
            f"{len(aggregate['framesCoveringMoreThan55PercentOfCanonicalBody'])}/72 frames cover "
            "more than 55% of the canonical body silhouette; an armor-only plane should be "
            "reviewed for baked underbody/limb pixels"
        )
    if aggregate["otherArmorROIIntersectionPixels"]:
        review_findings.append(
            f"foreground overlaps the other armor ROI in {aggregate['otherArmorROIIntersectionPixels']} "
            "canonical-equivalent pixels; verify chest/head layer separation"
        )
    review_findings.append(
        "all canonical-equivalent measurements are diagnostic projections only when source size is "
        "wrong; they do not authorize resizing or importing the source"
    )

    scale_x = width / ATLAS[0]
    scale_y = height / ATLAS[1]
    report: dict[str, Any] = {
        "version": 1,
        "tool": "audit_authored_armor_chroma.py",
        "status": "fail" if errors else "mechanical-pass-unreviewed",
        "purpose": "artist-delivery QA only; never authorship certification",
        "source": str(source),
        "target": {
            "classId": args.class_id,
            "slot": args.slot,
            "family": args.family,
            "rigRevision": RIG_REVISION,
            "cell": [CELL, CELL],
            "atlas": list(ATLAS),
            "anchor": ANCHOR,
            "directions": list(DIRECTIONS),
            "poses": list(POSES),
        },
        "sourceFacts": {
            "sha256": sha256_file(source),
            "format": image_format,
            "mode": image.mode,
            "size": [width, height],
            "exactAtlasSize": image.size == ATLAS,
            "exactGridDivisibility": width % COLS == 0 and height % ROWS == 0,
            "impliedCellSize": [width / COLS, height / ROWS],
            "scaleVersusContract": [round(scale_x, 9), round(scale_y, 9)],
            "axisScaleDifferencePercent": round(abs(scale_x - scale_y) / max(scale_x, scale_y) * 100, 6),
        },
        "chromaRule": {
            "keyColor": list(args.key_color),
            "keyTolerance": args.key_tolerance,
            "greenDominance": args.green_dominance,
            "conversionAssumption": "equipment contains no chroma-like green material pixels",
        },
        "chromaStatistics": stats,
        "aggregateGeometry": aggregate,
        "errors": errors,
        "visualReviewFindings": review_findings,
        "frames": frame_metrics,
    }
    return report, image, frames


def run(args: argparse.Namespace) -> None:
    report, image, frames = audit(args)
    foreground = chroma_mask(image, args.key_color, args.key_tolerance, args.green_dominance)
    if args.qa_dir:
        render_native_qa(image, foreground, frames, args.slot, args.qa_dir.resolve())
    if args.report:
        write_json(args.report.resolve(), report)

    if args.command == "convert":
        if report["status"] != "mechanical-pass-unreviewed":
            raise AuditError(
                "refusing conversion because immutable grid/contact checks failed; inspect the report"
            )
        if image.mode not in {"RGB", "RGBA"}:
            raise AuditError(f"conversion accepts only RGB or RGBA source, found {image.mode}")
        if image.mode == "RGBA" and image.getchannel("A").getextrema() != (255, 255):
            raise AuditError("conversion requires an opaque chroma source; existing partial alpha is ambiguous")
        converted = convert_chroma(
            image,
            args.key_color,
            args.key_tolerance,
            args.green_dominance,
            args.alpha_floor,
        )
        if converted.size != image.size:
            raise AssertionError("conversion changed source dimensions")
        body, _ = open_png(RIG_ROOT / args.class_id / "body.png")
        converted_alpha = converted.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
        _, converted_geometry = analyze_frames(converted_alpha, body, frames, args.slot)
        converted_failures = {
            key: converted_geometry[key]
            for key in ("emptyFrames", "edgeTouchFrames", "requiredROIMissFrames")
            if converted_geometry[key]
        }
        if converted_failures:
            raise AuditError(
                "refusing output because chroma cleanup broke mandatory alpha/contact checks: "
                + json.dumps(converted_failures, sort_keys=True)
            )
        output = args.out.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        converted.save(output, "PNG", compress_level=7)
        report["conversion"] = {
            "status": "written-unreviewed",
            "output": str(output),
            "mode": converted.mode,
            "size": list(converted.size),
            "geometryOperations": [],
            "alphaFloor": args.alpha_floor,
            "postConversionGeometry": converted_geometry,
        }
        if args.report:
            write_json(args.report.resolve(), report)
        print(f"WROTE UNREVIEWED RGBA: {output}")
        print("No geometry changed. Visual review and the canonical importer check are still required.")
    else:
        print(f"{report['status'].upper()}: {args.source.resolve()}")

    if report["errors"]:
        for message in report["errors"]:
            print(f"ERROR: {message}", file=sys.stderr)
        raise SystemExit(2)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("inspect", "convert"):
        command = commands.add_parser(name)
        command.add_argument("--source", required=True, type=Path)
        command.add_argument("--class-id", required=True, choices=CLASSES)
        command.add_argument("--slot", required=True, choices=("head", "chest"))
        command.add_argument("--family", required=True, choices=ARMOR_FAMILIES)
        command.add_argument("--key-color", type=parse_hex_color, default=(0, 255, 0))
        command.add_argument("--key-tolerance", type=int, default=18)
        command.add_argument("--green-dominance", type=int, default=70)
        command.add_argument("--qa-dir", type=Path)
        command.add_argument("--report", type=Path)
        if name == "convert":
            command.add_argument("--out", required=True, type=Path)
            command.add_argument("--alpha-floor", type=int, default=24)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if not 0 <= args.key_tolerance <= 64:
        raise SystemExit("--key-tolerance must be between 0 and 64")
    if not 1 <= args.green_dominance <= 254:
        raise SystemExit("--green-dominance must be between 1 and 254")
    if hasattr(args, "alpha_floor") and not 0 <= args.alpha_floor <= 127:
        raise SystemExit("--alpha-floor must be between 0 and 127")
    try:
        run(args)
    except AuditError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":
    main()
