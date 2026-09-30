"""
=============================================================================
PROJEKT VLASTA — Production Web Portal & REST API Server
=============================================================================
"""

import os
import sys
import re
import json
import importlib.util
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

from flask import Flask, jsonify, request, send_from_directory

# Path setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Robust import of tools module with fallback
try:
    from mcp.tools import (
        tool_vlasta_hledat,
        tool_vlasta_detail,
        tool_vlasta_pridat,
        tool_vlasta_statistiky,
        tool_vlasta_codebooks,
        load_db
    )
except Exception:
    tools_path = os.path.join(BASE_DIR, "mcp", "tools.py")
    spec = importlib.util.spec_from_file_location("vlasta_tools", tools_path)
    tools_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tools_mod)
    tool_vlasta_hledat = tools_mod.tool_vlasta_hledat
    tool_vlasta_detail = tools_mod.tool_vlasta_detail
    tool_vlasta_pridat = tools_mod.tool_vlasta_pridat
    tool_vlasta_statistiky = tools_mod.tool_vlasta_statistiky
    tool_vlasta_codebooks = tools_mod.tool_vlasta_codebooks
    load_db = tools_mod.load_db

app = Flask(__name__, static_folder=WEB_DIR, static_url_path='')

@app.route('/')
def index():
    return send_from_directory(WEB_DIR, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    if os.path.exists(os.path.join(WEB_DIR, path)):
        return send_from_directory(WEB_DIR, path)
    return send_from_directory(WEB_DIR, 'index.html')

@app.route('/api/vlasta/items', methods=['GET'])
def get_items():
    data = tool_vlasta_hledat(limit=100)
    return jsonify(data)

@app.route('/api/vlasta/stats', methods=['GET'])
def get_stats():
    data = tool_vlasta_statistiky()
    return jsonify(data)

@app.route('/api/vlasta/codebooks', methods=['GET'])
def get_codebooks():
    cb_type = request.args.get('type')
    data = tool_vlasta_codebooks(cb_type=cb_type, action="get")
    return jsonify(data)

@app.route('/api/vlasta/codebooks', methods=['POST'])
def add_codebook():
    req_json = request.get_json(force=True, silent=True) or {}
    cb_type = req_json.get('type')
    item_data = req_json.get('data', {})
    res = tool_vlasta_codebooks(cb_type=cb_type, action="add", data=item_data)
    return jsonify(res)

@app.route('/api/vlasta/items', methods=['POST'])
def add_item():
    req_json = request.get_json(force=True, silent=True) or {}
    res = tool_vlasta_pridat(
        code=req_json.get('code', f'VLS-{int(datetime.now().timestamp())}'),
        name=req_json.get('name', 'Nová Položka Vlasta'),
        category=req_json.get('category', 'Kategorie A'),
        quantity=req_json.get('quantity', 1),
        location=req_json.get('location', 'Hlavní sklad')
    )
    return jsonify(res)

@app.route('/api/vlasta/parse-voice', methods=['POST'])
def parse_voice():
    req_json = request.get_json(force=True, silent=True) or {}
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
    return jsonify(res)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3001))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Spoustim VLASTA portal na http://{host}:{port}", flush=True)
    app.run(host=host, port=port, debug=False)
