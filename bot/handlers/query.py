from telegram import Update
from telegram.ext import ContextTypes
from bot.database import add_chat_message, get_chat_history, clear_chat_history
from bot.ai import get_ai_response_stream


def is_follow_up(user_message: str, last_user_message: str) -> bool:
    """Detect if message is a follow-up based on keywords and message characteristics."""
    user_msg = user_message.lower().strip()
    last_msg = last_user_message.lower().strip() if last_user_message else ""

    # Short messages that are likely follow-ups
    follow_up_keywords = [
        "that",
        "it",
        "this",
        "these",
        "those",
        "what about",
        "and",
        "but",
        "so",
        "then",
        "how much",
        "price",
        "cost",
        "fee",
        "when",
        "where",
        "who",
        "which one",
        "more",
        "details",
        "info",
        "about",
        "second",
        "first",
        "third",
        "last",
        "the",
        "their",
        "there",
    ]

    # Check if it's a very short message (likely follow-up)
    if len(user_msg) < 20:
        return True

    # Check for follow-up keywords
    for keyword in follow_up_keywords:
        if user_msg.startswith(keyword) or user_msg in follow_up_keywords:
            return True

    # Check if it references something from last message (e.g., second course, that one)
    reference_words = [
        "second",
        "first",
        "third",
        "last",
        "that one",
        "this one",
        "the one",
    ]
    for word in reference_words:
        if word in user_msg:
            return True

    return False


def extract_context_from_history(history: list) -> str:
    """Extract relevant context from recent chat history."""
    if not history:
        return ""

    # Get last 4 messages (2 user + 2 assistant)
    recent = history[-6:] if len(history) > 6 else history

    context_parts = []
    for msg in recent:
        role = msg.get("role", "")
        content = msg.get("message", "")[:100]  # Truncate long messages
        if role == "assistant":
            context_parts.append(f"Previous response: {content}")
        elif role == "user" and len(msg.get("message", "")) < 30:
            context_parts.append(f"User asked: {content}")

    return " | ".join(context_parts[-2:]) if context_parts else ""


async def handle_query_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle messages in query mode"""
    if not context.user_data.get("in_query_mode"):
        return None

    user_id = update.message.from_user.id
    user_message = update.message.text

    await add_chat_message(user_id, "user", user_message)

    history = await get_chat_history(user_id)

    # Detect if follow-up and get previous context
    previous_context = context.user_data.get("last_ai_context", "")
    is_follow = False

    # Get last user message from history to check if this is a follow-up
    last_user_msg = ""
    for msg in reversed(history[:-1]):  # Exclude current message
        if msg.get("role") == "user":
            last_user_msg = msg.get("message", "")
            break

    if last_user_msg:
        is_follow = is_follow_up(user_message, last_user_msg)

    # If not a follow-up question, clear the previous context
    if not is_follow:
        context.user_data["last_ai_context"] = ""
        previous_context = ""

    thinking_msg = await update.message.reply_text("💭 Thinking...")

    response_text = ""

    async for chunk in get_ai_response_stream(
        history, user_message, telegram_id=user_id, previous_context=previous_context
    ):
        response_text += chunk

    if response_text:
        # Store context for potential follow-ups
        if not is_follow:
            context.user_data["last_ai_context"] = response_text[:200]

        await add_chat_message(user_id, "assistant", response_text)

        try:
            await context.bot.edit_message_text(
                chat_id=update.message.chat_id,
                message_id=thinking_msg.message_id,
                text=response_text,
                parse_mode="Markdown",
            )
        except Exception as e:
            await update.message.reply_text(response_text, parse_mode="Markdown")

    return True


async def query_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle query callback - enter query mode"""
    query = update.callback_query
    await query.answer()

    context.user_data["in_query_mode"] = True
    context.user_data["in_registration"] = False
    context.user_data["chat_id"] = query.message.chat_id
    context.user_data["message_id"] = query.message.message_id
    context.user_data["last_ai_context"] = ""

    await query.edit_message_text(
        text="🔍 *Query Mode Activated*\n\n"
        "Ask any question and I'll help you out!\n"
        "Type /end to exit query mode.",
        parse_mode="Markdown",
    )


async def end_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /end command - exit query mode"""
    if context.user_data.get("in_query_mode"):
        context.user_data["in_query_mode"] = False
        context.user_data["last_ai_context"] = ""
        await clear_chat_history(update.message.from_user.id)
        await update.message.reply_text(
            "👋 Query session ended. Use /start to begin again."
        )
    else:
        await update.message.reply_text(
            "You're not in query mode. Use /start to get started."
        )
