#!/usr/bin/env python3
"""Local dev server for TimMetal.

Serves the site root on :8000 with caching disabled, so edits to
styles.css / *.js / *.html show up on a normal refresh instead of being
served from a stale browser cache. ROOT is anchored to this script's own
folder (the site root, where index.html lives), so it works no matter
which directory you run it from:  python dev-server.py
"""
import http.server
import os
import socketserver

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))  # koren sajta = folder ovog skripta
os.chdir(ROOT)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Forsiraj browser da uvek učitava svež sadržaj
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print("TimMetal dev server (no-cache) serving %s" % ROOT)
        print("  -> http://localhost:%d" % PORT)
        httpd.serve_forever()