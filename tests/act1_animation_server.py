"""Read-only review server with the exact pre-pass JS snapshot for paired QA."""
import http.server,sys
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from serve import NoCacheHandler
class ReviewHandler(NoCacheHandler):
    def do_POST(self):
        self.send_error(405,'The review server is read-only')
    def translate_path(self,path):
        prefix='/tmp/act1_animation/before/'
        if path.startswith(prefix) and not (ROOT/urlsplit(path).path.lstrip('/')).is_file():path='/'+path[len(prefix):]
        return super().translate_path(path)
    def log_message(self,*args):pass
if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',8756),ReviewHandler)
    print('Act I review: http://127.0.0.1:8756/tests/act1_animation_review.html',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
