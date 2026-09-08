"""Isolated animation review and artifacts; no access to real saves."""
from act2_server import ReviewHandler
import http.server
from urllib.parse import urlsplit

class AnimationReviewHandler(ReviewHandler):
    artifacts = 'act2_animation'
    def translate_path(self, path):
        if path.startswith('/tmp/act2_animation/before/assets/'):
            path = path[len('/tmp/act2_animation/before'):]
        # The snapshot owns the changed JS runtime. Unchanged 3D ES modules
        # are shared, just like unchanged textures and models.
        if path.startswith('/tmp/act2_animation/before/js/') and urlsplit(path).path.endswith('.mjs'):
            path = path[len('/tmp/act2_animation/before'):]
        return super().translate_path(path)

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8749), AnimationReviewHandler)
    print('http://127.0.0.1:8749/tests/act2_review.html?enemyReview&animationReview', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: server.server_close()
