#!/usr/bin/env python3
"""Local dev server for TimMetal.

Serves the site root on :8000 with caching disabled, so edits to
styles.css / *.js / *.html show up on a normal refresh instead of being
served from a stale browser cache. ROOT is anchored to this script's own
folder (the site root, where index.html lives), so it works no matter
which directory you run it from:  python dev-server.py

Also mirrors the clean-URL rewrites from vercel.json, so the nav links
(/products, /about, /products/<slug>) resolve locally the same way they
do in production instead of 404-ing.
"""
import http.server
import os
import re
import socketserver
import urllib.parse

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))  # koren sajta = folder ovog skripta
os.chdir(ROOT)

# Isto kao "rewrites" u vercel.json — drži ova dva u sinhronu.
REWRITES = [
    (re.compile(r"^/about/?$"), "/about.html"),
    (re.compile(r"^/contact/?$"), "/contact.html"),
    (re.compile(r"^/products/?$"), "/products.html"),
    (re.compile(r"^/products/[^/]+/?$"), "/product.html"),
]


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Forsiraj browser da uvek učitava svež sadržaj
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        self.path = self.rewrite(self.path)
        super().do_GET()

    def do_HEAD(self):
        self.path = self.rewrite(self.path)
        super().do_HEAD()

    def rewrite(self, path):
        """Čist URL -> pravi .html fajl; query string ostaje netaknut."""
        split = urllib.parse.urlsplit(path)
        for pattern, target in REWRITES:
            if pattern.match(split.path):
                # products.js čita slug iz location.pathname, pa query
                # (npr. ?lang=sr) mora da preživi rewrite.
                return urllib.parse.urlunsplit(("", "", target, split.query, split.fragment))
        return path


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print("TimMetal dev server (no-cache) serving %s" % ROOT)
        print("  -> http://localhost:%d" % PORT)
        httpd.serve_forever()