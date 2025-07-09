import React from 'react';

export default function ChatInput({ handleSubmit, query, setQuery, isLoading, colors, visualizationMode, setVisualizationMode }) {
  return (
    <form onSubmit={handleSubmit} className="p-4 border-t" style={{ backgroundColor: colors.surface }}>
      <div className="flex items-center space-x-4">
        <select
          value={visualizationMode}
          onChange={(e) => setVisualizationMode(e.target.value)}
          className="p-2 border rounded-lg shadow-sm"
          style={{
            backgroundColor: colors.input,
            color: colors.text,
            borderColor: colors.input, // Use input color for border in dark mode
          }}
        >
          <option value="chat">Chat</option>
          <option value="mindmap">Mind Map</option>
          <option value="roadmap">Road Map</option>
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isLoading ? "Generating..." : "Type your message or query..."}
          className="flex-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            backgroundColor: colors.input,
            color: colors.text,
            borderColor: colors.input, // Use input color for border in dark mode
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading}
        >
          Send
        </button>
      </div>
    </form>
  );
}
