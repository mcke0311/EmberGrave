"""Freeze independently reviewed direct-final hand annotations into marker atlases.

This tool never detects, transforms, or guesses sockets. It consumes the five
explicit 72-frame review fragments, validates them against the checked-in final
body atlases, then writes canonical pure-color marker sources and QA overlays.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FRAGMENT_ROOT = ROOT / "tmp/player_hand_registration"
RIG_ROOT = ROOT / "assets/sprites_src/player_rig"
CELL = 192
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
POSES = ("idle", "walkA", "walkB", "attackWindup", "attackImpact", "cast", "hit", "death", "dead")
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")


def alpha_near(cell: Image.Image, point: list[int], radius: int = 2) -> bool:
    x, y = point
    return any(
        cell.getpixel((px, py))[3] > 8
        for py in range(max(0, y - radius), min(CELL, y + radius + 1))
        for px in range(max(0, x - radius), min(CELL, x + radius + 1))
    )


def validate_fragment(class_id: str, body: Image.Image) -> list[dict]:
    path = FRAGMENT_ROOT / f"{class_id}.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    if set(payload) != {"classId", "method", "frames"}:
        raise RuntimeError(f"{class_id} fragment keys changed")
    if (payload["classId"] != class_id or
            payload["method"] != "direct-final-body-hand-annotation-v3"):
        raise RuntimeError(f"{class_id} direct-final provenance changed")
    frames = payload["frames"]
    if not isinstance(frames, list) or len(frames) != 72:
        raise RuntimeError(f"{class_id} fragment must contain exactly 72 frames")
    for index, frame in enumerate(frames):
        expected = {
            "index": index, "pose": POSES[index // 8], "direction": DIRECTIONS[index % 8],
            "review": "authored-final-body-v3",
        }
        if set(frame) != {"index", "pose", "direction", "mainGrip", "offGrip", "review"}:
            raise RuntimeError(f"{class_id} frame {index} keys changed")
        if any(frame[key] != value for key, value in expected.items()):
            raise RuntimeError(f"{class_id} frame {index} order/provenance changed")
        cell = body.crop((index % 8 * CELL, index // 8 * CELL,
                          (index % 8 + 1) * CELL, (index // 8 + 1) * CELL))
        for role in ("mainGrip", "offGrip"):
            point = frame[role]
            if (not isinstance(point, list) or len(point) != 2 or
                    any(not isinstance(v, int) or isinstance(v, bool) or v < 0 or v >= CELL for v in point)):
                raise RuntimeError(f"{class_id} frame {index} malformed {role}")
            if not alpha_near(cell, point):
                raise RuntimeError(f"{class_id} frame {index} {role} misses final body alpha")
        dx = frame["mainGrip"][0] - frame["offGrip"][0]
        dy = frame["mainGrip"][1] - frame["offGrip"][1]
        if dx * dx + dy * dy < 9:
            raise RuntimeError(
                f"{class_id} frame {index} hand markers overlap; direct endpoints must be distinct"
            )
    return frames


def marker_points(x: int, y: int) -> tuple[tuple[int, int], ...]:
    # Three collinear pixels retain an exact integer centroid at the authored
    # endpoint while minimizing overlap for crossed/occluded hands.
    if 0 < x < CELL - 1:
        return ((x - 1, y), (x, y), (x + 1, y))
    return ((x, y - 1), (x, y), (x, y + 1))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write canonical reviewed atlases and QA")
    args = parser.parse_args()
    staged = {}
    for class_id in CLASSES:
        with Image.open(RIG_ROOT / class_id / "body.png") as opened:
            if opened.mode != "RGBA" or opened.size != (1536, 1728):
                raise RuntimeError(f"{class_id} body must be final-aligned RGBA 1536x1728")
            body = opened.copy()
        staged[class_id] = (body, validate_fragment(class_id, body))
    if not args.write:
        print("PASS: validated 5 direct-final fragments / 360 frames / 720 socket contacts; no writes")
        return
    qa_root = RIG_ROOT / "qa"
    qa_root.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    for class_id, (body, frames) in staged.items():
        marker = Image.new("RGBA", body.size, (0, 0, 0, 0))
        qa = Image.new("RGBA", body.size, (13, 13, 16, 255)); qa.alpha_composite(body)
        qd = ImageDraw.Draw(qa)
        for frame in frames:
            index = frame["index"]; row, col = divmod(index, 8); ox, oy = col * CELL, row * CELL
            for label, key, color in (
                ("M", "mainGrip", (255, 0, 0, 255)),
                ("O", "offGrip", (0, 255, 255, 255)),
            ):
                x, y = frame[key]
                for px, py in marker_points(x, y):
                    marker.putpixel((ox + px, oy + py), color)
                qx, qy = ox + x, oy + y
                qd.ellipse((qx - 4, qy - 4, qx + 4, qy + 4), outline="black", width=3)
                qd.ellipse((qx - 3, qy - 3, qx + 3, qy + 3), fill=color)
                qd.text((qx + 5, qy - 9), label, fill=color, font=font,
                        stroke_width=2, stroke_fill="black")
            qd.rectangle((ox, oy, ox + 191, oy + 191), outline=(62, 62, 70, 255))
            qd.text((ox + 3, oy + 3), f"{index:02d} {frame['pose']} {frame['direction']}",
                    fill="white", font=font, stroke_width=2, stroke_fill="black")
        marker.save(RIG_ROOT / class_id / "hand_registration.png", "PNG", compress_level=7)
        qa.save(qa_root / f"{class_id}_grip_review.png", "PNG", compress_level=7)
    print("Wrote 5 canonical hand-registration atlases and 5 reviewed QA overlays (360 frames)")


if __name__ == "__main__":
    main()
