/**
 * =============================================================================
 * ROOT LAYOUT
 * =============================================================================
 *
 * This file wraps the entire application with CopilotKit provider.
 *
 * The CopilotKit component:
 * - Connects to the API route at /api/copilotkit
 * - Specifies which agent to use ("WordAgent")
 * - Provides context for useCoAgent and CopilotChat components
 *
 * =============================================================================
 */

import type { Metadata } from "next";
import { CopilotKit } from "@copilotkit/react-core";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";

export const metadata: Metadata = {
  title: "Word Agent",
  description: "A simple agent that remembers one word",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* CopilotKit provider - wraps entire app */}
        <CopilotKit
          runtimeUrl="/api/copilotkit"  // Points to our API route
          agent="WordAgent"              // Must match backend agent name!
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}