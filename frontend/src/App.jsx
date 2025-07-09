import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Sidebar from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";
import ChatContainer from "./components/ChatContainer";
import ChatInput from "./components/ChatInput";
import MindMapVisualizer from "./components/MindMapVisualizer"; // Import the new component
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

// Configure marked
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
  const [isLoading, setIsLoading] = useState(false); // For chat loading
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // New states for visualization mode and mind map data
  const [visualizationMode, setVisualizationMode] = useState('chat'); // 'chat', 'mindmap', 'roadmap'
  const [mindMapData, setMindMapData] = useState(null);
  const [mindMapLoading, setMindMapLoading] = useState(false);
  const [mindMapError, setMindMapError] = useState(null);

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

  // --- Load sessions on mount
  useEffect(() => {
    axios.get("http://localhost:5000/sessions").then(res => {
      const sessions = res.data;
      let currentSessionId = localStorage.getItem("current_session");

      if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
        if (sessions.length > 0) {
          currentSessionId = sessions[0].id;
        } else {
          currentSessionId = uuidv4();
          axios.post("http://localhost:5000/sessions", { id: currentSessionId });
        }
        localStorage.setItem("current_session", currentSessionId);
      }

      setSessions(sessions);
      setSessionId(currentSessionId);
      setShowSidebar(sessions.length > 0);
    });
  }, []);

  // --- Load messages for session
  useEffect(() => {
    if (!sessionId) return;
    axios.get(`http://localhost:5000/memory/${sessionId}`)
      .then(res => {
        setMessages(res.data.map((m, i) => ({
          id: i,
          text: m.content,
          isUser: m.role === "user",
        })));
      })
      .catch(err => {
        if (err.response?.status === 404) setMessages([]);
      });
  }, [sessionId]);

  // --- update session title on first user message
  useEffect(() => {
    if (!messages.length || !sessionId) return;
    const firstUser = messages.find(m => m.isUser);
    if (!firstUser) return;
    const updated = sessions.map(s =>
      s.id === sessionId ? { ...s, title: firstUser.text.slice(0, 20) + "…" } : s
    );
    setSessions(updated);
  }, [messages, sessionId]);

  // Function to fetch the mind map data from the LLM via your backend
  const fetchMindMap = useCallback(async (currentQuery) => {
    setMindMapLoading(true);
    setMindMapError(null);
    setMindMapData(null); // Clear previous data
    
    try {
      // Make a POST request to your backend endpoint for mind map generation
      const response = await axios.post("http://localhost:5000/generate_mindmap", {
        prompt: currentQuery // Send the structured prompt to your backend
      });

      if (response.data) {
        // Axios automatically parses JSON responses if the Content-Type header is application/json.
        // So, response.data should already be a JavaScript object.
        setMindMapData(response.data);
      } else {
        setMindMapError("No valid response from backend for mind map generation.");
      }
    } catch (err) {
      console.error("Error fetching mind map from backend:", err);
      // The error object from axios will contain response.status if it's an HTTP error
      const errorMessage = err.response && err.response.data && err.response.data.error
                           ? err.response.data.error
                           : `Failed to fetch mind map from backend: ${err.message}. Please ensure your backend is running and the /generate_mindmap endpoint is correctly implemented.`;
      setMindMapError(errorMessage);
    } finally {
      setMindMapLoading(false);
    }
  }, []);

  // --- Session handlers
  const handleNewChat = async () => {
    const newSession = await axios.post("http://localhost:5000/sessions");
    const newSessions = [newSession.data, ...sessions];
    setSessions(newSessions);
    setSessionId(newSession.data.id);
    setMessages([]);
    localStorage.setItem("current_session", newSession.data.id);
    setShowSidebar(true);
    setVisualizationMode('chat'); // Reset to chat mode on new chat
    setMindMapData(null); // Clear mind map data
    setMindMapError(null);
  };

  const handleSessionClick = (id) => {
    setSessionId(id);
    localStorage.setItem("current_session", id);
    setMenuOpen(null);
    setVisualizationMode('chat'); // Reset to chat mode when changing sessions
    setMindMapData(null); // Clear mind map data
    setMindMapError(null);
  };

  const handleDeleteSession = (id) => {
    axios.delete(`http://localhost:5000/sessions/${id}`).then(() => {
      const filtered = sessions.filter(s => s.id !== id);
      setSessions(filtered);
      if (id === sessionId) {
        if (filtered.length) {
          setSessionId(filtered[0].id);
          localStorage.setItem("current_session", filtered[0].id);
        } else {
          handleNewChat();
        }
      }
      setShowSidebar(filtered.length > 0);
    });
  };

  // --- Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading || mindMapLoading) return;

    if (visualizationMode === 'chat') {
      // Existing chat logic
      setIsLoading(true);
      const userMsg = { id: Date.now(), text: query, isUser: true };
      setMessages(prev => [...prev, userMsg]);

      try {
        const { data } = await axios.post("http://localhost:5000/ask", {
          session_id: sessionId,
          query
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
      } catch (err) {
        setMessages(prev => [
          ...prev,
          { id: Date.now() + 1, text: "Error fetching response.", isUser: false }
        ]);
      } finally {
        setIsLoading(false);
        setQuery("");
      }
    } else if (visualizationMode === 'mindmap' || visualizationMode === 'roadmap') {
      // Mind map/Roadmap logic
      fetchMindMap(query); // Call the fetchMindMap function
      setQuery(""); // Clear query after submission
    }
  };

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      <Sidebar
        sessions={sessions}
        sessionId={sessionId}
        handleNewChat={handleNewChat}
        handleSessionClick={handleSessionClick}
        handleDeleteSession={handleDeleteSession}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        colors={colors}
      />
      <div className="flex-1 flex flex-col">
        <header className="p-4 shadow flex justify-between items-center" style={{ backgroundColor: colors.surface }}>
          <h1 className="text-xl font-bold">chat.ai</h1>
          <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </header>

        {visualizationMode === 'chat' ? (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            marked={marked}
            colors={colors}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <MindMapVisualizer
              mindMapData={mindMapData}
              loading={mindMapLoading}
              error={mindMapError}
              colors={colors}
            />
          </div>
        )}

        <ChatInput
          handleSubmit={handleSubmit}
          query={query}
          setQuery={setQuery}
          isLoading={visualizationMode === 'chat' ? isLoading : mindMapLoading} // Use appropriate loading state
          colors={colors}
          visualizationMode={visualizationMode}
          setVisualizationMode={setVisualizationMode}
        />
      </div>
    </div>
  );
}
