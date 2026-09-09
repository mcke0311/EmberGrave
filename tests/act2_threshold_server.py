"""Serve fresh boundary baseline and record isolated visual/performance QA."""
import http.server
from act2_server import ReviewHandler
class BoundaryHandler(ReviewHandler):
    artifacts='act2_thresholds'
    def translate_path(self,path):
        if path.startswith('/tmp/act2_thresholds/before/assets/'):
            path=path[len('/tmp/act2_thresholds/before'):]
        return super().translate_path(path)
if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',8753),BoundaryHandler)
    print('Act 2 boundaries: http://127.0.0.1:8753/tests/act2_threshold_review.html',flush=True)
    server.serve_forever()
