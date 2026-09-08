"""Local-only review server; records the review page's PNGs and JSON reports.
Run from the project root: python tests/act2_server.py
"""
from pathlib import Path
import sys
import json
import base64
import re
import http.server
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from serve import NoCacheHandler, ROOT

class ReviewHandler(NoCacheHandler):
    artifacts = 'act2_redesign'
    def translate_path(self, path):
        if path.startswith('/tmp/act2/before/assets/'):
            path = path[len('/tmp/act2/before'):]
        return super().translate_path(path)

    def do_GET(self):
        if self.path.startswith('/api/act2-profile/'):
            name = self.path.rsplit('/', 1)[-1]
            if not re.fullmatch(r'profile_[a-zA-Z0-9_-]+\.json', name):
                self.send_error(400)
                return
            path = Path(ROOT) / 'tests/qa' / self.artifacts / name
            content = path.read_bytes() if path.exists() else b'{"methodRevision":0}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        super().do_GET()

    def log_message(self, format, *args):
        # Thousands of sprite requests can fill a parent process's output pipe.
        pass

    def do_POST(self):
        if self.path != '/api/act2-review':
            return super().do_POST()
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length < 60_000_000:
                raise ValueError('Invalid report size')
            data = json.loads(self.rfile.read(length))
            name = data['name']
            if not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}\.(png|webp|json)', name):
                raise ValueError('Invalid artifact name')
            directory = Path(ROOT) / 'tests/qa' / self.artifacts
            directory.mkdir(parents=True, exist_ok=True)
            if name.endswith(('.png', '.webp')):
                content = base64.b64decode(data['png'].split(',', 1)[1], validate=True)
                if not (content.startswith(b'\x89PNG\r\n\x1a\n') or content[:4] == b'RIFF' and content[8:12] == b'WEBP'):
                    raise ValueError('Expected captured image')
                (directory / name).write_bytes(content)
            else:
                (directory / name).write_text(json.dumps(data['report'], indent=2)+'\n', encoding='utf-8')
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except (ValueError, KeyError, TypeError) as error:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(str(error).encode())

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8746), ReviewHandler)
    print('Act 2 review: http://localhost:8746/tests/act2_review.html', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
