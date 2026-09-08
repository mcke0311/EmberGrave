"""Check frontier provenance and compare the existing strict sprite gate with HEAD.

The baseline reader overlays tracked text from the recorded pre-redesign commit;
unchanged binary artwork is shared. No working files are reverted or rewritten.
"""
from pathlib import Path
import contextlib
import hashlib
import io
import json
import re
import subprocess
import sys
from unittest.mock import patch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import validate_sprite_assets as validator

REF = 'b036a3bae9be7cd656ed76d8a472f6b212aacf42'
output = ROOT / 'tests/qa/frontier'
output.mkdir(parents=True, exist_ok=True)
manifest = validator.load_manifest()
descriptors = json.loads(validator.GAMEPLAY_ART_AUTHORSHIP.read_text())['descriptors']
checks = 0
for key, desc in descriptors.items():
    if not key.startswith('prop:frontier_'):
        continue
    source = ROOT / desc['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == desc['sha256']
    original = ROOT / desc['provenance']['source']
    assert hashlib.sha256(original.read_bytes()).hexdigest() == desc['provenance']['sourceSha256']
    entry = manifest['entries'][desc['assetId']]
    assert manifest['maps']['props'][desc['key']] == desc['assetId']
    with Image.open(source) as image, Image.open(ROOT / entry['src']) as packed:
        assert image.mode == packed.mode == 'RGBA'
        assert list(image.size) == list(packed.size) == desc['size']
        assert image.getchannel('A').getextrema() == packed.getchannel('A').getextrema() == (0, 255)
        assert entry['anchor'] == desc['anchor']
    checks += 7
assert checks == 15 * 7

asset_report = {'status': 'PASS', 'frontierAssets': 15, 'checks': checks,
                'scope': 'Provenance hashes, alpha, packed dimensions, anchors and manifest registration.'}
(output / 'sprite_frontier.json').write_text(json.dumps(asset_report, indent=2)+'\n')
if '--assets-only' in sys.argv:
    print(json.dumps(asset_report, indent=2))
    raise SystemExit(0)

original_read = Path.read_text
changed = subprocess.check_output(['git', 'diff', '--name-only', REF], cwd=ROOT, text=True).splitlines()
overlay = {str((ROOT / name).resolve()): subprocess.check_output(['git', 'show', REF+':'+name], cwd=ROOT).decode('utf8')
           for name in changed if name.endswith(('.js', '.json', '.py', '.mjs'))}
def baseline_read(path, *args, **kwargs):
    return overlay.get(str(path.resolve())) if str(path.resolve()) in overlay else original_read(path, *args, **kwargs)

results = {}
original_add = validator.add
for version in ['before', 'after']:
    stream = io.StringIO()
    diagnostics = []
    def collect(errors, message):
        diagnostics.append(message)
        original_add(errors, message)
    with patch.object(sys, 'argv', ['validate_sprite_assets.py']), contextlib.redirect_stdout(stream):
        with patch.object(Path, 'read_text', baseline_read if version == 'before' else original_read), patch.object(validator, 'add', collect):
            code = validator.main()
    result = stream.getvalue()
    (output / ('sprites_'+version+'.txt')).write_text(result, encoding='utf8')
    (output / ('sprite_diagnostics_'+version+'.json')).write_text(json.dumps(diagnostics, indent=2)+'\n')
    # The frozen legacy descriptor-count gate lists the actual prop count. The
    # new library adds fifteen props; all other diagnostics must match exactly.
    normalize = lambda text: re.sub(r"'prop': \d+", "'prop': <count>", text) if 'role coverage mismatch' in text else text
    results[version] = {'exitCode': code, 'diagnostics': [normalize(d) for d in diagnostics]}
matches = results['before'] == results['after']
added = sorted(set(results['after']['diagnostics']) - set(results['before']['diagnostics']))
removed = sorted(set(results['before']['diagnostics']) - set(results['after']['diagnostics']))
# Always replace the report, including on a changed shared-workspace gate. A
# previous passing report must not conceal diagnostics from concurrent changes.
report = {'status': 'PASS' if matches else 'FAIL', 'frontierAssetStatus': 'PASS',
          'frontierAssets': 15, 'checks': checks, 'baseline': REF,
          'strictGateExitCode': results['after']['exitCode'], 'strictGateMatchesBaseline': matches,
          'baselineDiagnostics': len(results['before']['diagnostics']),
          'currentDiagnostics': len(results['after']['diagnostics']),
          'addedDiagnostics': added, 'removedDiagnostics': removed,
          'note': 'Frontier provenance, alpha, anchors and registration passed. The complete shared-workspace strict gate is compared separately with the pre-redesign baseline; any differences remain visible and fail this command.'}
(output / 'sprites.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
raise SystemExit(0 if matches else 1)
