# Word Agent - Shared State Tutorial

Learn how to build a simple AI agent with **shared state** between a Python backend and a React frontend.

## What You'll Learn

- How to create an LLM agent with Google ADK
- How to define tools that read and write state
- How to create tools that DON'T use state (standalone utilities)
- How state synchronizes automatically between backend and frontend
- How CopilotKit connects to your agent

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Understanding Shared State](#3-understanding-shared-state)
4. [Backend Deep Dive](#4-backend-deep-dive)
5. [Frontend Deep Dive](#5-frontend-deep-dive)
6. [Running the Project](#6-running-the-project)
7. [How It All Connects](#7-how-it-all-connects)
8. [Google ADK and AG-UI Protocol](#8-google-adk-and-ag-ui-protocol-how-they-connect)

---

## 1. Overview

This project demonstrates shared state with a creative poet agent:

- **Save a word** → Stored in shared state
- **Ask for a poem** → Agent creates a poem using your saved word
- **Reverse a word** → Standalone tool that doesn't use state
- **UI updates in real-time** when state changes

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                     (Next.js + React)                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │   useCoAgent({ name: "WordAgent" })                      │   │
│  │   Returns: { state: { word: "moon" } }                   │   │
│  │                                                          │   │
│  │   ┌──────────────────┐                                   │   │
│  │   │  State Display   │     CopilotSidebar               │   │
│  │   │                  │     (chat interface)              │   │
│  │   │  Saved word:     │                                   │   │
│  │   │  "moon"          │                                   │   │
│  │   └──────────────────┘                                   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                    POST /api/copilotkit                         │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                   (FastAPI + Google ADK)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LlmAgent (Gemini 2.0 Flash)                            │   │
│  │                                                          │   │
│  │  STATE: { "word": "moon" }                              │   │
│  │                                                          │   │
│  │  TOOLS:                                                  │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │   │
│  │  │ save_word() │ │ get_word()  │ │ reverse_word()   │   │   │
│  │  │             │ │             │ │                  │   │   │
│  │  │ WRITES to   │ │ READS from  │ │ NO STATE         │   │   │
│  │  │ state       │ │ state       │ │ (standalone)     │   │   │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

```
adk-agui-tutorial-simple-state/
│
├── backend/
│   ├── agent.py              # Agent with 3 tools (2 use state, 1 doesn't)
│   ├── main.py               # FastAPI server
│   ├── pyproject.toml        # Python dependencies
│   ├── .env.example          # Environment variables template
│   └── .env                  # Your API keys (create from .env.example)
│
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx          # Main UI with useCoAgent hook
│   │   ├── layout.tsx        # CopilotKit provider
│   │   ├── globals.css       # Styles
│   │   └── api/copilotkit/
│   │       └── route.ts      # API bridge to backend
│   ├── package.json
│   └── ...config files
│
└── README.md
```

---

## 3. Understanding Shared State

### What is Shared State?

Shared state is data that both the backend (your AI agent) and frontend (your UI) can access and modify. When one side changes the state, the other side sees the change automatically.

### Tools and State

Not all tools need to use state. In this project:

| Tool | Uses State? | Purpose |
|------|-------------|---------|
| `save_word` | Yes (writes) | Save a word to memory |
| `get_word` | Yes (reads) | Retrieve the saved word |
| `reverse_word` | No | Reverse any word (standalone) |

### The State Flow

```
1. User: "Save the word moon"
                    │
                    ▼
2. Agent calls save_word("moon")
                    │
                    ▼
3. tool_context.state["word"] = "moon"
                    │
                    ▼
4. AG-UI Protocol detects state change
                    │
                    ▼
5. STATE_SNAPSHOT event sent to frontend
                    │
                    ▼
6. useCoAgent receives new state
                    │
                    ▼
7. UI shows: "Saved word: moon"
```

---

## 4. Backend Deep Dive

### File: `agent.py`

#### State Initialization Callback

```python
def on_before_agent(callback_context):
    """
    Runs BEFORE every message is processed.
    Initialize state with default values.
    """
    if "word" not in callback_context.state:
        callback_context.state["word"] = ""
    return None
```

#### Tool That WRITES to State

```python
def save_word(word: str, tool_context) -> dict:
    """Save a word to state."""
    tool_context.state["word"] = word  # Writes to state
    return {"status": "success", "message": f"Word '{word}' saved."}
```

#### Tool That READS from State

```python
def get_word(tool_context) -> dict:
    """Get the saved word from state."""
    word = tool_context.state.get("word", "")  # Reads from state
    if word:
        return {"status": "success", "word": word}
    return {"status": "empty", "message": "No word saved yet."}
```

#### Tool That Does NOT Use State

```python
def reverse_word(word: str) -> dict:
    """
    Reverse a word. This tool does NOT use state.
    Notice: no tool_context parameter!
    """
    reversed_word = word[::-1]
    return {"original": word, "reversed": reversed_word}
```

**Key Point:** If a tool doesn't need state, don't include `tool_context` in the parameters. ADK only injects it when you declare it.

#### Understanding `tool_context`

`tool_context` is a special object that Google ADK **automatically injects** into your tool functions when you declare it as a parameter.

**How it works:**

```
User: "Save the word moon"
            │
            ▼
┌───────────────────────────────────┐
│  LLM decides to call save_word()  │
└───────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────┐
│  ADK intercepts the call:         │
│                                   │
│  1. Sees "tool_context" parameter │
│  2. Creates ToolContext with:     │
│     - current session state       │
│     - available actions           │
│  3. Injects it into the function  │
└───────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────┐
│  Your function executes:          │
│  tool_context.state["word"] = ... │
└───────────────────────────────────┘
```

**Available capabilities:**

```python
def my_tool(tool_context) -> dict:
    # 1. Session state (read/write)
    tool_context.state["key"] = "value"
    value = tool_context.state.get("key")

    # 2. Search agent memory
    results = tool_context.search_memory("query")

    # 3. Save/load artifacts
    tool_context.save_artifact("name", data)
    artifact = tool_context.load_artifact("name")

    return {}
```

**Simple rule:**

| Need state? | Use `tool_context`? |
|-------------|---------------------|
| Yes (read/write) | Declare it as parameter |
| No (pure function) | Don't declare it |

**Official documentation:** [Context - Google ADK](https://google.github.io/adk-docs/context/) | [Custom Tools](https://google.github.io/adk-docs/tools-custom/)

#### Agent Instructions

```python
AGENT_INSTRUCTION = """You are a creative poet assistant.

TOOLS:
1. save_word - Save a word to memory
2. get_word - Get the saved word (ONLY use for poems)
3. reverse_word - Reverse any word (standalone, independent)

CRITICAL RULES:
- ONLY call get_word when user asks for a POEM
- NEVER call get_word when user asks to reverse a word
- reverse_word works independently

WHEN TO USE EACH TOOL:
- "save word X" → save_word only
- "reverse word X" → reverse_word only
- "write poem" → get_word first, then use that word to write the poem
"""
```

### File: `main.py`

```python
from dotenv import load_dotenv
load_dotenv()  # Load GOOGLE_API_KEY

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ag_ui_adk import add_adk_fastapi_endpoint
from agent import adk_agent

app = FastAPI(title="Word Agent API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount agent endpoint
add_adk_fastapi_endpoint(app, adk_agent)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 5. Frontend Deep Dive

### File: `layout.tsx`

```tsx
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit
          runtimeUrl="/api/copilotkit"
          agent="WordAgent"  // Must match backend!
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
```

### File: `page.tsx`

```tsx
"use client";

import { useCoAgent } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

type WordState = {
  word: string;
};

export default function Home() {
  // Hook that syncs state with backend
  const { state } = useCoAgent<WordState>({
    name: "WordAgent",
    initialState: { word: "" },
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1>Word Agent</h1>

        {/* State display - updates automatically! */}
        <div>
          <p>Saved word: {state.word || "(none)"}</p>
        </div>
      </div>

      {/* Chat sidebar */}
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: "Word Agent",
          initial: "Hi! Save a word and I'll write poems with it!",
        }}
      />
    </div>
  );
}
```

### File: `api/copilotkit/route.ts`

```typescript
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";

const runtime = new CopilotRuntime({
  agents: {
    WordAgent: new HttpAgent({
      url: "http://localhost:8000/",
    }),
  },
});

const serviceAdapter = new ExperimentalEmptyAdapter();

export const POST = async (req: Request) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

---

## 6. Running the Project

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Google AI API key

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key (you'll need it in Step 2)

### Step 2: Setup Backend

You can use either **uv** (recommended) or **traditional venv**:

#### Option A: Using uv (Recommended)

[uv](https://docs.astral.sh/uv/) is a fast Python package manager.

```bash
# Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Navigate to backend folder
cd backend

# Create .env file from example
cp .env.example .env
# Edit .env and add your API key

# Install dependencies and run
uv sync
uv run python main.py
```

#### Option B: Using traditional venv

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -e .

# Create .env file from example
cp .env.example .env
# Edit .env and add your API key

# Run the server
python main.py
```

#### Verify Backend is Running

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Step 3: Setup Frontend

Open a **new terminal** (keep backend running):

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

#### Verify Frontend is Running

You should see:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
```

### Step 4: Test It!

1. Open your browser at **http://localhost:3000**
2. The chat sidebar should open automatically
3. Try these commands:

#### Save a word (uses state)
```
You: "Save the word moon"
Agent: Saves "moon" to state
UI: Shows "Saved word: moon"
```

#### Ask for a poem (reads from state)
```
You: "Write me a haiku"
Agent: Calls get_word() → gets "moon" → writes poem using that word
Response: A haiku about the moon
```

#### Other poem requests
```
"Write me a sonnet"
"Create a short poem"
"Make a limerick about my word"
```

#### Reverse a word (NO state - standalone tool)
```
You: "Reverse the word hello"
Agent: Calls reverse_word("hello") directly
Response: "olleh"
```

#### Check your saved word
```
You: "What's my word?"
Agent: Calls get_word() → returns "moon"
```

#### Quick Reference

| Command | Tool Used | Uses State? |
|---------|-----------|-------------|
| "Save the word X" | `save_word` | Yes (writes) |
| "Write me a poem" | `get_word` | Yes (reads) |
| "What's my word?" | `get_word` | Yes (reads) |
| "Reverse the word X" | `reverse_word` | No |

### Project URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |

### Stopping the Servers

- **Frontend**: Press `Ctrl+C` in the frontend terminal
- **Backend**: Press `Ctrl+C` in the backend terminal

### Troubleshooting

#### "GOOGLE_API_KEY not found"
Make sure `.env` file exists in the `backend/` folder:
```bash
cat backend/.env
# Should show: GOOGLE_API_KEY=your_key_here
```

#### "Module not found" errors
Reinstall dependencies:
```bash
# With uv:
uv sync --reinstall

# With venv:
pip install -e . --force-reinstall
```

#### Port already in use
Kill the process using the port:
```bash
# Find process on port 8000 (backend)
lsof -i :8000
kill -9 <PID>

# Find process on port 3000 (frontend)
lsof -i :3000
kill -9 <PID>
```

---

## 7. How It All Connects

### The Name Must Match Everywhere

```
Backend:   LlmAgent(name="WordAgent")
                        │
Frontend:  <CopilotKit agent="WordAgent">
                              │
Frontend:  useCoAgent({ name: "WordAgent" })
                              │
Frontend:  agents: { WordAgent: new HttpAgent(...) }
```

### State vs No-State Tools

```
┌─────────────────────────────────────────────────────────┐
│                    SESSION STATE                        │
│                  { "word": "moon" }                     │
└─────────────────────────────────────────────────────────┘
        ▲                    │
        │                    ▼
   save_word()          get_word()
   (writes)             (reads)


┌─────────────────────────────────────────────────────────┐
│                   reverse_word()                        │
│                                                         │
│   Completely independent - no state access              │
│   Input: "hello" → Output: "olleh"                     │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Google ADK and AG-UI Protocol: How They Connect

This project uses two technologies that work together:

- **[Google ADK](https://google.github.io/adk-docs/)** - Agent Development Kit for building AI agents
- **[AG-UI Protocol](https://docs.ag-ui.com/)** - Standard protocol for agent-UI communication

### The Bridge: ag-ui-adk Middleware

The `ag-ui-adk` package acts as a translator between these two worlds:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE ADK LAYER                                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Callbacks (Google ADK concepts)                                 │   │
│  │  https://google.github.io/adk-docs/callbacks/                    │   │
│  │                                                                  │   │
│  │  • before_agent_callback(callback_context)                       │   │
│  │  • after_agent_callback(callback_context)                        │   │
│  │  • callback_context.state ← Agent's internal state              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Tools (Google ADK concepts)                                     │   │
│  │  https://google.github.io/adk-docs/tools/                        │   │
│  │                                                                  │   │
│  │  • tool_context.state ← Same state, accessible in tools         │   │
│  │  • Modifying state triggers synchronization                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ag-ui-adk MIDDLEWARE                                 │
│                    (The Bridge/Translator)                              │
│                                                                         │
│  • Wraps Google ADK agent with ADKAgent()                              │
│  • Monitors callback_context.state and tool_context.state              │
│  • Detects when state changes                                           │
│  • Generates AG-UI Protocol events                                      │
│                                                                         │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AG-UI PROTOCOL LAYER                               │
│                      https://docs.ag-ui.com/                            │
│                                                                         │
│  State Events (sent via SSE):                                           │
│  https://docs.ag-ui.com/concepts/state                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STATE_SNAPSHOT                                                  │   │
│  │  • Sends complete state: { "word": "moon" }                     │   │
│  │  • Used after each state change                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  STATE_DELTA (optional)                                          │   │
│  │  • Sends only changes: { "delta": [...] }                       │   │
│  │  • More efficient for large states                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (CopilotKit)                              │
│                      https://docs.copilotkit.ai/                        │
│                                                                         │
│  • useCoAgent() hook receives STATE_SNAPSHOT events                    │
│  • Updates React state automatically                                    │
│  • UI re-renders with new data                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Concept: State Location

| Context | Where State Lives | Documentation |
|---------|-------------------|---------------|
| `before_agent_callback` | `callback_context.state` | [Callbacks](https://google.github.io/adk-docs/callbacks/) |
| `after_agent_callback` | `callback_context.state` | [Callbacks](https://google.github.io/adk-docs/callbacks/) |
| Tool functions | `tool_context.state` | [Tools](https://google.github.io/adk-docs/tools/) |
| Frontend | `useCoAgent().state` | [AG-UI State](https://docs.ag-ui.com/concepts/state) |

### The Translation Process

When you write `tool_context.state["word"] = "moon"`:

1. **Google ADK** stores the value in its internal state
2. **ag-ui-adk** detects the state change
3. **ag-ui-adk** creates a `STATE_SNAPSHOT` event with the full state
4. The event is sent to the frontend via **SSE (Server-Sent Events)**
5. **CopilotKit** receives it and updates the React state
6. Your UI re-renders automatically

### Official Documentation Links

| Resource | URL |
|----------|-----|
| Google ADK Docs | https://google.github.io/adk-docs/ |
| ADK Callbacks | https://google.github.io/adk-docs/callbacks/ |
| ADK Tools | https://google.github.io/adk-docs/tools/ |
| ADK Context (tool_context) | https://google.github.io/adk-docs/context/ |
| ADK Custom Tools | https://google.github.io/adk-docs/tools-custom/ |
| ADK State Management | https://google.github.io/adk-docs/sessions/state/ |
| AG-UI Protocol | https://docs.ag-ui.com/ |
| AG-UI State Concepts | https://docs.ag-ui.com/concepts/state |
| CopilotKit Docs | https://docs.copilotkit.ai/ |

---

## Troubleshooting

### "Agent not found" error
- Check backend is running on port 8000
- Verify agent name matches in all files

### "Missing API key" error
- Create `.env` file in backend folder
- Add `GOOGLE_API_KEY=your_key_here`

### State not updating in UI
- Check browser console for errors
- Verify you're using `useCoAgent` hook

---

## Key Takeaways

1. **State is per-session** - Each conversation has its own state
2. **Tools can optionally use state** - Include `tool_context` parameter only if needed
3. **State syncs automatically** - AG-UI Protocol handles synchronization
4. **Agent name must match** - Same name in backend, frontend, and route

---

## Dependencies

### Backend
| Package | Purpose |
|---------|---------|
| `google-adk` | Google Agent Development Kit |
| `ag-ui-adk` | AG-UI Protocol middleware |
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |

### Frontend
| Package | Purpose |
|---------|---------|
| `@copilotkit/react-core` | React hooks |
| `@copilotkit/react-ui` | Chat components |
| `@copilotkit/runtime` | Runtime |
| `@ag-ui/client` | HTTP client |
| `next` | React framework |
