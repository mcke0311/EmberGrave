"""Isolated review server; only QA requests write artifacts."""
import http.server
from act2_server import ReviewHandler
class Handler(ReviewHandler):
    artifacts='act1_environment'
    def translate_path(self,path):
        if path.startswith('/tmp/act1_environment/before/assets/'):
            path=path[len('/tmp/act1_environment/before'):]
        return super().translate_path(path)
if __name__=='__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1',8755),Handler).serve_forever()
