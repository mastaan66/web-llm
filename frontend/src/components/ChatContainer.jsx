import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatContainer({ messages, isLoading, marked, colors }) {
  useEffect(() => {
    const container = document.getElementById("chat-container");
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
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
  );
}