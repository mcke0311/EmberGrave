"""Package the validated static release within itch.io's HTML5 file limit.

Small prop images are embedded byte-for-byte in a manifest footer. The original
manifest is kept intact; the footer replaces selected source URLs before the
sprite loader starts. Production files and source artwork are never changed.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--stage', type=Path, required=True)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--target-files', type=int, default=980)
    args = parser.parse_args()
    source, stage = args.source.resolve(), args.stage.resolve()
    if not 1 <= args.target_files <= 1000:
        raise SystemExit('Target file count must be between 1 and 1000.')
    if stage.exists() or args.archive.exists():
        raise SystemExit('Choose a new stage and archive; existing files are preserved.')
    if source == stage or source in stage.parents or stage in source.parents:
        raise SystemExit('Source and stage must be separate directories.')
    if not (source / 'index.html').is_file():
        raise SystemExit('Source must be an existing static game release.')

    files = sorted(p for p in source.rglob('*') if p.is_file())
    if any(p.is_symlink() for p in source.rglob('*')):
        raise SystemExit('Source cannot contain symlinks.')
    forbidden = {'.git', '.env', '.openai', 'node_modules', 'server', 'tests'}
    if any(forbidden.intersection(p.relative_to(source).parts) for p in files):
        raise SystemExit('Source contains development or private files.')

    manifest_path = source / 'js/sprite_manifest.js'
    manifest_text = manifest_path.read_text(encoding='utf-8')
    manifest = json.loads(manifest_text.split('DATA.SPRITE_MANIFEST = ', 1)[1].strip().removesuffix(';'))
    entries = manifest['entries']
    candidates = {entry['src'] for entry in entries.values()
                  if entry['src'].startswith('assets/sprites/packed/world/props/')}
    # Keep separate files when other runtime source refers to the same URL.
    other_text = '\n'.join(p.read_text(encoding='utf-8') for p in files
                           if p != manifest_path and p.suffix in {'.js', '.mjs', '.html', '.css', '.json'})
    candidates = [name for name in candidates if name not in other_text]
    candidates.sort(key=lambda name: ((source / name).stat().st_size, name))
    count = max(0, len(files) - args.target_files)
    if count > len(candidates):
        raise SystemExit('Not enough exclusively manifest-referenced images to meet the limit.')
    selected = candidates[:count]
    embedded = {}
    records = []
    for name in selected:
        content = (source / name).read_bytes()
        embedded[name] = 'data:image/webp;base64,' + base64.b64encode(content).decode('ascii')
        records.append({'path': name, 'bytes': len(content), 'sha256': digest(content)})

    stage.mkdir(parents=True)
    selected_set = set(selected)
    for item in files:
        relative = item.relative_to(source)
        if relative.as_posix() in selected_set:
            continue
        target = stage / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, target)

    footer = '\n/* itch.io distribution: original image bytes embedded to meet its file limit. */\n'
    footer += '(() => {\n  const embedded = ' + json.dumps(embedded, separators=(',', ':')) + ';\n'
    footer += '''  for (const def of Object.values(DATA.SPRITE_MANIFEST.entries)) {
    if (Object.prototype.hasOwnProperty.call(embedded, def.src)) {
      def.src = embedded[def.src];
      // Data URLs contain the image bytes and must not receive a query string.
      delete def.revision;
    }
  }
})();
'''
    (stage / 'js/sprite_manifest.js').write_text(manifest_text + footer, encoding='utf-8')
    subprocess.run(['node', '--preserve-symlinks', '--preserve-symlinks-main', '--check',
                    str(stage / 'js/sprite_manifest.js')], check=True, capture_output=True)

    # Verify the executed output, rather than only the builder's input map.
    verifier = '''const fs=require('fs'),vm=require('vm');
const context={DATA:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),context);
process.stdout.write(JSON.stringify(context.DATA.SPRITE_MANIFEST));'''
    executed = subprocess.run(['node', '--preserve-symlinks', '--preserve-symlinks-main', '-e', verifier,
                               str(stage / 'js/sprite_manifest.js')], check=True, capture_output=True, text=True)
    packaged_manifest = json.loads(executed.stdout)
    assert packaged_manifest.keys() == manifest.keys()
    assert packaged_manifest['entries'].keys() == entries.keys()
    verified_defs = 0
    for key, original in entries.items():
        packaged = packaged_manifest['entries'][key]
        if original['src'] in selected_set:
            assert digest(base64.b64decode(packaged['src'].split(',', 1)[1], validate=True)) == digest((source / original['src']).read_bytes())
            assert 'revision' not in packaged
            assert {k: v for k, v in original.items() if k not in {'src', 'revision'}} == {k: v for k, v in packaged.items() if k != 'src'}
            verified_defs += 1
        else:
            assert packaged == original
            assert (stage / original['src']).is_file(), original['src']
    assert {k: v for k, v in packaged_manifest.items() if k != 'entries'} == {k: v for k, v in manifest.items() if k != 'entries'}

    packaged_files = sorted(p for p in stage.rglob('*') if p.is_file())
    total = sum(p.stat().st_size for p in packaged_files)
    assert len(packaged_files) <= args.target_files
    assert total <= 500_000_000
    for item in packaged_files:
        name = item.relative_to(stage).as_posix()
        assert len(name) <= 240 and item.stat().st_size <= 200_000_000, name
        if name != 'js/sprite_manifest.js':
            assert digest(item.read_bytes()) == digest((source / name).read_bytes()), name

    args.archive.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for item in packaged_files:
            archive.write(item, item.relative_to(stage).as_posix())
    with zipfile.ZipFile(args.archive) as archive:
        assert archive.testzip() is None
        assert len(archive.infolist()) == len(packaged_files)
        assert 'index.html' in archive.namelist()
    report = {
        'source': str(source), 'stage': str(stage), 'archive': str(args.archive.resolve()),
        'source_files': len(files), 'packaged_files': len(packaged_files),
        'extracted_bytes': total, 'archive_bytes': args.archive.stat().st_size,
        'archive_sha256': digest(args.archive.read_bytes()),
        'embedded_images': len(selected), 'verified_manifest_definitions': verified_defs,
        'embedded_source_bytes': sum(record['bytes'] for record in records),
        'preserved_other_files': True, 'archive_crc_verified': True,
        'browser_validation': 'pending', 'itch_embed_validation': 'pending',
        'multiplayer_origin_configuration': 'Required for itch.io before public listing.',
        'embedded': records,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'embedded'}, indent=2))


if __name__ == '__main__':
    main()
