/**
 * =============================================================================
 * API ROUTE - CopilotKit Runtime
 * =============================================================================
 *
 * This file acts as a BRIDGE between:
 * - Frontend (CopilotKit components) → This endpoint
 * - This endpoint → Backend (ADK Agent at localhost:8000)
 *
 * Why is this needed?
 * CopilotKit needs a "runtime" that handles communication.
 * The runtime knows how to talk to different types of agents.
 *
 * FLOW:
 * 1. CopilotChat sends message to /api/copilotkit
 * 2. This endpoint forwards it to http://localhost:8000 (backend)
 * 3. Backend responds with SSE events
 * 4. This endpoint forwards them to frontend
 *
 * =============================================================================
 */

import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";

// =============================================================================
// RUNTIME CONFIGURATION
// =============================================================================

/**
 * CopilotRuntime handles communication with agents.
 * Here we register our "WordAgent".
 */
const runtime = new CopilotRuntime({
  agents: {
    // -------------------------------------------------------------------------
    // Agent Registration
    // -------------------------------------------------------------------------
    // The KEY must match:
    // - Frontend: <CopilotKit agent="WordAgent">
    // - Frontend: useCoAgent({ name: "WordAgent" })
    // - Backend: LlmAgent(name="WordAgent")

    WordAgent: new HttpAgent({
      // URL where the backend is running (FastAPI + ADK)
      url: "http://localhost:8000/",
    }),
  },
});

/**
 * ServiceAdapter handles orchestration logic.
 * We use ExperimentalEmptyAdapter because we only have one agent
 * and don't need agent selection logic.
 */
const serviceAdapter = new ExperimentalEmptyAdapter();

// =============================================================================
// HTTP HANDLER
// =============================================================================

/**
 * Handler for POST requests to /api/copilotkit
 *
 * Next.js App Router uses this pattern to define endpoints.
 * We only export POST because CopilotKit uses POST for messages.
 */
export const POST = async (req: Request) => {
  // Log incoming request
  console.log("=".repeat(60));
  console.log("🌐 API ROUTE: Received request from CopilotKit");
  console.log("   Forwarding to backend at http://localhost:8000/");
  console.log("=".repeat(60));

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  const response = await handleRequest(req);

  console.log("=".repeat(60));
  console.log("🌐 API ROUTE: Response received from backend");
  console.log("   Status:", response.status);
  console.log("   (SSE events being streamed to frontend)");
  console.log("=".repeat(60));

  return response;
};
