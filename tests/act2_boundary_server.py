"""Serve fresh boundary baseline and record isolated visual/performance QA."""
import http.server
from act2_server import ReviewHandler
class BoundaryHandler(ReviewHandler):
    artifacts='act2_boundaries'
    def translate_path(self,path):
        if path.startswith('/tmp/act2_boundaries/before/assets/'):
            path=path[len('/tmp/act2_boundaries/before'):]
        return super().translate_path(path)
if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',8752),BoundaryHandler)
    print('Act 2 boundaries: http://127.0.0.1:8752/tests/act2_boundary_review.html',flush=True)
    server.serve_forever()
