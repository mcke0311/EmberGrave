#!/usr/bin/env python3
"""Import individual ImageGen unique icons, or --check the accepted art.

Only this authoring importer crops and uniformly scales source pixels. The
normal sprite compiler calls install() to validate and register frozen assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/items/uniques'
CATALOG = AUTH / 'catalog_v1.json'
REPORT = AUTH / 'import_v1.json'
FINAL = ROOT / 'assets/sprites_src/gameplay_art/ui/items_uniques.png'
PACKED = ROOT / 'assets/sprites/packed/ui/items_uniques.webp'
MANIFEST = ROOT / 'js/sprite_manifest.js'
LEDGER = ROOT / 'assets/sprites_src/gameplay_art/gameplay_art_v1.json'
ASSET_ID = 'ui.items.uniques'
OAK_SOURCE = ROOT / 'assets/sprites_src/gameplay_art/ui/items_oak.png'
ALPHA_CROP_THRESHOLD = 8


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Duplicate artwork key: {key}')
        result[key] = value
    return result


def config():
    data = json.loads(CATALOG.read_text(encoding='utf-8'), object_pairs_hook=unique_object)
    if data.get('version') != 1 or data.get('tool') != 'built-in image_gen':
        raise ValueError('Unique art requires the version 1 built-in ImageGen catalogue')
    if data.get('cell') != [64, 64] or data.get('padding') != 4:
        raise ValueError('Unique icon cells must be 64px with 4px padding')
    if data.get('cols') != 18 or data.get('rows') != 9 or len(data['items']) != 162:
        raise ValueError('Unique atlas must contain 162 designs in an 18 by 9 grid')
    if data.get('retained') != {'uj_oak': {'assetId': 'ui.items.oak', 'index': 0}}:
        raise ValueError("Old Oak's Heart must retain its existing bespoke artwork")
    for identity, row in data['items'].items():
        expected = f'assets/sprites_src/gameplay_art_authored/items/uniques/{identity}.png'
        if row.get('id') != identity or row.get('source') != expected:
            raise ValueError(f'{identity}: source must match its canonical identity')
        if not row.get('design') or not row.get('prompt'):
            raise ValueError(f'{identity}: missing design or generation prompt')
    return data


def evaluated_catalogue():
    proc = subprocess.run(
        ['node', '--preserve-symlinks', '--preserve-symlinks-main', 'tools/unique_item_art_catalog.mjs'],
        cwd=ROOT, capture_output=True, text=True, encoding='utf-8', check=False,
    )
    if proc.returncode:
        raise ValueError('Cannot evaluate unique catalogue: ' + proc.stderr.strip())
    return json.loads(proc.stdout)


def validate_identities(data):
    runtime = {row['id']: row for row in evaluated_catalogue()}
    authored = set(data['items']) | set(data['retained'])
    if set(runtime) != authored:
        raise ValueError(f'Unique artwork coverage: missing {sorted(set(runtime) - authored)}, '
                         f'unknown {sorted(authored - set(runtime))}')
    for identity, row in data['items'].items():
        for field in ('id', 'name', 'group', 'baseId', 'type', 'category', 'twoHand'):
            if row.get(field) != runtime[identity].get(field):
                raise ValueError(f'{identity}: artwork {field} differs from runtime identity')
    return runtime


def expected_descriptor():
    data = config()
    return {
        'sourceKind': 'authored-final-aligned', 'review': 'visual-contact-sheet-v1',
        'path': relative(FINAL), 'sha256': None, 'role': 'item-icons', 'key': 'uniques',
        'provenance': None, 'kind': 'atlas', 'size': [data['cols'] * 64, data['rows'] * 64],
        'cell': [64, 64], 'cols': data['cols'], 'rows': data['rows'], 'anchor': [32, 32],
        'bundle': 'core', 'assetId': ASSET_ID, 'lossless': True,
    }


def read_manifest():
    text = MANIFEST.read_text(encoding='utf-8')
    prefix, payload = text.split('DATA.SPRITE_MANIFEST = ', 1)
    return prefix, json.loads(payload.strip().removesuffix(';'))


def frame(atlas, index, cols):
    x, y = index % cols * 64, index // cols * 64
    return atlas.crop((x, y, x + 64, y + 64))


def validate_atlas(atlas, data):
    if atlas.mode != 'RGBA' or atlas.size != (data['cols'] * 64, data['rows'] * 64):
        raise ValueError('Unique atlas dimensions or RGBA mode changed')
    seen = set()
    for index, identity in enumerate(data['items']):
        pixels = frame(atlas, index, data['cols'])
        alpha = pixels.getchannel('A')
        bounds = alpha.getbbox()
        if not bounds or min(bounds[:2]) < 4 or max(bounds[2:]) > 60:
            raise ValueError(f'{identity}: empty artwork or missing transparent padding')
        if sum(alpha.histogram()[33:]) < 25:
            raise ValueError(f'{identity}: icon is not readable at inventory size')
        digest = hashlib.sha256(pixels.tobytes()).hexdigest()
        if digest in seen:
            raise ValueError(f'{identity}: duplicate painted frame')
        seen.add(digest)


def import_art():
    data = config()
    runtime = validate_identities(data)
    missing = [row['source'] for row in data['items'].values() if not (ROOT / row['source']).is_file()]
    if missing:
        raise ValueError(f'{len(missing)} unique source images missing: ' + ', '.join(missing[:8]))
    atlas = Image.new('RGBA', (data['cols'] * 64, data['rows'] * 64))
    sources = {}
    mapping = dict(data['retained'])
    for index, (identity, row) in enumerate(data['items'].items()):
        source = ROOT / row['source']
        with Image.open(source) as opened:
            if opened.mode != 'RGBA' or opened.getchannel('A').getextrema() != (0, 255):
                raise ValueError(f'{identity}: ImageGen original must have real transparent alpha')
            # ImageGen can leave alpha=1 encoding dust at the image border.
            # Measure the actual subject, then retain two source pixels around
            # it for soft tips. Original alpha inside this crop is untouched.
            bounds = opened.getchannel('A').point(lambda value: 255 if value > ALPHA_CROP_THRESHOLD else 0).getbbox()
            if not bounds:
                raise ValueError(f'{identity}: generated source has no visible subject')
            bounds = (max(0, bounds[0] - 2), max(0, bounds[1] - 2),
                      min(opened.width, bounds[2] + 2), min(opened.height, bounds[3] + 2))
            cutout = opened.crop(bounds)
            size = opened.size
        scale = min(56 / cutout.width, 56 / cutout.height)
        fitted = cutout.resize((max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale))), Image.Resampling.LANCZOS)
        atlas.alpha_composite(fitted, (index % data['cols'] * 64 + (64 - fitted.width) // 2,
                                      index // data['cols'] * 64 + (64 - fitted.height) // 2))
        sources[identity] = {'source': row['source'], 'sourceSha256': sha(source), 'size': list(size),
                             'sourceBox': list(bounds), 'outputSize': list(fitted.size),
                             'promptSha256': hashlib.sha256(row['prompt'].encode('utf-8')).hexdigest(), 'index': index}
        mapping[identity] = {'assetId': ASSET_ID, 'index': index}
    validate_atlas(atlas, data)
    FINAL.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(FINAL)
    PACKED.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(PACKED, 'WEBP', lossless=True, exact=True, method=6)
    entry = {'src': relative(PACKED), 'revision': sha(PACKED)[:12], 'kind': 'atlas',
             'cell': [64, 64], 'cols': data['cols'], 'rows': data['rows'], 'anchor': [32, 32], 'bundle': 'core'}
    report = {'version': 1, 'method': 'built-in-imagegen-alpha-crop-uniform-scale', 'catalogueSha256': sha(CATALOG),
              'normalized': {'source': relative(FINAL), 'sha256': sha(FINAL)},
              'packed': {'source': relative(PACKED), 'sha256': sha(PACKED)},
              'sources': sources, 'retainedSources': {'uj_oak': {'source': relative(OAK_SOURCE), 'sha256': sha(OAK_SOURCE)}},
              'entries': {ASSET_ID: entry}, 'maps': {'uniqueItemIcons': mapping},
              'counts': {group: sum(row['group'] == group for row in runtime.values()) for group in ('equipment', 'charm', 'jewel', 'glyph')}}
    write_json(REPORT, report)
    descriptor = expected_descriptor()
    descriptor['sha256'] = sha(FINAL)
    descriptor['provenance'] = {'method': report['method'], 'source': relative(CATALOG), 'sourceSha256': sha(CATALOG),
                                'parameters': {'operation': 'alpha-crop-uniform-scale', 'padding': 4, 'cropAlphaThreshold': ALPHA_CROP_THRESHOLD, 'items': sources}}
    ledger = json.loads(LEDGER.read_text(encoding='utf-8'))
    ledger['descriptors']['item-icons:uniques'] = descriptor
    write_json(LEDGER, ledger)
    prefix, manifest = read_manifest()
    install(manifest['entries'], manifest['maps'])
    MANIFEST.write_text(prefix + 'DATA.SPRITE_MANIFEST = ' + json.dumps(manifest, indent=2, sort_keys=True) + ';\n', encoding='utf-8')
    coverage_path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(coverage_path.read_text(encoding='utf-8'))
    coverage.update(assetCount=len(manifest['entries']), lookupMapCount=len(manifest['maps']),
                    uniqueItemIcons=sorted(mapping), uniqueItemArtCounts=report['counts'])
    write_json(coverage_path, coverage)
    make_contact_sheet(atlas, data)
    return report


def install(entries, maps):
    """Validate immutable imported pixels, then register them in either build."""
    data = config()
    validate_identities(data)
    report = json.loads(REPORT.read_text(encoding='utf-8'), object_pairs_hook=unique_object)
    if report.get('version') != 1 or report.get('catalogueSha256') != sha(CATALOG):
        raise ValueError('Unique artwork catalogue changed; rerun import_unique_item_art.py')
    if set(report['sources']) != set(data['items']):
        raise ValueError('Unique artwork provenance is incomplete')
    expected_mapping = {**data['retained'], **{identity: {'assetId': ASSET_ID, 'index': index}
                        for index, identity in enumerate(data['items'])}}
    if report['maps'] != {'uniqueItemIcons': expected_mapping}:
        raise ValueError('Unique artwork identity/frame mapping changed')
    for identity, record in report['sources'].items():
        row = data['items'][identity]
        if record['source'] != row['source'] or record['sourceSha256'] != sha(ROOT / row['source']):
            raise ValueError(f'{identity}: generated source changed; rerun import_unique_item_art.py')
        if record['promptSha256'] != hashlib.sha256(row['prompt'].encode('utf-8')).hexdigest():
            raise ValueError(f'{identity}: generation prompt changed')
    if report['retainedSources']['uj_oak'] != {'source': relative(OAK_SOURCE), 'sha256': sha(OAK_SOURCE)}:
        raise ValueError("Old Oak's Heart artwork changed")
    for record in (report['normalized'], report['packed']):
        if sha(ROOT / record['source']) != record['sha256']:
            raise ValueError('Unique artwork pixels changed; rerun import_unique_item_art.py')
    descriptor = expected_descriptor()
    descriptor['sha256'] = report['normalized']['sha256']
    descriptor['provenance'] = {'method': report['method'], 'source': relative(CATALOG), 'sourceSha256': sha(CATALOG),
                                'parameters': {'operation': 'alpha-crop-uniform-scale', 'padding': 4, 'cropAlphaThreshold': ALPHA_CROP_THRESHOLD, 'items': report['sources']}}
    ledger = json.loads(LEDGER.read_text(encoding='utf-8'))
    if ledger['descriptors'].get('item-icons:uniques') != descriptor:
        raise ValueError('Unique artwork authorship descriptor changed')
    entry = {'src': relative(PACKED), 'revision': sha(PACKED)[:12], 'kind': 'atlas', 'cell': [64, 64],
             'cols': data['cols'], 'rows': data['rows'], 'anchor': [32, 32], 'bundle': 'core'}
    if report['entries'] != {ASSET_ID: entry}:
        raise ValueError('Unique artwork atlas entry changed')
    entries.update(report['entries'])
    maps['uniqueItemIcons'] = expected_mapping
    return report


def make_contact_sheet(atlas, data):
    # Labels are QA-only and never enter the runtime artwork.
    sheet = Image.new('RGB', (8 * 180, 21 * 118), '#182029')
    draw = ImageDraw.Draw(sheet)
    for index, (identity, row) in enumerate(data['items'].items()):
        x, y = index % 8 * 180, index // 8 * 118
        preview = frame(atlas, index, data['cols']).resize((80, 80), Image.Resampling.NEAREST)
        sheet.paste(preview, (x + 50, y + 2), preview)
        draw.text((x + 5, y + 84), row['name'], fill='#e9d4b0')
        draw.text((x + 5, y + 101), identity, fill='#96aab7')
    index = len(data['items'])
    x, y = index % 8 * 180, index // 8 * 118
    with Image.open(OAK_SOURCE) as oak:
        preview = oak.resize((80, 80), Image.Resampling.LANCZOS)
    sheet.paste(preview, (x + 50, y + 2), preview)
    draw.text((x + 5, y + 84), "Old Oak's Heart", fill='#e9d4b0')
    draw.text((x + 5, y + 101), 'uj_oak (retained)', fill='#96aab7')
    target = ROOT / 'tests/qa/unique_item_art/contact_sheet.jpg'
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, quality=95)
    for page, y in enumerate(range(0, sheet.height, 5 * 118), 1):
        sheet.crop((0, y, sheet.width, min(sheet.height, y + 5 * 118))).save(target.with_name(f'contact_{page}.jpg'), quality=95)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='verify identities, source/packed hashes, alpha and manifest without writing')
    args = parser.parse_args()
    if args.check:
        entries, maps = {}, {}
        report = install(entries, maps)
        _, manifest = read_manifest()
        if any(manifest['entries'].get(key) != entry for key, entry in entries.items()) or manifest['maps'].get('uniqueItemIcons') != maps['uniqueItemIcons']:
            raise ValueError('Unique artwork manifest differs from the accepted import')
        for ref in maps['uniqueItemIcons'].values():
            entry = manifest['entries'].get(ref['assetId'])
            if not entry or not (ROOT / entry['src']).is_file() or not 0 <= ref['index'] < entry['cols'] * entry['rows']:
                raise ValueError('Missing or out-of-bounds unique artwork reference')
        with Image.open(FINAL) as atlas:
            validate_atlas(atlas, config())
        with Image.open(PACKED) as atlas:
            validate_atlas(atlas, config())
        print('PASS: 163 unique identities; 162 distinct alpha icons, retained Oak art, source/prompt/packed hashes and manifest')
    else:
        report = import_art()
        print(f"Imported {len(report['sources'])} bespoke icons; {sum(report['counts'].values())} unique identities covered")


if __name__ == '__main__':
    main()
