"""Exercise real HTTP responses with deliberately incorrect OS MIME mappings."""
import http.client
import importlib.util
import mimetypes
from pathlib import Path
import threading
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("game_server", ROOT / "serve.py")
game_server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(game_server)


class ServerContract(unittest.TestCase):
    def test_browser_module_responses(self):
        mimetypes.init()
        original = {ext: mimetypes.types_map.get(ext) for ext in (".mjs", ".js")}
        for ext in original:
            mimetypes.types_map[ext] = "text/plain"
        server = game_server.http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), game_server.NoCacheHandler
        )
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            for path in (
                "/js/character_catalog3d.mjs",
                "/js/character3d.mjs?v=18",
                "/js/character_forms3d.mjs?v=9",
                "/js/player3d.js?v=19",
                "/js/vendor/three/three.module.min.js",
            ):
                with self.subTest(path=path):
                    conn = http.client.HTTPConnection(*server.server_address, timeout=5)
                    try:
                        conn.request("GET", path, headers={
                            "If-Modified-Since": "Wed, 01 Jan 2099 00:00:00 GMT"
                        })
                        response = conn.getresponse()
                        body = response.read()
                        self.assertEqual(response.status, 200)
                        self.assertEqual(response.getheader("Content-Type"), "text/javascript")
                        self.assertIn("no-store", response.getheader("Cache-Control"))
                        self.assertEqual(body, (ROOT / path[1:].split("?")[0]).read_bytes())
                    finally:
                        conn.close()
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=5)
            for ext, value in original.items():
                if value is None:
                    mimetypes.types_map.pop(ext, None)
                else:
                    mimetypes.types_map[ext] = value


if __name__ == "__main__":
    unittest.main()
