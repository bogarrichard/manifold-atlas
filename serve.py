#!/usr/bin/env python3
"""Dev server for Manifold Atlas. Stdlib only — no build step, no package manager.

Why this exists rather than a bare `python3 -m http.server 8000`: that server sends
Last-Modified but no Cache-Control, so browsers fall back to *heuristic* freshness and
may serve an edited file straight from disk cache without revalidating it. With no build
step and no fingerprinted filenames, there is nothing else to invalidate on, so the
symptom is an edit that silently does not take effect — and, because the heuristic depends
on how long ago the file last changed, it strikes some files and some reloads but not
others. Same server, caching turned off.

    python3 serve.py [port]        # port: CLI arg, else $PORT, else 8000

Note this only covers the HTTP cache. The service worker is the *other* caching layer;
sw.js disables and uninstalls itself on loopback hostnames for the same reason.
"""

import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    # Precedence: explicit CLI arg, then $PORT (how a launcher passes one), then 8000.
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT') or 8000)
    http.server.test(HandlerClass=Handler, port=port)
