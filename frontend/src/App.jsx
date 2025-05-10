import { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import {
  PaperAirplaneIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("chat_sessions") || "[]");
    setSessions(stored);

    let sid = localStorage.getItem("current_session");
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem("current_session", sid);
      const newSess = { id: sid, title: "New Chat" };
      const updated = [newSess, ...stored];
      setSessions(updated);
      localStorage.setItem("chat_sessions", JSON.stringify(updated));
    }
    setSessionId(sid);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem("current_session", sessionId);
    axios
      .get(`http://localhost:5000/memory/${sessionId}`)
      .then((res) => {
        setMessages(
          res.data.map((m, i) => ({
            id: i,
            text: m.content,
            isUser: m.role === "user",
          }))
        );
      })
      .catch(console.error);
  }, [sessionId]);

  useEffect(() => {
    if (!messages.length) return;
    const firstUser = messages.find((m) => m.isUser);
    if (!firstUser) return;
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? { ...s, title: firstUser.text.slice(0, 20) + "…" }
          : s
      );
      localStorage.setItem("chat_sessions", JSON.stringify(updated));
      return updated;
    });
  }, [messages, sessionId]);

  const colors = darkMode
    ? {
        background: "#1e1e1e",
        surface: "#25263a",
        text: "#ffffff",
        input: "#2d2f45",
        userBubble: "#3b82f6",
        botBubble: "#3b3e5a",
        spinner: "#3b82f6",
      }
    : {
        background: "#f9fafb",
        surface: "#ffffff",
        text: "#111827",
        input: "#f3f4f6",
        userBubble: "#3b82f6",
        botBubble: "#e5e7eb",
        spinner: "#3b82f6",
      };

  const handleNewChat = () => {
    const id = uuidv4();
    const newSess = { id, title: "New Chat" };
    const updated = [newSess, ...sessions];
    setSessions(updated);
    localStorage.setItem("chat_sessions", JSON.stringify(updated));
    setSessionId(id);
    setMessages([]);
  };

  const handleSessionClick = (id) => {
    setSessionId(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    const userMsg = { id: Date.now(), text: query, isUser: true };
    setMessages((m) => [...m, userMsg]);

    try {
      const { data } = await axios.post("http://localhost:5000/ask", {
        session_id: sessionId,
        query,
      });
      const botMsg = { id: Date.now() + 1, text: data.response, isUser: false };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, text: "Error fetching response.", isUser: false },
      ]);
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  useEffect(() => {
    const c = document.getElementById("chat-container");
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: colors.background, color: colors.text }}>
      <aside className="w-64 p-4 overflow-y-auto" style={{ backgroundColor: colors.surface, color: colors.text }}>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded hover:opacity-80"
          style={{ backgroundColor: colors.input, color: colors.text }}
        >
          <PlusIcon className="h-5 w-5" /> New chat
        </button>

        <nav className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSessionClick(s.id)}
              className={`cursor-pointer px-3 py-2 rounded ${s.id === sessionId ? "font-semibold" : "opacity-80"} hover:opacity-100`}
              style={{
                backgroundColor: s.id === sessionId ? colors.input : "transparent",
                color: colors.text,
              }}
            >
              {s.title}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="p-4 shadow flex justify-between items-center" style={{ backgroundColor: colors.surface, color: colors.text }}>
          <h1 className="text-xl font-bold">chat.ai</h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full">
            {darkMode ? (
              <SunIcon className="h-6 w-6 text-yellow-400" />
            ) : (
              <MoonIcon className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </header>

        <div id="chat-container" className="flex-1 overflow-y-auto px-4 py-6" style={{ backgroundColor: colors.background, color: colors.text }}>
          {messages.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-20 opacity-70">
              <p style={{ color: colors.text }}>Welcome! Start by typing a message.</p>
            </motion.div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              <AnimatePresence>
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div
                      className={`p-3 rounded-2xl max-w-[75%] ${m.isUser ? "ml-auto" : ""}`}
                      style={{
                        backgroundColor: m.isUser ? colors.userBubble : colors.botBubble,
                        color: m.isUser ? "#fff" : colors.text,
                      }}
                    >
                      {m.isUser ? (
                        <p style={{ margin: 0 }}>{m.text}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              code({ node, inline, className, children, ...props }) {
                                return inline ? (
                                  <code
                                    style={{
                                      backgroundColor: "#eee",
                                      padding: "0.2em 0.4em",
                                      borderRadius: "4px",
                                    }}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                ) : (
                                  <pre className={className} style={{ overflowX: "auto", padding: "0.5rem", margin: 0 }}>
                                    <code {...props}>{children}</code>
                                  </pre>
                                );
                              },
                            }}
                          >
                            {m.text}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <div className="flex">
                  <div className="space-x-1 flex">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.spinner }} />
                    <div className="w-2 h-2 rounded-full animate-bounce delay-100" style={{ backgroundColor: colors.spinner }} />
                    <div className="w-2 h-2 rounded-full animate-bounce delay-200" style={{ backgroundColor: colors.spinner }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 shadow-inner" style={{ backgroundColor: colors.surface, color: colors.text }}>
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              className="flex-1 p-3 rounded-lg outline-none"
              style={{ backgroundColor: colors.input, color: colors.text }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="p-3 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: !query.trim() || isLoading ? "#9ca3af" : colors.userBubble,
                color: "#fff",
              }}
            >
              {isLoading ? "…" : <PaperAirplaneIcon className="h-5 w-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
