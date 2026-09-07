"""Build normalized 8-direction summon atlases from ImageGen chroma-key sources.

Input layout:
  *_action_alpha.png: 8 columns x 3 rows (idle, attack wind-up, impact)
  *_motion_alpha.png: 8 columns x 4 rows (walk A, walk B, death, dead)

Output layout:
  8 columns x 7 rows (idle, walk A, walk B, attack wind-up, impact,
  death transition, dead). Every frame is bottom-centred in a 192px cell.
"""

from __future__ import annotations

import argparse
import statistics
from pathlib import Path

from PIL import Image, ImageFilter


SUMMONS = (
    "skel_warrior",
    "skel_mage",
    "bone_golem",
    "wolf",
    "boar",
    "hawk",
    "bear",
    "decoy",
)

DIRS = 8
CELL_W = 192
CELL_H = 192
CONTENT_W = 180
UPRIGHT_H = 170
BOTTOM_PAD = 8
ALPHA_THRESHOLD = 8


def projection_cuts(image: Image.Image, segments: int, axis: str) -> list[int]:
    """Find transparent valleys between generated rows or columns."""
    width, height = image.size
    raw = image.getchannel("A").tobytes()
    extent = width if axis == "x" else height
    occupancy = [0] * extent
    for y in range(height):
        base = y * width
        for x in range(width):
            if raw[base + x] > ALPHA_THRESHOLD:
                occupancy[x if axis == "x" else y] += 1

    # ImageGen usually leaves truly empty chroma bands. Their midpoints are
    # safer than nominal grid lines when the whole contact sheet is offset.
    empty_runs: list[tuple[int, int, int]] = []
    run_start: int | None = None
    edge_margin = extent / segments * 0.2
    for index, value in enumerate(occupancy + [1]):
        if value == 0 and run_start is None:
            run_start = index
        elif value != 0 and run_start is not None:
            end = index - 1
            if run_start > edge_margin and end < extent - edge_margin:
                empty_runs.append((run_start, end, end - run_start + 1))
            run_start = None
    if len(empty_runs) >= segments - 1:
        chosen = sorted(empty_runs, key=lambda run: run[2], reverse=True)[: segments - 1]
        return [0] + sorted((start + end) // 2 for start, end, _ in chosen) + [extent]

    # Smooth tiny feather/fur/sword tips so the broad empty lane wins.
    smooth = [0] * extent
    for index in range(extent):
        smooth[index] = sum(occupancy[max(0, index - 2) : min(extent, index + 3)])

    nominal_cell = extent / segments
    cuts = [0]
    for boundary in range(1, segments):
        target = boundary * nominal_cell
        radius = nominal_cell * 0.42
        low = max(cuts[-1] + round(nominal_cell * 0.45), round(target - radius))
        high = min(extent - 1, round(target + radius))
        if low >= high:
            raise ValueError("could not find non-overlapping atlas cuts")
        best = min(range(low, high + 1), key=lambda x: (smooth[x], abs(x - target)))
        cuts.append(best)
    cuts.append(extent)
    return cuts


def component_centers(mask: Image.Image) -> list[tuple[int, float]]:
    """Return (area, x-centre) for connected islands on a small binary mask."""
    width, height = mask.size
    raw = mask.tobytes()
    seen = bytearray(width * height)
    found: list[tuple[int, float]] = []
    for start, value in enumerate(raw):
        if value == 0 or seen[start]:
            continue
        stack = [start]
        seen[start] = 1
        area = 0
        sum_x = 0
        while stack:
            index = stack.pop()
            x, y = index % width, index // width
            area += 1
            sum_x += x
            for near_y in range(max(0, y - 1), min(height - 1, y + 1) + 1):
                base = near_y * width
                for near_x in range(max(0, x - 1), min(width - 1, x + 1) + 1):
                    near = base + near_x
                    if not seen[near] and raw[near]:
                        seen[near] = 1
                        stack.append(near)
        if area >= 6:
            found.append((area, sum_x / area))
    return found


def actor_center_cuts(row_image: Image.Image) -> list[int]:
    """Locate the eight body masses, then cut halfway between their centres."""
    width, height = row_image.size
    shrink = 4
    small_w, small_h = max(DIRS * 8, width // shrink), max(16, height // shrink)
    alpha = row_image.getchannel("A").resize((small_w, small_h), Image.Resampling.BOX)
    binary = alpha.point(lambda value: 255 if value > 40 else 0).filter(ImageFilter.MinFilter(3))
    comps = component_centers(binary)
    if len(comps) < DIRS:
        return projection_cuts(row_image, DIRS, "x")

    chosen: list[tuple[int, float]] = []
    used: set[int] = set()
    lane = small_w / DIRS
    for col in range(DIRS):
        left, right = col * lane, (col + 1) * lane
        candidates = [
            (index, comp)
            for index, comp in enumerate(comps)
            if index not in used and left <= comp[1] < right
        ]
        if candidates:
            index, comp = max(candidates, key=lambda item: item[1][0])
        else:
            target = (col + 0.5) * lane
            index, comp = min(
                ((index, comp) for index, comp in enumerate(comps) if index not in used),
                key=lambda item: (abs(item[1][1] - target), -item[1][0]),
            )
        used.add(index)
        chosen.append(comp)
    centers = [center * width / small_w for _, center in chosen]
    if any(a >= b for a, b in zip(centers, centers[1:])):
        return projection_cuts(row_image, DIRS, "x")
    return [0] + [round((left + right) * 0.5) for left, right in zip(centers, centers[1:])] + [width]


def split_cells(image: Image.Image, rows: int) -> list[list[Image.Image]]:
    """Split at actual transparent row/column valleys, never nominal lines."""
    width, height = image.size
    cells: list[list[Image.Image]] = []
    row_cuts = projection_cuts(image, rows, "y")
    for row in range(rows):
        y0, y1 = row_cuts[row], row_cuts[row + 1]
        row_image = image.crop((0, y0, width, y1))
        cuts = actor_center_cuts(row_image)
        cells.append(
            [row_image.crop((cuts[col], 0, cuts[col + 1], row_image.height)) for col in range(DIRS)]
        )
    return cells


def alpha_bbox(cell: Image.Image) -> tuple[int, int, int, int]:
    alpha = cell.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("empty atlas cell")
    return bbox


def sheet_scale(
    cells: list[list[Image.Image]], upright_rows: tuple[int, ...]
) -> float:
    upright_heights: list[int] = []
    all_widths: list[int] = []
    all_heights: list[int] = []
    for row_index, row in enumerate(cells):
        for cell in row:
            x0, y0, x1, y1 = alpha_bbox(cell)
            width, height = x1 - x0, y1 - y0
            all_widths.append(width)
            all_heights.append(height)
            if row_index in upright_rows:
                upright_heights.append(height)
    height_scale = UPRIGHT_H / statistics.median(upright_heights)
    width_scale = CONTENT_W / max(all_widths)
    canvas_scale = (CELL_H - BOTTOM_PAD * 2) / max(all_heights)
    return min(height_scale, width_scale, canvas_scale)


def normalize_cell(cell: Image.Image, scale: float) -> Image.Image:
    crop = cell.crop(alpha_bbox(cell))
    width = max(1, round(crop.width * scale))
    height = max(1, round(crop.height * scale))
    # Resize premultiplied alpha. Straight-alpha resampling pulls hidden
    # magenta RGB from transparent pixels into long coloured guide streaks.
    crop = crop.convert("RGBa").resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")
    frame = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    x = (CELL_W - width) // 2
    y = CELL_H - BOTTOM_PAD - height
    frame.alpha_composite(crop, (x, y))
    return clean_artifacts(frame)


def clean_artifacts(frame: Image.Image) -> Image.Image:
    """Remove keyed guide remnants without erasing detached gear/remains."""
    width, height = frame.size
    data = bytearray(frame.tobytes())

    # Residual key pixels are strongly red+blue and are never part of these
    # summon palettes (the decoy's violet is much bluer and darker).
    for index in range(width * height):
        offset = index * 4
        red, green, blue, alpha = data[offset : offset + 4]
        if alpha and red > 170 and blue > 150 and green < min(red, blue) * 0.48:
            data[offset + 3] = 0

    # A few generated sheets contain one-pixel saturated guide strokes. Only
    # remove long unsupported runs; real swords, staffs and glowing edges have
    # neighbouring rows and therefore survive this test.
    def alpha_at(x: int, y: int) -> int:
        if x < 0 or y < 0 or x >= width or y >= height:
            return 0
        return data[(y * width + x) * 4 + 3]

    for y in range(height):
        x = 0
        while x < width:
            if alpha_at(x, y) <= ALPHA_THRESHOLD:
                x += 1
                continue
            start = x
            while x < width and alpha_at(x, y) > ALPHA_THRESHOLD:
                x += 1
            if x - start < 24:
                continue
            supported = 0
            saturated = 0
            for px in range(start, x):
                supported += int(alpha_at(px, y - 2) > ALPHA_THRESHOLD or alpha_at(px, y + 2) > ALPHA_THRESHOLD)
                offset = (y * width + px) * 4
                red, green, blue = data[offset : offset + 3]
                saturated += int(max(red, green, blue) - min(red, green, blue) > 100)
            length = x - start
            if supported < length * 0.12 and saturated > length * 0.6:
                for px in range(start, x):
                    data[(y * width + px) * 4 + 3] = 0

    return Image.frombytes("RGBA", (width, height), bytes(data))


def build_one(stage: Path, out_dir: Path, summon_id: str) -> dict[str, object]:
    action_path = stage / f"{summon_id}_action_alpha.png"
    motion_path = stage / f"{summon_id}_motion_alpha.png"
    action = Image.open(action_path).convert("RGBA")
    motion = Image.open(motion_path).convert("RGBA")
    action_cells = split_cells(action, 3)
    motion_cells = split_cells(motion, 4)

    # Idle is the most reliable body-size reference for action sheets; both
    # walking rows establish the body scale for motion/death sheets.
    action_scale = sheet_scale(action_cells, (0,))
    motion_scale = sheet_scale(motion_cells, (0, 1))

    rows = (
        (action_cells[0], action_scale),
        (motion_cells[0], motion_scale),
        (motion_cells[1], motion_scale),
        (action_cells[1], action_scale),
        (action_cells[2], action_scale),
        (motion_cells[2], motion_scale),
        (motion_cells[3], motion_scale),
    )
    atlas = Image.new("RGBA", (CELL_W * DIRS, CELL_H * len(rows)), (0, 0, 0, 0))
    coverage: list[int] = []
    for row_index, (source_row, scale) in enumerate(rows):
        for col, cell in enumerate(source_row):
            frame = normalize_cell(cell, scale)
            atlas.alpha_composite(frame, (col * CELL_W, row_index * CELL_H))
            coverage.append(sum(1 for px in frame.getchannel("A").getdata() if px > ALPHA_THRESHOLD))

    if len(coverage) != 56 or min(coverage) < 1000:
        raise ValueError(f"{summon_id}: incomplete output cells: {coverage}")

    corners = ((0, 0), (atlas.width - 1, 0), (0, atlas.height - 1), (atlas.width - 1, atlas.height - 1))
    if any(atlas.getpixel(point)[3] != 0 for point in corners):
        raise ValueError(f"{summon_id}: atlas corner is not transparent")
    keyed_pixels = 0
    for red, green, blue, alpha in atlas.getdata():
        if alpha > ALPHA_THRESHOLD and red > 170 and blue > 150 and green < min(red, blue) * 0.48:
            keyed_pixels += 1
    if keyed_pixels:
        raise ValueError(f"{summon_id}: {keyed_pixels} opaque chroma-key pixels remain")

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{summon_id}.webp"
    atlas.save(out_path, "WEBP", lossless=True, method=6)
    return {
        "id": summon_id,
        "size": atlas.size,
        "action_scale": round(action_scale, 4),
        "motion_scale": round(motion_scale, 4),
        "min_coverage": min(coverage),
        "max_coverage": max(coverage),
        "keyed_pixels": keyed_pixels,
        "bytes": out_path.stat().st_size,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()
    for summon_id in SUMMONS:
        print(build_one(args.stage, args.out_dir, summon_id))


if __name__ == "__main__":
    main()
