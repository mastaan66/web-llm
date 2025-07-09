**React Chatbot Frontend**

This React application provides a dynamic, Markdown-powered chat interface to interact with a Flask-based LLM backend. It supports multi-session management, dark/light themes, syntax-highlighted code rendering, and animated UX enhancements using Framer Motion.

---

## Table of Contents

1. [Features](#features)
2. [Architecture & Components](#architecture--components)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Application Flow](#application-flow)
6. [Component Breakdown](#component-breakdown)
7. [Styling & Themes](#styling--themes)
8. [Utilities & Libraries](#utilities--libraries)
9. [Extending & Customization](#extending--customization)
10. [License](#license)

  
---

## Features

* **Multi-Session Chat**: Create, switch, and delete chat sessions, each with its own history and title saved in `localStorage`.
* **Markdown Rendering**: User and bot messages support full GitHub-flavored Markdown, including code blocks.
* **Syntax Highlighting**: Uses `highlight.js` with the GitHub theme to style code snippets.
* **Dark/Light Mode**: Toggle between themes; colors stored in React state and applied inline.
* **Animated UI**: Smooth entry/exit animations for messages and components via `framer-motion`.
* **Responsive Sidebar**: Collapsible sessions sidebar with a plus button to start new chats.
* **Source Preview**: Displays scraped sources as clickable links and previews from the backend.
* **Auto-Scroll**: Chat container scrolls to bottom on new messages.

---

## Architecture & Components

* **App Component** (`App.js`): Single-root component handling state, effects, and rendering all UI elements.
* **State Management**:

  * `sessions`: Array of session objects `{ id, title }`.
  * `sessionId`: Currently active session's UUID.
  * `messages`: Array of message objects `{ id, text, isUser, isSource }`.
  * `query`: Input field state.
  * `isLoading`: Spinner state while awaiting backend response.
  * `darkMode`: Theme toggle.
  * `menuOpen`: Tracks which session menu is open for deletion.
  * `showSidebar`: Controls sidebar visibility.
* **Effects**:

  1. **Initialize Sessions**: On mount, load or create a session and persist to `localStorage`.
  2. **Load Messages**: Fetch session memory from `GET /memory/:sessionId` on session change.
  3. **Sync Title**: Update session title in `localStorage` when first user message appears.
  4. **Auto-Scroll**: Scroll chat container to bottom on `messages` update.

---

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure API Base URL**:

   * Update the Axios calls in `handleSubmit` and message loading to match your backend host (`http://localhost:5000`).

3. **Run locally**:

   ```bash
   npm start
   ```

4. **Build for production**:

   ```bash
   npm run build
   ```

---

## Configuration

* **Backend Endpoints**:

  * `GET /memory/:sessionId` — Retrieve past messages for the session.
  * `POST /ask` — Send user query and receive bot response and sources.
  * `DELETE /sessions/:id` — Delete a session memory on backend.

* **LocalStorage Keys**:

  * `chat_sessions`: Stores array of session objects.
  * `current_session`: Stores active session ID.

---

## Application Flow

1. On load, the app reads `localStorage` for existing sessions; if none, creates one.
2. When a session is selected, it fetches its message history.
3. User types a query; on submit, message is appended locally and sent via POST `/ask`.
4. While waiting, shows a three-dot loading spinner.
5. Upon response, any scraped sources are rendered (links + text preview), followed by the bot’s Markdown-formatted reply.
6. New messages trigger auto-scroll.

---

## Component Breakdown

### Sidebar

* **New Chat Button** (`PlusIcon`) creates a new session with a generated UUID.
* **Session List** displays session titles; clicking loads that session.
* **Ellipsis Menu** (`EllipsisVerticalIcon`) per session for deletion.

### Header

* Application title.
* **Theme Toggle** (`SunIcon` / `MoonIcon`) switches `darkMode` state.

### Chat Container

* Renders messages in order using `AnimatePresence` for smooth animations.
* Differentiates between user bubbles (`isUser`), bot bubbles, and source previews (`isSource`).
* Renders message content with `marked` to convert Markdown to HTML; uses `dangerouslySetInnerHTML`.

### Input Form

* Text input bound to `query` state.
* Submit button disabled when empty or loading; icon changes to spinner.

---

## Styling & Themes

* Uses inline styles derived from the `colors` mapping for background, surface, text, input fields, and message bubbles.
* Tailwind classes handle layout, spacing, and base typography.
* Dark and light palettes defined in code; can be extended to CSS variables or context.

---

## Utilities & Libraries

* **React Hooks**: `useState`, `useEffect` for state & lifecycle.
* **axios**: HTTP client for RESTful calls.
* **marked**: Markdown parser with GFM and line-break support.
* **highlight.js**: Syntax highlighting for fenced code blocks.
* **framer-motion**: Animations for mounting/unmounting messages and components.
* **uuid**: Generates unique session identifiers.

---

## Extending & Customization

* **Persistent Storage**: Swap `localStorage` for IndexedDB or a backend store.
* **Context API**: Move theme and session state into React Context for cleaner code.
* **Component Extraction**: Split Sidebar, Header, ChatList, and InputForm into separate files for maintainability.
* **Theming**: Integrate CSS-in-JS or CSS Modules for scalable styles.
* **Accessibility**: Add proper ARIA roles and focus management.

---

## License

This project is licensed under the MIT License.
