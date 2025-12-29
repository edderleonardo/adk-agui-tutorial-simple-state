/**
 * =============================================================================
 * MAIN PAGE COMPONENT
 * =============================================================================
 *
 * This is the main UI component that demonstrates shared state.
 *
 * Key concepts:
 * 1. useCoAgent hook - connects to the agent and syncs state
 * 2. state.word - automatically updates when backend changes it
 * 3. CopilotChat - provides the chat interface
 *
 * =============================================================================
 */

"use client";

import { useEffect } from "react";
import { useCoAgent } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

/**
 * TypeScript type for our state.
 * This should match what the backend stores in tool_context.state
 */
type WordState = {
  word: string;
};

export default function Home() {
  /**
   * useCoAgent hook - the magic that syncs state!
   *
   * When the backend modifies tool_context.state["word"],
   * this state.word automatically updates via STATE_SNAPSHOT event!
   */
  const { state } = useCoAgent<WordState>({
    name: "WordAgent",
    initialState: {
      word: "",
    },
  });

  // Log state changes to browser console
  useEffect(() => {
    console.log("=".repeat(60));
    console.log("📥 FRONTEND: State received from backend");
    console.log("   state.word:", state.word || "(empty)");
    console.log("   Full state:", JSON.stringify(state, null, 2));
    console.log("   (This came from a STATE_SNAPSHOT event)");
    console.log("=".repeat(60));
  }, [state.word]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-8">
          Word Agent
        </h1>

        {/* State Display - Shows the synced state */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-lg">
              <span className="font-medium">Saved word: </span>
              <span className="text-blue-600 font-mono">
                {state.word || "(none)"}
              </span>
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            This updates automatically when the agent saves a new word!
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">How to use</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Save a word:</strong> "Save the word moon"</li>
            <li><strong>Request a poem:</strong> "Write me a haiku" or "Create a sonnet"</li>
            <li><strong>Reverse a word:</strong> "Reverse the word hello"</li>
            <li><strong>Check your word:</strong> "What's my word?"</li>
          </ul>
        </div>
      </div>

      {/* Sidebar Chat - More stable than embedded chat */}
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: "Poet Agent",
          initial:
            "Hi! I'm a poet assistant. Save a word and I'll write poems using it! Try: 'Save the word moon' then 'Write me a haiku'"
        }}
      />
    </div>
  );
}
