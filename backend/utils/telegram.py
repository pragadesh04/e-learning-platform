import httpx
import os
import logging
from dotenv import load_dotenv

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

logger = logging.getLogger(__name__)


def get_bot_token():
    return os.getenv("BOT_TOKEN")


def get_admin_chat_ids():
    return os.getenv("ADMIN_CHAT_ID", "")


def get_telegram_api_url():
    return f"https://api.telegram.org/bot{get_bot_token()}"


async def send_telegram_message(chat_id: int, text: str, parse_mode: str = "HTML") -> bool:
    bot_token = get_bot_token()
    if not bot_token:
        logger.error("BOT_TOKEN not configured")
        return False

    url = f"{get_telegram_api_url()}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}

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


async def edit_telegram_message_caption(chat_id: int, message_id: int, caption: str, parse_mode: str = "Markdown") -> bool:
    bot_token = get_bot_token()
    if not bot_token:
        logger.error("BOT_TOKEN not configured")
        return False

    url = f"{get_telegram_api_url()}/editMessageCaption"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "caption": caption,
        "parse_mode": parse_mode,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info(f"Telegram message caption edited for {chat_id}:{message_id}")
                return True
            else:
                logger.error(f"Failed to edit telegram message: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Error editing telegram message: {e}")
        return False


async def notify_all_admins(registration_id: str, action: str, reason: str = None, approver_name: str = "Admin", user_name: str = None, course_title: str = None):
    admin_chat_ids = get_admin_chat_ids()
    print(f"[DEBUG] notify_all_admins - admin_chat_ids: {admin_chat_ids}")
    if not admin_chat_ids:
        logger.warning("ADMIN_CHAT_ID not configured")
        return

    admin_ids = [id.strip() for id in admin_chat_ids.split(",") if id.strip()]
    print(f"[DEBUG] notify_all_admins - parsed admin_ids: {admin_ids}")
    
    for admin_id in admin_ids:
        if action == "approved":
            caption = f"✅ *Approved*\n\n👤 {user_name or 'User'}\n📚 Course: {course_title or 'N/A'}\nBy: {approver_name}"
        elif action == "rejected":
            caption = f"❌ *Rejected*\n\n👤 {user_name or 'User'}\n📚 Course: {course_title or 'N/A'}\nReason: {reason or 'No reason'}\nBy: {approver_name}"
        else:
            continue
        
        result = await send_telegram_message(int(admin_id), caption, parse_mode="Markdown")
        print(f"[DEBUG] Sent to admin {admin_id}: {result}")


import json

async def send_telegram_photo(
    chat_id: int,
    photo_path: str,
    caption: str = None,
    parse_mode: str = "Markdown",
    reply_markup: dict = None   # 👈 add this
) -> dict:
    bot_token = get_bot_token()
    if not bot_token:
        logger.error("BOT_TOKEN not configured")
        return {"success": False}

    url = f"{get_telegram_api_url()}/sendPhoto"
    
    try:
        async with httpx.AsyncClient() as client:
            with open(photo_path, "rb") as photo_file:
                files = {"photo": photo_file}
                data = {
                    "chat_id": str(chat_id),
                    "parse_mode": parse_mode,
                }

                if caption:
                    data["caption"] = caption
                    
                if reply_markup:
                    data["reply_markup"] = json.dumps(reply_markup)

                response = await client.post(url, data=data, files=files, timeout=30)
                
            if response.status_code == 200:
                result_data = response.json()
                return {
                    "success": True, 
                    "message_id": result_data.get("result", {}).get("message_id")
                }
            else:
                logger.error(f"Failed to send photo: {response.text}")
                return {"success": False}
    except Exception as e:
        logger.error(f"Error sending telegram photo: {e}")
        return {"success": False}
