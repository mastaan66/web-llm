import React from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

export default function ChatInput({ handleSubmit, query, setQuery, isLoading, colors }) {
  return (
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
  );
}
