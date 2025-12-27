"""
=============================================================================
FASTAPI SERVER
=============================================================================

Entry point for the backend server.

This file:
1. Loads environment variables (API key)
2. Creates a FastAPI application
3. Configures CORS for frontend access
4. Mounts the ADK agent endpoint

Run with: uv run python main.py

=============================================================================
"""

import logging

# Configure logging FIRST, before importing other modules
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

from dotenv import load_dotenv
load_dotenv()  # Load GOOGLE_API_KEY from .env file

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ag_ui_adk import add_adk_fastapi_endpoint

from agent import adk_agent


# =============================================================================
# CREATE FASTAPI APP
# =============================================================================

app = FastAPI(title="Word Agent API")


# =============================================================================
# CONFIGURE CORS
# =============================================================================
# CORS (Cross-Origin Resource Sharing) allows the frontend
# at localhost:3000 to communicate with this backend at localhost:8000

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# MOUNT AGENT ENDPOINT
# =============================================================================
# This single line adds two endpoints:
# - POST /          - Main agent endpoint (handles chat messages)
# - POST /agents/state - State retrieval endpoint (for debugging)

add_adk_fastapi_endpoint(app, adk_agent)


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 50)
    print("Word Agent - Backend Server")
    print("=" * 50)
    print("Server: http://localhost:8000")
    print("Frontend: http://localhost:3000")
    print("=" * 50 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)