from flask import Flask, request, jsonify
from flask_cors import CORS
from readability import Document
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv
import os, requests, urllib.parse
from collections import defaultdict

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize OpenAI client (via OpenRouter)
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("API_KEY")
)

# Store conversations per session ID
conversations = defaultdict(list)

def get_search_results(query, max_results=5):
    """Fetch search result URLs using DuckDuckGo."""
    encoded_query = urllib.parse.quote(query)
    res = requests.get(f"https://duckduckgo.com/html/?q={encoded_query}", headers={"User-Agent": "Mozilla/5.0"})
    soup = BeautifulSoup(res.text, "html.parser")
    links = []

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("http") and "duckduckgo.com" not in href:
            links.append(href)
            if len(links) >= max_results:
                break

    return links

def scrape_and_clean(url):
    """Download and clean the main content from a webpage."""
    try:
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=8)
        doc = Document(res.text)
        soup = BeautifulSoup(doc.summary(), "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "form"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)
    except Exception:
        return ""

def chunk(text, max_words=800):
    """Split text into reasonable-length chunks."""
    words = text.split()
    chunks = []
    i = 0

    while i < len(words):
        j = min(len(words), i + max_words)
        while j > i and not words[j - 1].endswith((".", "!", "?")):
            j -= 1
        if j == i:
            j = min(len(words), i + max_words)
        chunks.append(" ".join(words[i:j]))
        i = j

    return chunks

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    session_id = data.get("session_id")
    query = data.get("query", "").strip()

    if not session_id or not query:
        return jsonify(error="Both `session_id` and `query` are required."), 400

    # Fetch and prepare context from the web
    urls = get_search_results(query)
    combined_text = "\n\n".join(scrape_and_clean(url) for url in urls[:3])
    context_chunks = chunk(combined_text)
    web_context = "\n\n".join(context_chunks[:2])  # Limit to first 2 chunks

    # Build message list for LLM
    history = conversations[session_id]
    system_msg = {
        "role": "system",
        "content": (
            "You are a helpful assistant. Use the following web context when answering:\n\n"
            f"{web_context}"
        )
    }
    user_msg = {"role": "user", "content": query}
    messages = [system_msg] + history + [user_msg]

    # Call OpenRouter model
    try:
        response = client.chat.completions.create(
            model="deepseek/deepseek-prover-v2:free",
            messages=messages,
            extra_headers={
                "HTTP-Referer": "http://localhost",
                "X-Title": "web-llm-assistant"
            }
        )
        reply = response.choices[0].message.content.strip()
    except Exception as e:
        return jsonify(error="Failed to get a valid response from the LLM.", details=str(e)), 500

    # Update conversation memory
    history.extend([user_msg, {"role": "assistant", "content": reply}])
    conversations[session_id] = history[-20:]  # Keep last 20 messages

    return jsonify(response=reply)

@app.route("/memory/<session_id>", methods=["GET"])
def get_memory(session_id):
    """Return saved conversation memory for a session."""
    return jsonify(conversations.get(session_id, []))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
