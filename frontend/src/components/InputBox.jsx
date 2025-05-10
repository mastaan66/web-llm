import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

export default function InputBox({ query, setQuery, onSubmit, isLoading }) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex gap-2 p-4 bg-white border-t border-gray-200"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask me anything..."
        className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="p-3 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center">
            <LoadingSpinner /> Processing...
          </span>
        ) : (
          <PaperAirplaneIcon className="h-5 w-5" />
        )}
      </button>
    </form>
  );
}