"""Create fixed-grid ImageGen references from existing authored cells.

This is a reference/QA tool: it never writes runtime art or changes sources.
Each complete 192px canvas is enlarged uniformly, retaining every margin.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cells', type=Path, required=True)
    parser.add_argument('--indices', type=int, nargs='+', required=True)
    parser.add_argument('--columns', type=int, default=4)
    parser.add_argument('--cell-size', type=int, default=384)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    rows = (len(args.indices) + args.columns - 1) // args.columns
    board = Image.new('RGBA', (args.columns * args.cell_size, rows * args.cell_size), (0, 255, 0, 255))
    entries = []
    for position, index in enumerate(args.indices):
        matches = list(args.cells.glob(f'{index:02d}_*.png'))
        if len(matches) != 1:
            raise ValueError(f'Expected exactly one reference for {index}: {matches}')
        with Image.open(matches[0]) as image:
            assert image.size == (192, 192) and image.mode == 'RGBA'
            cell = image.resize((args.cell_size, args.cell_size), Image.Resampling.NEAREST)
        x = position % args.columns * args.cell_size
        y = position // args.columns * args.cell_size
        board.alpha_composite(cell, (x, y))
        entries.append({'index': index, 'source': str(matches[0].resolve()), 'box': [x, y, x + args.cell_size, y + args.cell_size]})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists():
        raise ValueError(f'Refusing to overwrite {args.out}')
    board.save(args.out)
    args.out.with_suffix('.json').write_text(json.dumps({'purpose': 'reference-only', 'size': board.size, 'cells': entries}, indent=2) + '\n')
    print(args.out.resolve())


if __name__ == '__main__':
    main()
