import httpx
import os
import logging

logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"


async def send_telegram_message(chat_id: int, text: str) -> bool:
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN not configured")
        return False

    url = f"{TELEGRAM_API_URL}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info(f"Telegram message sent to {chat_id}")
                return True
            else:
                logger.error(f"Failed to send telegram message: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Error sending telegram message: {e}")
        return False
