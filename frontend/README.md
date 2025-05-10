# Web LLM Assistant – Frontend

This is the **React-based frontend** for the Web LLM Assistant. It connects to a Python backend that performs real-time web search and LLM-powered answering. The interface is sleek, responsive, supports light/dark themes, session-based memory, markdown formatting, and a ChatGPT-like sidebar for past conversations.

---

## ✨ Features

* 💬 **Chat UI:** Clean, responsive chat interface with smooth animations and message bubbles.
* 🌙 **Dark/Light Mode:** Toggle between themes with a single click.
* 💾 **Session Persistence:** Keeps chat history per session using `localStorage`.
* 🧭 **Sidebar Navigation:** Displays clickable links to all previous sessions (like ChatGPT).
* ⌛ **Typing Indicator:** Shows animated dots when the assistant is thinking.
* 📄 **Markdown Support:** Automatically formats LLM responses including code blocks.

---

## 🖼️ Preview

![Screenshot](preview.png) <!-- optional if you have one -->

---

## 🛠️ Technologies

* React
* Tailwind CSS
* Heroicons
* Framer Motion (for animations)
* Axios
* React Markdown

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/web-llm-assistant-frontend.git
cd web-llm-assistant-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

---

## 🔌 Backend Integration

Ensure your **backend** (Flask server) is running on `http://localhost:5000`.

> The frontend uses Axios to make requests to `/ask` and `/memory/:sessionId`.

---

## 🧠 How It Works

1. When a user sends a message, the query is posted to the backend (`/ask`).
2. The backend:

   * Performs a web search.
   * Scrapes web pages.
   * Feeds results into an LLM via OpenRouter.
3. The response is returned, stored, and rendered as **Markdown** with proper formatting.
4. The sidebar links all previous conversations by `sessionId`.

---

## 📂 Folder Structure

```
frontend/
├── src/
    ├── App.jsx           # Main app logic
    ├── components/       # (Optional) break out reusable components
    ├── styles/           # Tailwind or global styles
```

---

## 🔒 Environment Notes

* Ensure CORS is enabled in the backend (`flask_cors.CORS(app)`).
* The session ID is stored in `localStorage` and used to retrieve chat history.

---

## 🚧 Future Improvements

* Persistent memory with a database
* User authentication
* Prompt editing and message deletion
* File upload support