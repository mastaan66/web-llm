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

# Store conversations and session titles
conversations = defaultdict(list)
session_titles = {}

# --- Utility Functions ---

def get_search_results(query, max_results=1):
    """Fetch top search results using DuckDuckGo"""
    with DDGS() as ddgs:
        results = ddgs.text(query, max_results=max_results)
        return [r["href"] for r in results if "href" in r]

def scrape_and_clean(url):
    """Scrape and clean webpage content"""
    try:
        res = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10
        )
        doc = Document(res.text)
        soup = BeautifulSoup(doc.summary(), "html.parser")
        
        # Remove unnecessary elements
        for tag in soup(["script", "style", "nav", "footer", "form", "iframe", "img"]):
            tag.decompose()
            
        # Get clean text with improved formatting
        text = '\n'.join([p.get_text().strip() for p in soup.find_all(['p', 'h1', 'h2', 'h3']) if p.get_text().strip()])
        return text
    except Exception as e:
        print(f"Error scraping {url}: {str(e)}")
        return ""

def format_context(sources):
    """Format scraped content for LLM context"""
    if not sources:
        return "No web context available."
    
    context_str = "WEB CONTEXT:\n"
    for idx, source in enumerate(sources, 1):
        context_str += f"\n[Source {idx} - {source['url']}]\n{source['content']}\n"
    return context_str

def build_messages(query, context_str, conversation_history):
    """Construct the message history with context"""
    messages = []
    
    # System message with instructions
    messages.append({
        "role": "system",
        "content": """You are a helpful assistant that answers questions using provided web context when available.
- Base your answers primarily on the provided context
- If the context doesn't contain the answer, say so and provide general knowledge if helpful
- Cite sources using [1], [2] etc when applicable
- Be concise but thorough"""
    })
    
    # Add conversation history (last 3 exchanges)
    if conversation_history:
        messages.extend(conversation_history[-6:])
    
    # Add current query with context
    messages.append({
        "role": "user",
        "content": f"Question: {query}\n\n{context_str}"
    })
    
    return messages

# --- Main Routes ---

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    session_id = data.get("session_id")
    query = data.get("query", "").strip()

    if not session_id or not query:
        return jsonify(error="Both session_id and query are required"), 400

    # Step 1: Search and scrape relevant content
    urls = get_search_results(query)
    sources = []
    for url in urls:
        content = scrape_and_clean(url)
        if content:
            sources.append({
                "url": url,
                "content": content[:800]  # Limit content length
            })
            if len(sources) >= 3:  # Limit to 3 sources
                break

    # Step 2: Prepare context and messages
    context_str = format_context(sources)
    conversation_history = conversations.get(session_id, [])
    messages = build_messages(query, context_str, conversation_history)

    # Step 3: Query the LLM
    try:
        response = client.chat.completions.create(
            model="deepseek/deepseek-prover-v2:free",
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
            extra_headers={
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "web-llm-assistant"
            }
        )
        reply = response.choices[0].message.content.strip()
    except Exception as e:
        return jsonify(error="LLM error", details=str(e)), 500

    # Step 4: Update conversation history
    user_msg = {"role": "user", "content": query}
    assistant_msg = {"role": "assistant", "content": reply}
    
    conversations[session_id].extend([user_msg, assistant_msg])
    conversations[session_id] = conversations[session_id][-20:]  # Keep last 10 exchanges

    # Set session title if new session
    if session_id not in session_titles:
        session_titles[session_id] = query[:50] + ("..." if len(query) > 50 else "")

    return jsonify({
        "response": reply,
        "sources": sources,
        "session_id": session_id
    })

# --- Session Management Routes ---

@app.route("/sessions", methods=["POST"])
def create_session():
    """Create a new conversation session"""
    session_id = str(uuid.uuid4())
    session_titles[session_id] = "New Chat"
    conversations[session_id] = []
    return jsonify({
        "id": session_id,
        "title": session_titles[session_id]
    })

@app.route("/sessions", methods=["GET"])
def list_sessions():
    """List all active sessions"""
    return jsonify([
        {"id": sid, "title": title}
        for sid, title in session_titles.items()
    ])

@app.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    """Delete a specific session"""
    conversations.pop(session_id, None)
    session_titles.pop(session_id, None)
    return jsonify(success=True)

@app.route("/sessions/<session_id>/title", methods=["POST"])
def update_title(session_id):
    """Update a session's title"""
    data = request.get_json()
    if not data or "title" not in data:
        return jsonify(error="Title is required"), 400
    
    if session_id in session_titles:
        session_titles[session_id] = data["title"][:100]
        return jsonify(success=True)
    return jsonify(error="Session not found"), 404

@app.route("/memory/<session_id>", methods=["GET"])
def get_memory(session_id):
    """Get conversation history for a session"""
    return jsonify(conversations.get(session_id, []))

@app.route("/memory/<session_id>", methods=["DELETE"])
def clear_memory(session_id):
    """Clear conversation history for a session"""
    if session_id in conversations:
        conversations[session_id] = []
        return jsonify(success=True)
    return jsonify(error="Session not found"), 404

# --- Main ---

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)