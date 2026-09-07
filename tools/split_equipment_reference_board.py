"""Decode a generated fixed-grid delivery into complete, untrimmed square cells.

Only full-canvas uniform normalization and fixed grid extraction are allowed.
This does not correct placement, detect subjects, or certify visual review.
The per-cell importer still owns registration and visual acceptance.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    spec = json.loads(args.reference.read_text())
    with Image.open(args.source) as image:
        before_size = image.size
        expected = spec['size']
        if image.width * expected[1] != image.height * expected[0]:
            raise ValueError(f'Wrong aspect ratio: {image.size}; expected {expected}')
        board = image.convert('RGBA').resize(tuple(expected), Image.Resampling.LANCZOS)
    args.out.mkdir(parents=True, exist_ok=False)
    records = []
    for cell in spec['cells']:
        target = args.out / Path(cell['source']).name
        square = board.crop(tuple(cell['box']))
        assert square.width == square.height
        square.save(target)
        records.append({'index': cell['index'], 'fixedGridBox': cell['box'], 'output': str(target.resolve()),
                        'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    report = {'source': str(args.source.resolve()), 'sourceSha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'sourceSize': before_size, 'wholeCanvasSize': expected, 'cells': records,
              'operations': ['uniform-whole-canvas-normalization', 'fixed-grid-cell-extraction'],
              'subjectDetection': False, 'repositioning': False, 'review': 'pending'}
    (args.out / 'board_lineage.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Prepared {len(records)} complete cells; registration and visual review remain required.')


if __name__ == '__main__':
    main()
