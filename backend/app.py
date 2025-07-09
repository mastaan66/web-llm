from flask import Flask, request, jsonify
from flask_cors import CORS
from meta_ai_api import MetaAI
import json
import json5
import re
import uuid
from collections import defaultdict

app = Flask(__name__)
CORS(app)

meta_ai = MetaAI()
conversations = defaultdict(list)
session_titles = {}

# ==================================================
# Helper to safely parse JSON with multi-stage fallback
# ==================================================
def try_parse_json_safely(text):
    """
    Attempts to parse JSON using multiple strategies:
    1. Standard strict json.loads
    2. Looser json5.loads
    3. Regex-cleaned version (removing trailing commas & fixing quotes)

    Returns the parsed object or raises the last exception if all fail.
    """
    last_error = None

    # 1. Try strict JSON
    try:
        result = json.loads(text)
        print("[JSON parse success] Using standard json.loads")
        return result
    except json.JSONDecodeError as e:
        last_error = e
        print("[JSON parse failed] Standard json.loads:", e)

    # 2. Try JSON5 for more relaxed JSON
    try:
        result = json5.loads(text)
        print("[JSON parse success] Using json5.loads")
        return result
    except ValueError as e:
        last_error = e
        print("[JSON parse failed] json5.loads:", e)

    # 3. Last resort: regex fix trailing commas & single quotes
    safe_text = re.sub(r",\s*([}\]])", r"\1", text)
    safe_text = safe_text.replace("'", '"')
    try:
        result = json.loads(safe_text)
        print("[JSON parse success] Using cleaned text with json.loads")
        return result
    except json.JSONDecodeError as e:
        last_error = e
        print("[JSON parse failed] Cleaned json.loads:", e)

    try:
        result = json5.loads(safe_text)
        print("[JSON parse success] Using cleaned text with json5.loads")
        return result
    except ValueError as e:
        last_error = e
        print("[JSON parse failed] Cleaned json5.loads:", e)

    # If nothing worked, raise the last error
    print("[JSON parse error] All parse attempts failed.")
    raise last_error


# ==================================================
# Chat endpoint
# ==================================================
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    session_id = data.get("session_id")
    query = data.get("query", "").strip()

    if not session_id or not query:
        return jsonify(error="Both session_id and query are required"), 400

    history = conversations.get(session_id, [])
    prompt_parts = ["You are a helpful assistant. Continue this conversation:"]
    for msg in history[-6:]:
        prompt_parts.append(f"{msg['role'].capitalize()}: {msg['content']}")
    prompt_parts.append(f"User: {query}")
    prompt_text = "\n".join(prompt_parts)

    try:
        llm_response = meta_ai.prompt(message=prompt_text)
        reply_message = llm_response.get('message', 'No response provided.')
        reply_sources = llm_response.get('sources', [])
    except Exception as e:
        print(f"[LLM error /ask]: {e}")
        return jsonify(error="LLM error", details=str(e)), 500

    conversations[session_id].extend([
        {"role": "user", "content": query},
        {"role": "assistant", "content": reply_message}
    ])
    conversations[session_id] = conversations[session_id][-20:]

    if session_id not in session_titles:
        session_titles[session_id] = query[:50] + ("..." if len(query) > 50 else "")

    return jsonify({
        "response": reply_message,
        "session_id": session_id,
        "sources": reply_sources
    })

# ==================================================
# Mind map generation endpoint with robust prompt
# ==================================================
@app.route("/generate_mindmap", methods=["POST"])
def generate_mindmap():
    data = request.get_json()
    user_prompt = data.get("prompt")
    if not user_prompt:
        return jsonify({"error": "Prompt is missing"}), 400

    strict_prompt = f"""
IMPORTANT: You must output ONLY a complete, valid JSON object.
Do NOT include any conversational text, explanations, or markdown. 
Strictly output a single JSON object as plain text.

JSON REQUIREMENTS:
- It MUST contain exactly two top-level keys: "nodes" (an array) and "edges" (an array).
- All keys and string values must use double quotes.
- No trailing commas.
- All brackets and braces must be properly closed.

NODE STRUCTURE:
Each object in "nodes" must have:
  - "id": unique string (e.g., "Node1")
  - "x": number (X position)
  - "y": number (Y position)
  - "size": array of two numbers [width, height]
  - "shape": string (e.g., "circle")
  - "label": string
  - "color": string (hex color)

EDGE STRUCTURE:
Each object in "edges" must have:
  - "id": unique string
  - "source": node ID string
  - "target": node ID string
  - "label": string
  - "color": string (hex color)
  - "length": number

LOGIC REQUIREMENTS:
- Place main ideas at center (level 1).
- Direct details on level 2.
- Examples/facts on level 3.
- Avoid duplicate branches and overlapping nodes.
- Generate between 20 and 30 nodes and edges combined.
- Use varied node and edge colors and lengths.

USE THIS EXACT TEMPLATE:
{{
  "nodes": [
    {{
      "id": "Node1",
      "x": 50,
      "y": 50,
      "size": [60, 60],
      "shape": "circle",
      "label": "Apple",
      "color": "#FF0000"
    }},
    {{
      "id": "Node2",
      "x": 200,
      "y": 50,
      "size": [60, 60],
      "shape": "circle",
      "label": "iOS",
      "color": "#00FF00"
    }}
  ],
  "edges": [
    {{
      "id": "Edge1",
      "source": "Node1",
      "target": "Node2",
      "label": "runs on",
      "color": "#0000FF",
      "length": 100
    }}
  ]
}}

SCENARIO: {user_prompt}
TRANSCRIPT CONTEXT: {user_prompt}
"""

    try:
        llm_response = meta_ai.prompt(message=strict_prompt)
        raw_message = llm_response.get('message', '')
        print("\n[Raw LLM mindmap response]:", raw_message)

        # Extract JSON block from first { to last }
        first_brace = raw_message.find('{')
        last_brace = raw_message.rfind('}')
        json_candidate = raw_message[first_brace:last_brace+1] if (first_brace != -1 and last_brace != -1) else raw_message.strip()

        print("\n[Extracted JSON candidate]:", json_candidate)
        parsed_json = try_parse_json_safely(json_candidate)
        return jsonify(parsed_json)

    except Exception as e:
        print(f"[MindMap parse error]: {e}")
        return jsonify({"error": f"Failed to parse mind map JSON: {str(e)}"}), 500

# ==================================================
# Session & memory endpoints
# ==================================================
@app.route("/sessions", methods=["POST"])
def create_session():
    session_id = str(uuid.uuid4())
    session_titles[session_id] = "New Chat"
    conversations[session_id] = []
    return jsonify({"id": session_id, "title": session_titles[session_id]})

@app.route("/sessions", methods=["GET"])
def list_sessions():
    return jsonify([
        {"id": sid, "title": title}
        for sid, title in session_titles.items()
    ])

@app.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    conversations.pop(session_id, None)
    session_titles.pop(session_id, None)
    return jsonify(success=True)

@app.route("/sessions/<session_id>/title", methods=["POST"])
def update_title(session_id):
    data = request.get_json()
    title = data.get("title")
    if not title:
        return jsonify(error="Title is required"), 400
    if session_id in session_titles:
        session_titles[session_id] = title[:100]
        return jsonify(success=True)
    return jsonify(error="Session not found"), 404

@app.route("/memory/<session_id>", methods=["GET"])
def get_memory(session_id):
    return jsonify(conversations.get(session_id, []))

@app.route("/memory/<session_id>", methods=["DELETE"])
def clear_memory(session_id):
    if session_id in conversations:
        conversations[session_id] = []
        return jsonify(success=True)
    return jsonify(error="Session not found"), 404

# ==================================================
# Main entry point
# ==================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
