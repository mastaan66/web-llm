from flask import Flask, request, jsonify
from flask_cors import CORS
from readability import Document
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv
import os, requests, urllib.parse, re
from collections import defaultdict

load_dotenv()
app = Flask(__name__)
CORS(app)

# OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("API_KEY")
)

# In-memory conversation store: session_id → [ {role, content}, … ]
conversations = defaultdict(list)

def get_search_results(query, max_results=5):
    q = urllib.parse.quote(query)
    r = requests.get(f"https://duckduckgo.com/html/?q={q}", headers={"User-Agent":"Mozilla/5.0"})
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("http") and "duckduckgo.com" not in href:
            out.append(href)
            if len(out) >= max_results:
                break
    return out

def scrape_and_clean(url):
    try:
        r = requests.get(url, headers={"User-Agent":"Mozilla/5.0"}, timeout=8)
        doc = Document(r.text)
        soup = BeautifulSoup(doc.summary(), "html.parser")
        for t in soup(["script","style","nav","footer","form"]):
            t.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return text
    except Exception:
        return ""

def chunk(text, max_words=800):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        j = min(len(words), i+max_words)
        while j>i and not words[j-1].endswith((".", "!", "?")):
            j -= 1
        if j==i:
            j = min(len(words), i+max_words)
        chunks.append(" ".join(words[i:j]))
        i = j
    return chunks

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    session_id = data.get("session_id")
    query = data.get("query", "").strip()
    if not session_id or not query:
        return jsonify(error="`session_id` and non-empty `query` are required"), 400

    # 1) Fetch & clean web context
    urls = get_search_results(query)
    combined = "\n\n".join(scrape_and_clean(u) for u in urls[:3])
    chunks = chunk(combined)
    context = "\n\n".join(chunks[:2])  # limit to first 2 chunks

    # 2) Build message list: history + system/context + new user message
    history = conversations[session_id]
    system_msg = {
        "role": "system",
        "content": (
            "You are a helpful assistant. Use the following web context when answering:\n\n"
            f"{context}"
        )
    }
    user_msg = {"role": "user", "content": query}

    messages = [system_msg] + history + [user_msg]

    # 3) Call the model
    resp = client.chat.completions.create(
        model="deepseek/deepseek-prover-v2:free",
        messages=messages,
        extra_headers={
            "HTTP-Referer": "http://localhost",
            "X-Title": "web-llm-assistant"
        }
    )
    reply = resp.choices[0].message.content.strip()

    # 4) Update history (only keep last 10 messages to bound memory)
    history.extend([user_msg, {"role":"assistant","content":reply}])
    conversations[session_id] = history[-20:]

    return jsonify(response=reply)

@app.route("/memory/<session_id>", methods=["GET"])
def get_memory(session_id):
    mem = conversations.get(session_id, [])
    return jsonify(mem)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
