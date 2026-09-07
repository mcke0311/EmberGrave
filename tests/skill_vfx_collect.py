"""Optional local-only collector for generated skill-review evidence."""
import base64
import http.server
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'tests' / 'qa' / 'skill_vfx'
ROOT.mkdir(parents=True, exist_ok=True)
NAMES = {'coverage', 'before_coverage', 'benchmark_1080p', 'benchmark_4k', 'map_before', 'map_after', 'map_before_4k', 'map_after_4k'}
NAMES |= {f'{phase}_{name}' for phase in ('before', 'after') for name in ('vanguard','emberwitch','gravebinder','veilranger','wildkeeper')}

class Handler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:8741')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        name = self.path.strip('/')
        size = int(self.headers.get('Content-Length', 0))
        if name not in NAMES or not 0 < size < 16000000:
            self.send_error(400)
            return
        try:
            payload = json.loads(self.rfile.read(size))
            if 'image' in payload:
                prefix, data = payload['image'].split(',', 1)
                assert prefix == 'data:image/png;base64'
                (ROOT / (name + '.png')).write_bytes(base64.b64decode(data, validate=True))
            else:
                (ROOT / (name + '.json')).write_text(json.dumps(payload, indent=2), encoding='utf-8')
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except Exception as error:
            self.send_error(400, str(error))

http.server.ThreadingHTTPServer(('127.0.0.1', 8742), Handler).serve_forever()

