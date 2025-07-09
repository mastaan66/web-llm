import { useState, useEffect } from "react";
import axios from "axios";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import {
  PaperAirplaneIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";


// Configure marked to support syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    const validLang = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language: validLang }).value;
  },
  gfm: true,
  breaks: true,
});

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const storedSessions = JSON.parse(localStorage.getItem("chat_sessions") || "[]");
    let currentSessionId = localStorage.getItem("current_session");

    const sessionExists = storedSessions.some(s => s.id === currentSessionId);
    let updatedSessions = [...storedSessions];

    if (!currentSessionId || !sessionExists) {
      currentSessionId = uuidv4();
      const newSession = { id: currentSessionId, title: "New Chat" };
      updatedSessions = [newSession, ...storedSessions];
      localStorage.setItem("chat_sessions", JSON.stringify(updatedSessions));
      localStorage.setItem("current_session", currentSessionId);
    }

    setSessions(updatedSessions);
    setSessionId(currentSessionId);
    setShowSidebar(updatedSessions.length > 0);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const loadMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/memory/${sessionId}`);
        setMessages(
          response.data.map((m, i) => ({
            id: i,
            text: m.content,
            isUser: m.role === "user",
          }))
        );
      } catch (error) {
        console.error("Error loading messages:", error);
        if (error.response?.status === 404) {
          setMessages([]);
        }
      }
    };

    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    if (!messages.length || !sessionId) return;

    const firstUserMessage = messages.find(m => m.isUser);
    if (!firstUserMessage) return;

    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === sessionId
          ? { ...s, title: firstUserMessage.text.slice(0, 20) + "…" }
          : s
      );
      localStorage.setItem("chat_sessions", JSON.stringify(updated));
      return updated;
    });
  }, [messages, sessionId]);

  const colors = darkMode
    ? {
        background: "#000000",
        surface: "#090a0b",
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
    const newSessionId = uuidv4();
    const newSession = { id: newSessionId, title: "New Chat" };
    const updatedSessions = [newSession, ...sessions];

    setSessions(updatedSessions);
    setSessionId(newSessionId);
    setMessages([]);
    setShowSidebar(true);
    localStorage.setItem("chat_sessions", JSON.stringify(updatedSessions));
    localStorage.setItem("current_session", newSessionId);
  };

  const handleSessionClick = (id) => {
    setMenuOpen(null);
    setSessionId(id);
    localStorage.setItem("current_session", id);
  };

  const handleDeleteSession = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/sessions/${id}`);

      const updatedSessions = sessions.filter(s => s.id !== id);
      setSessions(updatedSessions);
      localStorage.setItem("chat_sessions", JSON.stringify(updatedSessions));

      if (id === sessionId) {
        if (updatedSessions.length > 0) {
          setSessionId(updatedSessions[0].id);
          localStorage.setItem("current_session", updatedSessions[0].id);
        } else {
          handleNewChat();
        }
      }

      setShowSidebar(updatedSessions.length > 0);
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    const userMsg = { id: Date.now(), text: query, isUser: true };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data } = await axios.post("http://localhost:5000/ask", {
        session_id: sessionId,
        query,
      });

      if (data.sources?.length) {
        const sourcesMsg = {
          id: Date.now() + 1,
          text: JSON.stringify(data.sources),
          isUser: false,
          isSource: true,
        };
        setMessages(prev => [...prev, sourcesMsg]);
      }

      const botMsg = { id: Date.now() + 2, text: data.response, isUser: false };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Error submitting query:", error);
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, text: "Error fetching response.", isUser: false },
      ]);
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  useEffect(() => {
    const container = document.getElementById("chat-container");
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {showSidebar && (
        <aside
          className="w-64 p-4 overflow-y-auto"
          style={{ backgroundColor: colors.surface }}
        >
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded hover:opacity-80"
            style={{ backgroundColor: colors.input, color: colors.text }}
          >
            <PlusIcon className="h-5 w-5" /> New chat
          </button>
          <nav className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between px-3 py-2 rounded cursor-pointer"
                style={{
                  backgroundColor:
                    session.id === sessionId ? colors.input : "transparent",
                }}
              >
                <div
                  onClick={() => handleSessionClick(session.id)}
                  className={session.id === sessionId ? "font-semibold" : ""}
                >
                  {session.title}
                </div>
                <div className="relative">
                  <EllipsisVerticalIcon
                    className="h-5 w-5 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === session.id ? null : session.id);
                    }}
                  />
                  {menuOpen === session.id && (
                    <div
                      className="absolute right-0 mt-1 w-24 border rounded shadow-lg z-10 dark:hover:bg-gray-700 hover:bg-gray-300 bg-white text-black dark:text-white dark:bg-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="px-2 py-1 text-sm cursor-pointer"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        Delete
                      </div>
                    </div>
                  )}
                </div>  
              </div>
            ))}
          </nav>
        </aside>
      )}

      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute left-0 top-1/2 z-10 p-2 rounded-r-full shadow"
          style={{ backgroundColor: colors.surface }}
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
      )}

      <div className="flex-1 flex flex-col">
        <header
          className="p-4 shadow flex justify-between items-center"
          style={{ backgroundColor: colors.surface }}
        >
          <h1 className="text-xl font-bold">chat.ai</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full"
          >
            {darkMode ? (
              <SunIcon className="h-6 w-6 text-yellow-400" />
            ) : (
              <MoonIcon className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </header>

        <div
          id="chat-container"
          className="flex-1 overflow-y-auto px-4 py-6"
          style={{ backgroundColor: colors.background }}
        >
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-20 opacity-70"
            >
              <p>Welcome! Start by typing a message.</p>
            </motion.div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-full flex">
                      <div
                        className="p-3 rounded-2xl break-words whitespace-pre-wrap overflow-x-auto max-w-[75%]"
                        style={{
                          marginLeft: message.isUser ? "auto" : undefined,
                          marginRight: message.isUser ? undefined : "auto",
                          backgroundColor: message.isUser
                            ? colors.userBubble
                            : message.isSource
                            ? "transparent"
                            : colors.botBubble,
                          color: message.isUser ? "#fff" : colors.text,
                        }}
                      >
                        {message.isSource ? (
                          JSON.parse(message.text).map((source, idx) => (
                            <div key={idx} className="mb-4">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {source.url}
                              </a>
                              <p className="mt-1 text-sm">
                                {source.content.slice(0, 200)}...
                              </p>
                            </div>
                          ))
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: message.isUser
                                ? marked.parseInline(message.text)
                                : marked(message.text),
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <div className="flex justify-center">
                  <div className="space-x-1 flex">
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: colors.spinner }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce delay-100"
                      style={{ backgroundColor: colors.spinner }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce delay-200"
                      style={{ backgroundColor: colors.spinner }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 shadow-inner"
          style={{ backgroundColor: colors.surface }}
        >
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
              className="p-3 rounded-lg flex items-center justify-center text-white"
              style={{
                backgroundColor:
                  !query.trim() || isLoading ? "#9ca3af" : colors.userBubble,
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
