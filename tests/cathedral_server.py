"""Local review server: python tests/cathedral_server.py (port 8744)."""
from pathlib import Path
import sys
import json
import base64
import re
import http.server
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from serve import NoCacheHandler, ROOT

class Handler(NoCacheHandler):
    def log_message(self,*args):
        pass
    def do_POST(self):
        if self.path!='/api/cathedral-review':
            self.send_error(404)
            return
        try:
            size=int(self.headers.get('Content-Length',0))
            if not 0<size<60_000_000:
                raise ValueError('Invalid request size')
            data=json.loads(self.rfile.read(size)); name=data['name']
            if not re.fullmatch(r'[a-zA-Z0-9_-]{1,110}\.(png|webp|json)',name):
                raise ValueError('Invalid artifact name')
            dest=Path(ROOT)/'tests/qa/cathedral'/name
            if name.endswith('.json'):
                dest.write_text(json.dumps(data['report'],indent=2)+'\n',encoding='utf-8')
            else:
                content=base64.b64decode(data['png'].split(',',1)[1],validate=True)
                if not(content.startswith(b'\x89PNG\r\n\x1a\n') or content[:4]==b'RIFF' and content[8:12]==b'WEBP'):
                    raise ValueError('Invalid captured image')
                dest.write_bytes(content)
            self.send_response(200);self.end_headers();self.wfile.write(b'{"ok":true}')
        except (ValueError,KeyError,TypeError) as e:
            self.send_error(400,str(e))

if __name__=='__main__':
    from cathedral_enemy_baseline import ensure_snapshot
    ensure_snapshot()
    from tools.act4_animation_baseline import restore
    restore()
    http.server.ThreadingHTTPServer(('127.0.0.1',8744),Handler).serve_forever()
