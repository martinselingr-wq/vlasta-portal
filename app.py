"""
=============================================================================
PROJEKT VLASTA — Production Web Portal & REST API Server (Flask)
=============================================================================
"""

import os
import sys
import re
import json
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
DB_FILE = os.path.join(BASE_DIR, "database", "data.json")

# =============================================================================
# DATA STORAGE & TOOL FUNCTIONS
# =============================================================================

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Chyba nacteni DB: {e}", flush=True)
    return {
        "items": [],
        "codebooks": {
            "technicians": [
                { "id": 1, "name": "Jaroslav Černý", "email": "jaroslav.cerny@cardion.cz", "phone": "+420 724 111 222", "region": "Jihomoravský kraj", "status": "Aktivní" },
                { "id": 2, "name": "Martin Selingr", "email": "martin.selingr@cardion.cz", "phone": "+420 724 528 085", "region": "Jihomoravský / Praha", "status": "Aktivní" },
                { "id": 3, "name": "Henio (Henryk Szymeczek)", "email": "henio@cardion.cz", "phone": "+420 724 333 444", "region": "Moravskoslezský kraj", "status": "Aktivní" },
                { "id": 4, "name": "Jakub Střítecký", "email": "jakub.stritecky@cardion.cz", "phone": "+420 724 555 666", "region": "Praha / Středočeský", "status": "Aktivní" }
            ],
            "hospitals": [
                { "id": 1, "name": "FN Brno Bohunice", "city": "Brno", "address": "Jihlavská 20, Brno", "preferred_brand": "Quadra Assura MP / Fortify Assura", "tender_status": "Schválený tender 2026" },
                { "id": 2, "name": "FN USA BRNO", "city": "Brno", "address": "Pekařská 53, Brno", "preferred_brand": "Gallant HF / DR / VR", "tender_status": "Schválený tender 2026" },
                { "id": 3, "name": "IKEM Praha", "city": "Praha", "address": "Vídeňská 1958/9, Praha 4", "preferred_brand": "Gallant / Fortify Assura", "tender_status": "Schválený tender 2026" },
                { "id": 4, "name": "FNsP Ostrava Poruba", "city": "Ostrava", "address": "17. listopadu 1790/5, Ostrava", "preferred_brand": "Gallant / Durata 7122", "tender_status": "Schválený tender 2026" }
            ],
            "material": [
                { "id": 1, "code": "PM3562", "name": "Quadra Allure MP™ CRT", "category": "CRT-D / ICD", "supplier": "CARDION s.r.o.", "warranty_months": 72 },
                { "id": 2, "code": "CDDRA500Q", "name": "Gallant DR CDDRA500Q", "category": "Dvoudutinový ICD (DR)", "supplier": "CARDION s.r.o.", "warranty_months": 72 },
                { "id": 3, "code": "CD1359-40QC", "name": "Fortify Assura VR CD1359-40QC", "category": "Jednodutinový ICD (VR)", "supplier": "CARDION s.r.o.", "warranty_months": 72 }
            ],
            "accessories": [
                { "id": 1, "code": "1458Q", "name": "Quartet™ 86 cm Elektroda", "category": "Elektrody", "compat": "Quadra Allure MP", "stock_min": 10 },
                { "id": 2, "code": "405120", "name": "Peel-Away Introducer 405120", "category": "Zaváděcí katétry", "compat": "Univerzální", "stock_min": 25 },
                { "id": 3, "code": "DS2C019", "name": "CPS Direct™ Universal DS2C019", "category": "Vodicí katétry", "compat": "Univerzální", "stock_min": 15 },
                { "id": 4, "code": "DS2G002", "name": "CPS COURIER™ Guidewire medium 195 cm", "category": "Vodicí dráty", "compat": "Univerzální", "stock_min": 30 }
            ]
        },
        "logs": []
    }

def save_db(db):
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Chyba ukladani DB: {e}", flush=True)

def tool_vlasta_hledat(query="", category="", limit=20, offset=0):
    db = load_db()
    items = db.get("items", [])
    filtered = items
    if query:
        q = query.lower()
        filtered = [i for i in filtered if q in i.get("name", "").lower() or q in i.get("code", "").lower()]
    if category:
        c = category.lower()
        filtered = [i for i in filtered if c in i.get("category", "").lower()]
    total = len(filtered)
    paged = filtered[offset:offset+limit]
    return {"total": total, "limit": limit, "offset": offset, "items": paged}

def tool_vlasta_detail(item_id=None, code=None):
    db = load_db()
    for item in db.get("items", []):
        if (item_id and item.get("id") == int(item_id)) or (code and item.get("code") == code):
            return {"found": True, "item": item}
    return {"found": False, "message": "Položka nenalezena"}

def tool_vlasta_pridat(code, name, category, quantity=1, location="Hlavní sklad", expiry=""):
    db = load_db()
    items = db.get("items", [])
    new_id = max([i.get("id", 0) for i in items] + [0]) + 1
    new_item = {
        "id": new_id,
        "code": code,
        "name": name,
        "category": category,
        "status": "Aktivní",
        "location": location,
        "quantity": int(quantity),
        "expiry": expiry or "2028-12-31",
        "created_at": datetime.now().isoformat()
    }
    items.insert(0, new_item)
    db["items"] = items
    db["logs"].append({"ts": datetime.now().isoformat(), "event": f"Pridana polozka {code} ({name})", "user": "System"})
    save_db(db)
    return {"ok": True, "item": new_item}

def tool_vlasta_statistiky():
    db = load_db()
    items = db.get("items", [])
    total_qty = sum([i.get("quantity", 0) for i in items])
    categories = {}
    for i in items:
        cat = i.get("category", "Ostatní")
        categories[cat] = categories.get(cat, 0) + 1
    return {"total_items": len(items), "total_quantity": total_qty, "categories_breakdown": categories, "last_updated": datetime.now().isoformat()}

def tool_vlasta_codebooks(cb_type=None, action="get", data=None):
    db = load_db()
    codebooks = db.get("codebooks", {
        "technicians": [],
        "hospitals": [],
        "material": [],
        "accessories": []
    })
    if action == "get":
        if cb_type and cb_type in codebooks:
            return {cb_type: codebooks[cb_type]}
        return codebooks
    if action == "add" and cb_type in codebooks and isinstance(data, dict):
        current_list = codebooks[cb_type]
        new_id = max([item.get("id", 0) for item in current_list] + [0]) + 1
        data["id"] = new_id
        current_list.append(data)
        db["codebooks"] = codebooks
        db["logs"].append({"ts": datetime.now().isoformat(), "event": f"Přidán záznam do číselníku {cb_type}: {data.get('name', 'Neznámý')}", "user": "System"})
        save_db(db)
        return {"ok": True, "item": data, "codebook": cb_type}
    return {"ok": False, "message": "Neplatný požadavek na číselník"}

# =============================================================================
# FLASK WEB SERVER APP
# =============================================================================

app = Flask(__name__, static_folder=WEB_DIR, static_url_path='')

@app.route('/')
def index():
    try:
        return app.send_static_file('index.html')
    except Exception as e:
        return f"VLASTA Portal Running. Error serving index.html: {e}", 200

@app.route('/<path:path>')
def static_proxy(path):
    try:
        return app.send_static_file(path)
    except Exception:
        return app.send_static_file('index.html')

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
