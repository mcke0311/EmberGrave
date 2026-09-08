"""Act 2 enemy review; separate artifacts and port from the layout comparison."""
from act2_server import ReviewHandler
import http.server
class EnemyReviewHandler(ReviewHandler):
    artifacts='act2_enemies'
    def translate_path(self,path):
        if path.startswith('/tmp/act2_enemies/before/assets/'):
            path=path[len('/tmp/act2_enemies/before'):]
        return super().translate_path(path)
if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',8748),EnemyReviewHandler)
    print('Act 2 enemy review: http://127.0.0.1:8748/tests/act2_review.html?enemyReview',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
