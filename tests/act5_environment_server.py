"""Serve the isolated Act V environment comparison and its fresh baseline."""
import http.server
from act2_server import ReviewHandler

class EnvironmentHandler(ReviewHandler):
    artifacts='act5_environment'
    protocol_version='HTTP/1.1'
    def end_headers(self):
        # Reuse sprite connections; POST responses inherited from the review
        # handler have no content length and must explicitly close.
        if self.command=='POST':
            self.send_header('Connection','close')
            self.close_connection=True
        super().end_headers()
    def log_message(self,*args):pass
    def do_POST(self):
        if self.path=='/api/cinders-review':self.path='/api/act2-review'
        return super().do_POST()
    def translate_path(self,path):
        if path.startswith('/tmp/act5_environment/before/assets/'):
            path=path[len('/tmp/act5_environment/before'):]
        return super().translate_path(path)

if __name__=='__main__':
    import runpy
    runpy.run_path('tests/act5_environment_baseline.py',run_name='__main__')
    server=http.server.ThreadingHTTPServer(('127.0.0.1',8879),EnvironmentHandler)
    print('Act V environment: http://127.0.0.1:8879/tests/act5_environment_review.html',flush=True)
    server.serve_forever()
