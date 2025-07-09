from flask import Flask, request, jsonify
from flask_cors import CORS
from meta_ai_api import MetaAI
import os
from collections import defaultdict
import uuid

app = Flask(__name__)
CORS(app)

# Initialize MetaAI client
meta_ai = MetaAI()

# Store conversations and session titles
conversations = defaultdict(list)
session_titles = {}

# --- Main Routes ---

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    session_id = data.get("session_id")
    query = data.get("query", "").strip()

    if not session_id or not query:
        return jsonify(error="Both session_id and query are required"), 400

    # Retrieve conversation history
    conversation_history = conversations.get(session_id, [])

    # Manually build a single prompt string with context
    prompt_parts = ["You are a helpful assistant. Continue this conversation:"]
    for msg in conversation_history[-6:]:
        role = msg["role"].capitalize()
        content = msg["content"]
        prompt_parts.append(f"{role}: {content}")
    prompt_parts.append(f"User: {query}") # Corrected role for user in prompt
    prompt = "\n".join(prompt_parts)

    try:
        # meta_ai.prompt returns a dictionary like {'message': '...', 'sources': [], 'media': []}
        llm_response = meta_ai.prompt(message=prompt)
        
        # Extract the message and sources from the LLM's full response
        reply_message = llm_response.get('message', 'No response message provided.')
        reply_sources = llm_response.get('sources', [])

    except Exception as e:
        # It's good practice to log the full exception details in a real app
        print(f"Error during LLM prompt: {e}") 
        return jsonify(error="LLM error", details=str(e)), 500

    user_msg = {"role": "user", "content": query}
    # Use the extracted message for the assistant's content
    assistant_msg = {"role": "assistant", "content": reply_message}
    conversations[session_id].extend([user_msg, assistant_msg])
    # Keep only the last 20 messages for memory
    conversations[session_id] = conversations[session_id][-20:]

    if session_id not in session_titles:
        session_titles[session_id] = query[:50] + ("..." if len(query) > 50 else "")

    # Return the data in the format the frontend expects
    return jsonify({
        "response": reply_message,
        "session_id": session_id,
        "sources": reply_sources # Include sources if available
    })

# --- Session Management Routes (rest of your code, no changes needed) ---

@app.route("/sessions", methods=["POST"])
def create_session():
    session_id = str(uuid.uuid4())
    session_titles[session_id] = "New Chat"
    conversations[session_id] = []
    return jsonify({
        "id": session_id,
        "title": session_titles[session_id]
    })

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
    if not data or "title" not in data:
        return jsonify(error="Title is required"), 400
    
    if session_id in session_titles:
        session_titles[session_id] = data["title"][:100]
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

# --- Main ---

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)