"""Local-only review server; records the review page's PNGs and JSON reports.
Run from the project root: python tests/frontier_server.py
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
    def log_message(self, format, *args):
        # Thousands of sprite requests can fill a parent process's output pipe.
        pass

    def do_POST(self):
        if self.path != '/api/frontier-review':
            return super().do_POST()
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length < 60_000_000:
                raise ValueError('Invalid report size')
            data = json.loads(self.rfile.read(length))
            name = data['name']
            if not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}\.(png|webp|json)', name):
                raise ValueError('Invalid artifact name')
            directory = Path(ROOT) / 'tests/qa/frontier'
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
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8741), ReviewHandler)
    print('Frontier review: http://localhost:8741/tests/frontier_review.html', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
