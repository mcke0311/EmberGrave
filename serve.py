#!/usr/bin/env python3
"""EMBERGRAVE dev server — serves the game with caching fully DISABLED so edits
to JS/CSS ALWAYS show up on reload. Plain `python -m http.server` caches files
(and returns 304 Not Modified), which makes code changes appear not to take
effect. This server is also threaded so the browser's many parallel script
requests all load reliably.  Run:  python serve.py   then open http://localhost:8741 """
import http.server
import json
import os

PORT = 8741
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

# files the editor is allowed to write (kept inside js/, no path traversal)
SAVABLE = {"data_overrides": os.path.join(ROOT, "js", "data_overrides.js")}


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # ES modules require a JavaScript MIME type. Windows file associations and
    # alternate Python installs can otherwise label .mjs as plain text.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".mjs": "text/javascript",
        ".js": "text/javascript",
    }

    def do_POST(self):
        # editor.html saves generated override files here, e.g. POST /api/save/data_overrides
        if self.path.startswith("/api/save/"):
            key = self.path[len("/api/save/"):].strip("/")
            dest = SAVABLE.get(key)
            if not dest:
                self.send_response(404); self.end_headers()
                self.wfile.write(b'{"ok":false,"error":"unknown target"}')
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length).decode("utf-8")
                with open(dest, "w", encoding="utf-8", newline="\n") as fh:
                    fh.write(body)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "bytes": len(body), "path": os.path.relpath(dest, ROOT)}).encode())
            except Exception as exc:  # noqa: BLE001 — report any write failure to the editor
                self.send_response(500); self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode())
            return
        self.send_response(404); self.end_headers()

    def send_head(self):
        # Strip conditional-request headers so we NEVER answer 304 — always
        # send the current file. (Belt and suspenders with the no-store header.)
        for h in ("If-Modified-Since", "If-None-Match", "If-Range"):
            while h in self.headers:
                del self.headers[h]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    # ThreadingHTTPServer handles the browser's parallel <script> requests at once.
    httpd = http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler)
    httpd.daemon_threads = True
    print(f"EMBERGRAVE serving (no-cache, threaded) at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()
