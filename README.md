**Chat.AI Web Assistant**

An end-to-end, full-stack web application combining a Flask-based backend LLM assistant with a React-powered chat frontend. Users can perform conversational queries enriched with live web search context, manage multiple sessions, and enjoy Markdown-rendered responses with syntax highlighting.


---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Getting Started](#getting-started)

   * [Backend Setup](#backend-setup)
   * [Frontend Setup](#frontend-setup)
6. [Configuration](#configuration)
7. [Running the Application](#running-the-application)
8. [Usage Guide](#usage-guide)

   * [API Endpoints](#api-endpoints)
   * [Frontend Workflow](#frontend-workflow)
9. [Project Structure](#project-structure)
10. [Extending & Customization](#extending--customization)
11. [Troubleshooting](#troubleshooting)
12. [License](#license)

---

## Project Overview

Chat.AI Web Assistant is designed to provide conversational answers powered by large language models (LLMs), augmented with on-the-fly web search and scraping. The Flask backend handles search, content extraction, prompt assembly, and LLM queries; the React frontend delivers a dynamic chat UI supporting multiple sessions, themes, and Markdown rendering.

---

## Features

* **Web Context**: DuckDuckGo search + readability-based scraping for up-to-date web content.
* **LLM Integration**: OpenRouter/OpenAI-compatible chat-completions client.
* **Session Management**: Create, switch, rename, and delete sessions with per-session history.
* **Markdown & Code**: Full GitHub-flavored Markdown support with syntax-highlighted code blocks.
* **Dark/Light Themes**: User-controlled themes with inline styling.
* **Animated UX**: Smooth transitions via Framer Motion.
* **Persistent Storage**: Browser `localStorage` for sessions; in-memory backend (can be extended to DB).

---

## Architecture

```
[Frontend: React] <---- HTTP ----> [Backend: Flask + Python]
         |                                |
     localStorage                    External Web
         |                             DuckDuckGo
         v                               |
   Session Data                      Scrape + Parse
                                        |
                                      LLM
```

* **Frontend**: `App.js` manages UI, state, and HTTP calls to backend.
* **Backend**: `app.py` exposes REST routes (`/sessions`, `/ask`, `/memory`), utilities for search & scraping, and LLM client.

---

## Prerequisites

* **Node.js** (v14+)
* **Python 3.8+**
* **Git**
* (Optional) Virtual environment tool (venv, conda)

---

## Getting Started

### Backend Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/your-username/chat-ai-web-assistant.git
   cd chat-ai-web-assistant/backend
   ```

2. **Create & activate venv**

   ```bash
   python3 -m venv venv
   source venv/bin/activate   # macOS/Linux
   venv\\Scripts\\activate  # Windows
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env:
   API_KEY="<Your OpenAI/OpenRouter API Key>"
   ```
5. **Obtaining an OpenRouter API Key**

- Sign up at https://openrouter.ai and verify your email address.
- Log in to your OpenRouter dashboard.
- Navigate to API Keys in the sidebar.
- Click Create New Key, give it a name (e.g., "Chat.AI Backend"), and copy the generated key.
- Paste the key into your .env file as the value of API_KEY.

### Frontend Setup

1. **Navigate to frontend**

   ```bash
   cd ../frontend
   ```

2. **Install packages**

   ```bash
   npm install
   ```

3. **Configure backend URL**

   * Edit `App.js` axios base URLs if your backend host/port differ (default: `http://localhost:5000`).

---

## Configuration

| Variable            | Description                             |
| ------------------- | --------------------------------------- |
| `API_KEY`           | OpenAI/OpenRouter API key for LLM calls |
| Frontend `BASE_URL` | URL of Flask backend (in `App.js`)      |

Adjust timeout and `max_results` in `get_search_results()` within `app.py` if needed.

---

## Running the Application

1. **Start Backend**  (from `/backend`)

   ```bash
   flask run --host=0.0.0.0 --port=5000
   ```

2. **Start Frontend**  (from `/frontend`)

   ```bash
   npm start
   ```

3. **Open in Browser**

   * Navigate to `http://localhost:3000` to interact with Chat.AI.

---

## Usage Guide

### API Endpoints

* `POST /sessions` — Create a new session
* `GET /sessions` — List sessions
* `DELETE /sessions/:id` — Delete session
* `POST /sessions/:id/title` — Update session title
* `GET /memory/:id` — Retrieve message history
* `DELETE /memory/:id` — Clear session history
* `POST /ask` — Submit user query, returns `{ response, sources, session_id }`

### Frontend Workflow

1. **New Chat**: Click **New Chat** (➕) to start.
2. **Switch Sessions**: Select a session from the sidebar.
3. **Enter Query**: Type in the input box; press Enter or send icon.
4. **View Response**: See loader, then rendered sources and the bot’s Markdown reply.
5. **Theme Toggle**: Use sun/moon icon to switch modes.
6. **Delete Session**: Click ⋮ on a session, then **Delete**.

---

## Project Structure


```
web-llm/
├── backend/              # Flask server
│   ├── app.py
│   └── requirements.txt
|   └── README.md
├── frontend/             # React + Tailwind client
│   ├── src/
│   │   └── App.jsx
│   └── README.md
├── README.md             # (this file)
```


---

## Extending & Customization

* **Persistence**: Swap in SQLite/Redis for session memory (replace in-memory dicts).
* **Parallel Scraping**: Use `concurrent.futures` to speed up `scrape_and_clean`.
* **Componentization**: Break `App.js` into Sidebar, Header, ChatWindow, and InputForm components.
* **Styling**: Migrate inline styles to CSS Modules or Chakra UI.
* **Security**: Add rate limiting (`Flask-Limiter`) and input sanitization.
* **Deployment**: Containerize with Docker; deploy backend and frontend on separate services.

---

## Troubleshooting

* **CORS Errors**: Ensure `flask-cors` is configured with correct origins.
* **API Key Errors**: Verify `API_KEY` is set and valid.
* **Port Conflicts**: Check no other service is running on ports 5000 or 3000.
* **Missing Dependencies**: Re-run `pip install` or `npm install` if import errors occur.

---

## Snapshots

![image1](/assets/picture1.png)
![image2](/assets/picture2.png)
![image3](/assets/picture3.png)
<!-- ![image4](/assets/picture4.png) -->
![image5](/assets/picture5.png)
![image6](/assets/picture6.png)
![image7](/assets/picture7.png)

---

## License

This project is licensed under the MIT License.