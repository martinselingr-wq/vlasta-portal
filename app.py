"""
=============================================================================
PROJEKT VLASTA — Master System Launcher (Web & MCP Server)
=============================================================================
Spouští lokální webový portál VLASTA na http://127.0.0.1:3001
a samostatný MCP Server na http://127.0.0.1:8091/mcp
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
import json
import http.server
import socketserver
import re
import functools
from datetime import datetime

# Path setup
BASE_DIR = os.path.dirname(__file__)
WEB_DIR = os.path.join(BASE_DIR, "web")
sys.path.insert(0, BASE_DIR)

from mcp.tools import (
    tool_vlasta_hledat,
    tool_vlasta_detail,
    tool_vlasta_pridat,
    tool_vlasta_statistiky,
    tool_vlasta_codebooks,
    load_db
)

PORT = int(os.environ.get("PORT", 3001))
HOST = os.environ.get("HOST", "0.0.0.0")

class VlastaRequestHandler(http.server.SimpleHTTPRequestHandler):

    def send_json_response(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            if self.path == '/api/vlasta/items':
                data = tool_vlasta_hledat(limit=100)
                self.send_json_response(200, data)
                return
            if self.path == '/api/vlasta/stats':
                data = tool_vlasta_statistiky()
                self.send_json_response(200, data)
                return
            if self.path.startswith('/api/vlasta/codebooks'):
                cb_type = None
                if 'type=' in self.path:
                    cb_type = self.path.split('type=')[1].split('&')[0]
                data = tool_vlasta_codebooks(cb_type=cb_type, action="get")
                self.send_json_response(200, data)
                return
            super().do_GET()
        except Exception as e:
            print(f"Error in do_GET: {e}", flush=True)
            self.send_json_response(500, {"error": str(e)})

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
            req_json = json.loads(post_data.decode('utf-8') or '{}')

            if self.path == '/api/vlasta/codebooks':
                cb_type = req_json.get('type')
                item_data = req_json.get('data', {})
                res = tool_vlasta_codebooks(cb_type=cb_type, action="add", data=item_data)
                self.send_json_response(200, res)
                return

            if self.path == '/api/vlasta/items':
                res = tool_vlasta_pridat(
                    code=req_json.get('code', f'VLS-{int(datetime.now().timestamp())}'),
                    name=req_json.get('name', 'Nová Položka Vlasta'),
                    category=req_json.get('category', 'Kategorie A'),
                    quantity=req_json.get('quantity', 1),
                    location=req_json.get('location', 'Hlavní sklad')
                )
                self.send_json_response(200, res)
                return

            if self.path == '/api/vlasta/parse-voice':
                text = req_json.get('text', '')
                code_match = re.search(r'vls-\d+', text, re.IGNORECASE)
                code = code_match.group(0).upper() if code_match else f"VLS-{int(datetime.now().timestamp()) % 10000}"
                
                qty_match = re.search(r'(\d+)\s*(?:kusů|kusy|ks)', text, re.IGNORECASE)
                qty = int(qty_match.group(1)) if qty_match else 1

                res = tool_vlasta_pridat(
                    code=code,
                    name=text[:30] + "..." if len(text) > 30 else text,
                    category="Hlasový Vstup",
                    quantity=qty,
                    location="Hlasový Příjem"
                )
                self.send_json_response(200, res)
                return

            self.send_json_response(404, {"error": "Endpoint not found"})
        except Exception as e:
            print(f"Error in do_POST: {e}", flush=True)
            self.send_json_response(500, {"error": str(e)})

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def main():
    print(f"🚀 Spouštím projekt VLASTA na http://{HOST}:{PORT}", flush=True)
    handler = functools.partial(VlastaRequestHandler, directory=WEB_DIR)
    server = ThreadedHTTPServer((HOST, PORT), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Systém VLASTA zastaven.")


if __name__ == "__main__":
    main()

