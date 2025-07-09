import React from "react";
import { PlusIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";

export default function Sidebar({
  sessions,
  sessionId,
  handleNewChat,
  handleSessionClick,
  handleDeleteSession,
  menuOpen,
  setMenuOpen,
  showSidebar,
  setShowSidebar,
  colors
}) {
  return showSidebar ? (
    <aside className="w-64 p-4 overflow-y-auto" style={{ backgroundColor: colors.surface }}>
      <button
        onClick={handleNewChat}
        className="flex items-center gap-2 mb-4 px-3 py-2 rounded hover:opacity-80"
        style={{ backgroundColor: colors.input, color: colors.text }}
      >
        <PlusIcon className="h-5 w-5" /> New chat
      </button>
      <nav className="space-y-2">
        {sessions.map(session => (
          <div
            key={session.id}
            className="flex items-center justify-between px-3 py-2 rounded cursor-pointer"
            style={{
              backgroundColor: session.id === sessionId ? colors.input : "transparent",
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
  ) : (
    <button
      onClick={() => setShowSidebar(true)}
      className="absolute left-0 top-1/2 z-10 p-2 rounded-r-full shadow"
      style={{ backgroundColor: colors.surface }}
    >
      <EllipsisVerticalIcon className="h-5 w-5" />
    </button>
  );
}
