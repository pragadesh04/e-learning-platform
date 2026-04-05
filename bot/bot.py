import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import logging
from dotenv import load_dotenv
from telegram import Update, BotCommand
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

from bot.database import connect_to_mongo, close_mongo_connection, initialize_default_config
from bot.handlers.start import (
    start_command,
    help_command,
    courses_command,
    myregistrations_command,
    course_view_callback,
    back_to_courses_callback,
)
from bot.handlers.query import query_callback, end_command, handle_query_message
from bot.handlers.registration import (
    register_callback,
    handle_registration_input,
    course_select_callback,
    use_same_details_callback,
)
from bot.handlers.payment import handle_screenshot
from bot.handlers.admin_callback import handle_admin_callback

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)

logger = logging.getLogger(__name__)


BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
BOT_PORT = int(os.getenv("BOT_WEBHOOK_PORT", "8443"))
ADMIN_WEBHOOK_SECRET = os.getenv("ADMIN_WEBHOOK_SECRET", "your_secret_key_here")

BOT_COMMANDS = {
    "start": "Start the bot",
    "help": "Show available commands",
    "courses": "View all courses with details",
    "register": "Register for a course",
    "myregistrations": "View your registrations",
    "end": "Exit query mode",
}


async def post_init(application: Application):
    await connect_to_mongo()
    await initialize_default_config()

    await application.bot.set_my_commands([
        BotCommand("start", BOT_COMMANDS["start"]),
        BotCommand("help", BOT_COMMANDS["help"]),
        BotCommand("courses", BOT_COMMANDS["courses"]),
        BotCommand("register", BOT_COMMANDS["register"]),
        BotCommand("myregistrations", BOT_COMMANDS["myregistrations"]),
        BotCommand("end", BOT_COMMANDS["end"]),
    ])

    logger.info("Bot initialized.")


async def post_shutdown(application: Application):
    await close_mongo_connection()


def setup_handlers(application: Application):
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("courses", courses_command))
    application.add_handler(CommandHandler("register", start_command))
    application.add_handler(CommandHandler("end", end_command))
    application.add_handler(CommandHandler("myregistrations", myregistrations_command))
    application.add_handler(
        CallbackQueryHandler(handle_admin_callback, pattern="^admin_approve__|^admin_reject__|^admin_reject_reason__")
    )
    application.add_handler(
        CallbackQueryHandler(query_callback, pattern="action_query")
    )
    application.add_handler(
        CallbackQueryHandler(register_callback, pattern="action_register")
    )
    application.add_handler(
        CallbackQueryHandler(course_select_callback, pattern="^(course_|proceed_payment|cancel_registration|course_register_)")
    )
    application.add_handler(
        CallbackQueryHandler(use_same_details_callback, pattern="^use_same_details_")
    )
    application.add_handler(
        CallbackQueryHandler(course_view_callback, pattern="^course_view_")
    )
    application.add_handler(
        CallbackQueryHandler(back_to_courses_callback, pattern="^back_to_courses$")
    )
    application.add_handler(MessageHandler(filters.PHOTO, handle_screenshot))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )


async def handle_message(update: Update, context):
    if update.message and update.message.text:
        if update.message.text.startswith("/"):
            return

        result = await handle_query_message(update, context)
        if result:
            return

        result = await handle_registration_input(update, context)
        if result:
            return

        if not context.user_data.get("in_query_mode") and not context.user_data.get(
            "in_registration"
        ):
            await update.message.reply_text(
                "I'm here to help! Use /start to get started."
            )


def main():
    logger.info("Starting Telegram Bot in webhook-only mode...")
    
    application = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    setup_handlers(application)
    
    logger.info("Bot initialized. Waiting for webhook updates...")
    application.run_webhook(
        listen="0.0.0.0",
        port=BOT_PORT,
        url_path=f"webhook/{BOT_TOKEN}",
        secret_token=ADMIN_WEBHOOK_SECRET,
        webhook_url=WEBHOOK_URL,
    )


if __name__ == "__main__":
    main()
