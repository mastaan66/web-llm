**Web-Connected LLM Assistant Backend**

This repository contains a Flask-based backend service that powers a conversational AI assistant. The assistant retrieves relevant web context via search and scraping, constructs LLM prompts, and maintains per-session conversation memory and titles. Built with modularity and extensibility in mind, it integrates seamlessly with a React or other front-end client.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Requirements](#requirements)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)

   * [Endpoints](#endpoints)

     * [`POST /ask`](#post-ask)
     * [`POST /sessions`](#post-sessions)
     * [`GET /sessions`](#get-sessions)
     * [`DELETE /sessions/<session_id>`](#delete-sessionssession_id)
     * [`POST /sessions/<session_id>/title`](#post-sessionssession_idtitle)
     * [`GET /memory/<session_id>`](#get-memorysession_id)
     * [`DELETE /memory/<session_id>`](#delete-memorysession_id)
7. [Code Walkthrough](#code-walkthrough)
8. [Error Handling & Logging](#error-handling--logging)
9. [Extending & Customization](#extending--customization)
10. [License](#license)

---

## Features

* **Web Search Integration**: Uses DuckDuckGo (`duckduckgo_search`) to fetch top search results for a user query.
* **Content Extraction**: Scrapes and cleans articles using `readability.Document` and `BeautifulSoup` to extract main text, removing scripts, styles, and extraneous HTML.
* **Prompt Construction**: Bundles up to three sources into a formatted context string, alongside conversation history, and sends them to an LLM.
* **LLM Client**: Uses an OpenAI-compatible client (via [OpenRouter](https://openrouter.ai)) to query any supported model.
* **Session Management**: Creates, lists, and deletes conversation sessions, each with its own memory and customizable title.
* **Memory Persistence**: Holds the last 20 messages (10 exchanges) per session in memory, ready to be persisted to a database if desired.
* **CORS Support**: Enables Cross-Origin Resource Sharing for easy front-end integration.

---

## Architecture

1. **Flask Application (`app.py`)**: Serves RESTful endpoints for chat, session, and memory operations.
2. **Utilities**:

   * `get_search_results()` — Query DuckDuckGo for URLs.
   * `scrape_and_clean()` — Download and clean page text.
   * `format_context()` — Assemble source data into a prompt-ready string.
   * `build_messages()` — Merge system instructions, history, and current user query for the LLM.
3. **Data Stores (In-Memory)**:

   * `conversations` (defaultdict of lists) stores per-session chat messages.
   * `session_titles` (dict) stores a human-readable title for each session.
4. **LLM Client**:

   * Configured via `OpenAI(base_url, api_key)` to send chat-completions requests.

---

## Requirements

* Python 3.8+
* Redis or database (optional, for persistent memory)

**Python Dependencies** (specified in `requirements.txt`):

```
flask
flask-cors
python-dotenv
readability-lxml
beautifulsoup4
openai-compatible (openrouter)
duckduckgo_search
requests
```

---

## Installation

1. **Clone the repository**:

   ```bash
   ```

git clone [https://github.com/your-username/llm-web-assistant-backend.git](https://github.com/your-username/llm-web-assistant-backend.git)
cd llm-web-assistant-backend

````

2. **Create and activate a virtual environment**:
   ```bash
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
venv\\Scripts\\activate  # Windows
````

3. **Install dependencies**:

   ```bash
   ```

pip install -r requirements.txt

````

4. **Configure environment** (see next section).

---

## Configuration

Copy the sample environment file and set your API key:

```bash
cp .env.example .env
# Edit .env and set API_KEY
env API_KEY="YOUR_OPENAI_API_KEY"
````

* `API_KEY`: Your OpenAI or OpenRouter API key for chat-completions.
* Optionally adjust DuckDuckGo and request timeouts in `app.py`.

---

## Usage

Start the server:

```bash
flask run --host=0.0.0.0 --port=5000
```

### Endpoints

#### `POST /ask`

Send a user query and receive an LLM response with cited web context.

* **Request Body**:

  ```json
  {
    "session_id": "<uuid>",
    "query": "What is the capital of France?"
  }
  ```

* **Response**:

  ```json
  {
    "response": "Paris is the capital of France...",
    "sources": [
      { "url": "https://...", "content": "Extracted text..." },
      ...
    ],
    "session_id": "<same uuid>"
  }
  ```

#### `POST /sessions`

Create a new chat session.

* **Response**:

  ```json
  {
    "id": "<uuid>",
    "title": "New Chat"
  }
  ```

#### `GET /sessions`

List all active sessions.

* **Response**:

  ```json
  [ { "id": "...", "title": "..." }, ... ]
  ```

#### `DELETE /sessions/<session_id>`

Delete an existing session (memory and title).

* **Response**:

  ```json
  { "success": true }
  ```

#### `POST /sessions/<session_id>/title`

Update the title for a session.

* **Request Body**:

  ```json
  { "title": "My Topic" }
  ```

* **Response**:

  ```json
  { "success": true }
  ```

#### `GET /memory/<session_id>`

Retrieve conversation history (list of message objects).

* **Response**:

  ```json
  [ { "role": "user", "content": "..." }, ... ]
  ```

#### `DELETE /memory/<session_id>`

Clear conversation history for a session.

* **Response**:

  ```json
  { "success": true }
  ```

---

## Code Walkthrough

1. **`get_search_results(query, max_results)`**

   * Uses `DDGS` to fetch URLs. Returns a list of top `max_results` URLs.

2. **`scrape_and_clean(url)`**

   * Downloads page HTML, runs through `readability.Document` to extract main article, then uses BeautifulSoup to strip unwanted tags.
   * Gathers text from `<p>`, `<h1>`, `<h2>`, `<h3>` tags.

3. **`format_context(sources)`**

   * Combines up to 3 sources into a single string labeled `[Source 1]`, `[Source 2]`, etc.

4. **`build_messages(query, context, history)`**

   * Initializes system prompt with instructions.
   * Appends last 6 messages from `history`.
   * Appends the current user query with embedded web context.

5. **`/ask` route**:

   * Validates input, scrapes up to 3 sources, builds context, calls LLM.
   * Saves new user and assistant messages into `conversations[session_id]`.

6. **Session & Memory routes**:

   * Provide CRUD operations on `session_titles` and `conversations`.

---

## Error Handling & Logging

* **Scraping Exceptions**: Caught and printed; failed scrapes return empty content.
* **LLM Errors**: Returned as HTTP 500 with details.
* **Input Validation**: Returns HTTP 400 if required fields are missing.

To add persistent logging, consider configuring Python's `logging` module and writing logs to a file or external service.

---

## Extending & Customization

* **Persistence**: Swap in SQLite or Redis for `conversations` and `session_titles` to survive restarts.
* **Rate Limiting**: Integrate `Flask-Limiter` to prevent abuse.
* **Parallel Scraping**: Use `concurrent.futures.ThreadPoolExecutor` to speed up multiple URL fetches.
* **Custom LLM Models**: Change `model` parameter in `client.chat.completions.create()` to any supported OpenAI model.
* **Enhanced Extraction**: Swap `readability` for `trafilatura` or other specialized extractors.

---

## License

This project is licensed under the MIT License.
