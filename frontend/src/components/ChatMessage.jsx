export default function ChatMessage({ text, isUser }) {
    return (
      <div
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg p-4 ${
            isUser
              ? "bg-primary text-white rounded-br-none"
              : "bg-gray-100 text-dark rounded-bl-none"
          }`}
        >
          <p>{text}</p>
        </div>
      </div>
    );
  }