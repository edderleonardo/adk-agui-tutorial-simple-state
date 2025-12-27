"""
=============================================================================
AGENT DEFINITION
=============================================================================

This file defines the Word Agent - a simple agent that remembers one word.

Key concepts demonstrated:
1. State initialization with on_before_agent callback
2. Tools that read and write to state
3. ADKAgent wrapper for AG-UI protocol

=============================================================================
"""

import logging
from google.adk.agents import LlmAgent
from ag_ui_adk import ADKAgent

# Get logger (configured in main.py)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

AGENT_NAME = "WordAgent"           # Must match frontend!
AGENT_MODEL = "gemini-2.0-flash"   # The LLM model to use


# =============================================================================
# STATE INITIALIZATION CALLBACK
# =============================================================================

def on_before_agent(callback_context):
    """
    Runs BEFORE every message is processed.
    """
    logger.info("=" * 60)
    logger.info("✅ ON_BEFORE_AGENT CALLBACK")
    # Get current word value (if exists)
    current_word = callback_context.state.get("word", None)
    logger.info(f"   Current state['word']: {current_word}")

    if "word" not in callback_context.state:
        callback_context.state["word"] = ""
        logger.info("   Initialized 'word' to empty string")

    logger.info("=" * 60)
    return None


def on_after_agent(callback_context):
    """
    Runs AFTER every message is processed.
    """
    logger.info("=" * 60)
    logger.info("✅ ON_AFTER_AGENT CALLBACK")

    # Get final word value
    final_word = callback_context.state.get("word", "")
    logger.info(f"   Final state['word']: '{final_word}'")
    logger.info("   (This state will be sent to frontend as STATE_SNAPSHOT)")
    logger.info("=" * 60)
    return None


# =============================================================================
# TOOLS - Functions the LLM can call
# =============================================================================

def save_word(word: str, tool_context) -> dict:
    """
    Save a word to the state. (WRITES to state)
    """
    logger.info("-" * 60)
    logger.info("📝 TOOL: save_word")
    logger.info(f"   Input: word='{word}'")

    old_word = tool_context.state.get("word", "")
    logger.info(f"   State BEFORE: word='{old_word}'")

    tool_context.state["word"] = word  # This triggers STATE_SNAPSHOT to frontend!

    logger.info(f"   State AFTER: word='{word}'")
    logger.info("   ⚡ State change will trigger STATE_SNAPSHOT event")
    logger.info("-" * 60)

    return {"status": "success", "message": f"Word '{word}' saved."}


def get_word(tool_context) -> dict:
    """
    Get the saved word from state. (READS from state)
    """
    logger.info("-" * 60)
    logger.info("📖 TOOL: get_word")

    word = tool_context.state.get("word", "")

    logger.info(f"   Current state: word='{word}'")
    logger.info(f"   Retrieved word: '{word}'")
    logger.info("   (No state change - just reading)")
    logger.info("-" * 60)

    if word:
        return {"status": "success", "word": word}
    return {"status": "empty", "message": "No word saved yet."}


def reverse_word(word: str) -> dict:
    """
    Reverse a word. (NO state access)
    """
    logger.info("-" * 60)
    logger.info("🔄 TOOL: reverse_word")
    logger.info(f"   Input: word='{word}'")
    logger.info("   (This tool does NOT access state)")

    reversed_word = word[::-1]

    logger.info(f"   Output: reversed='{reversed_word}'")
    logger.info("-" * 60)

    return {"original": word, "reversed": reversed_word}


# =============================================================================
# AGENT INSTRUCTIONS (System Prompt)
# =============================================================================

AGENT_INSTRUCTION = """You are a creative poet assistant.

ALWAYS respond in English.

TOOLS:
1. save_word - Save a word to memory
2. get_word - Get the saved word (ONLY use for poems)
3. reverse_word - Reverse any word (standalone, independent)

CRITICAL RULES:
- ONLY call get_word when user asks for a POEM
- NEVER call get_word when user asks to reverse a word
- reverse_word works independently - just reverse and show result

WHEN TO USE EACH TOOL:
- "save word X" → save_word only
- "reverse word X" → reverse_word only (DO NOT call get_word!)
- "write poem" → get_word first, then use that word to write the poem
- "what's my word" → get_word only

Example:
- User: "reverse hello" → Use reverse_word, respond: "Reversed: olleh"
- User: "write haiku" → Use get_word, then write haiku with that word
"""


# =============================================================================
# CREATE THE AGENT
# =============================================================================

# Create the LLM agent with all configuration
llm_agent = LlmAgent(
    name=AGENT_NAME,
    model=AGENT_MODEL,
    instruction=AGENT_INSTRUCTION,
    tools=[save_word, get_word, reverse_word],
    before_agent_callback=on_before_agent,
    after_agent_callback=on_after_agent,
)

# Wrap with ADKAgent for AG-UI protocol support
# This enables automatic state synchronization with the frontend
adk_agent = ADKAgent(
    adk_agent=llm_agent,
    app_name="word_app",
    user_id="user_1",
)