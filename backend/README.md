# Web LLM Assistant – Backend

This is the backend service for a web-based AI assistant that performs real-time web search, content scraping, and conversational memory using a large language model (LLM). Built using Flask, it connects to OpenRouter-hosted LLMs to answer user queries with up-to-date and relevant web context.

---

## 🚀 Features

* 🔍 **Web Search Integration:** Uses DuckDuckGo to fetch search results based on user queries.
* 🧠 **LLM with Context:** Scrapes and summarizes top search result pages to give the model real-time, context-aware answers.
* 💬 **Session Memory:** Maintains per-user conversation history in memory using a session ID.
* 🤖 **OpenRouter Integration:** Connects to models like `deepseek-prover-v2` through OpenRouter's API.
* 🌐 **CORS Enabled:** Allows cross-origin requests from frontend applications (like a React app).

---

## 🛠️ Endpoints

### `POST /ask`

Processes a user query with web context.

#### Request Body

```json
{
  "session_id": "unique-session-id",
  "query": "What is quantum computing?"
}
```

#### Response

```json
{
  "response": "Quantum computing is a type of computation that..."
}
```

---

### `GET /memory/<session_id>`

Retrieves past conversation messages for a given session ID.

#### Example

`GET /memory/abc123`

#### Response

```json
[
  {"role": "user", "content": "What is AI?"},
  {"role": "assistant", "content": "AI stands for Artificial Intelligence..."}
]
```

---

## ⚙️ Setup & Run

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/web-llm-assistant.git
cd web-llm-assistant
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```
API_KEY=your_openrouter_api_key_here
```

### 4. Run the Server

```bash
python app.py
```

The server will start at `http://localhost:5000`.

---

## 📦 Dependencies

See `requirements.txt`:

* Flask
* flask-cors
* requests
* beautifulsoup4
* readability-lxml
* openai
* python-dotenv

---

## 🧠 How It Works

1. **User submits a question** from the frontend.
2. Backend:

   * Performs a DuckDuckGo search.
   * Scrapes and cleans top result pages.
   * Splits content into manageable chunks.
   * Constructs a conversation prompt with history and scraped data.
3. **LLM generates a response** using OpenRouter.
4. The message is returned and stored in memory for future context.

---

## 📌 Notes

* This app stores memory **in RAM only** (temporary).
* It is recommended to add persistent storage (e.g., a database) for production use.
* Built for use with a React frontend.