from flask import Flask, request, jsonify
from flask_cors import CORS
from readability import Document
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv
from duckduckgo_search import DDGS
import os, requests
from collections import defaultdict
import uuid

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# OpenAI-compatible client (via OpenRouter)
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("API_KEY")
)

conversations = defaultdict(list)
session_titles = {}

# --- Utility functions ---

def get_search_results(query, max_results=5):
    """
    Uses DuckDuckGo Search (via DDGS) to fetch top result URLs.
    """
    with DDGS() as ddgs:
        results = ddgs.text(query, max_results=max_results)
        return [r["href"] for r in results if "href" in r]

def scrape_and_clean(url):
    try:
        res = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10
        )
        doc = Document(res.text)
        soup = BeautifulSoup(doc.summary(), "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "form"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)
    except Exception:
        return ""

# --- Main route to handle queries ---

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    session_id = data.get("session_id")
    query = data.get("query", "").strip()

    if not session_id or not query:
        return jsonify(error="Both `session_id` and `query` are required."), 400

    # Step 1: Search and scrape content from web
    urls = get_search_results(query)
    sources = []
    for url in urls[:5]:
        content = scrape_and_clean(url)
        if content:
            sources.append({"url": url, "content": content[:1500]})

    # Step 2: Query the LLM with context
    system_msg = {"role": "system", "content": "You are a helpful assistant."}
    user_msg = {"role": "user", "content": query}
    messages = [system_msg, user_msg]

    try:
        response = client.chat.completions.create(
            model="deepseek/deepseek-prover-v2:free",
            messages=messages,
            extra_headers={
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "web-llm-assistant"
            }
        )
        reply = response.choices[0].message.content.strip()
    except Exception as e:
        return jsonify(error="LLM error", details=str(e)), 500

    # Store memory
    conversations[session_id].extend([user_msg, {"role": "assistant", "content": reply}])
    conversations[session_id] = conversations[session_id][-20:]

    return jsonify(response=reply, sources=sources)

# --- Memory management routes ---

@app.route("/memory/<session_id>", methods=["GET"])
def get_memory(session_id):
    return jsonify(conversations.get(session_id, []))

@app.route("/memory/<session_id>", methods=["DELETE"])
def delete_memory(session_id):
    conversations.pop(session_id, None)
    session_titles.pop(session_id, None)
    return jsonify(success=True)

# --- Session routes ---

@app.route("/sessions", methods=["GET"])
def get_sessions():
    session_list = [{"id": sid, "title": title} for sid, title in session_titles.items()]
    return jsonify(session_list)

@app.route("/sessions", methods=["POST"])
def create_session():
    sid = str(uuid.uuid4())
    session_titles[sid] = "New Chat"
    conversations[sid] = []
    return jsonify({"id": sid})

@app.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    conversations.pop(session_id, None)
    session_titles.pop(session_id, None)
    return jsonify(success=True)

@app.route("/sessions/<session_id>/title", methods=["POST"])
def update_session_title(session_id):
    data = request.get_json()
    title = data.get("title", "").strip()
    if session_id in session_titles and title:
        session_titles[session_id] = title
        return jsonify(success=True)
    return jsonify(error="Session not found or invalid title"), 400

# --- Start server ---

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
