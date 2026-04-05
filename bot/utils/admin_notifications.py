import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import httpx
from settings import settings

admin_message_ids = {}
reject_reason_message_ids = {}

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_telegram_api_url() -> str:
    return f"https://api.telegram.org/bot{settings.bot_token}"


async def send_telegram_message(
    chat_id: int, 
    text: str, 
    reply_markup=None,
    parse_mode: str = "Markdown",
    reply_to_message_id: int = None
) -> dict:
    if not settings.bot_token:
        print("BOT_TOKEN not configured")
        return {"success": False}

    url = f"{get_telegram_api_url()}/sendMessage"
    payload = {
        "chat_id": chat_id, 
        "text": text, 
        "parse_mode": parse_mode,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup.to_dict()
        print(f"[DEBUG] Added reply_markup dict: {payload['reply_markup']}")
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            print(f"[DEBUG] Response status: {response.status_code}")
            print(f"[DEBUG] Response body: {response.text[:500] if response.text else 'empty'}")
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "message_id": data.get("result", {}).get("message_id")}
            else:
                print(f"Failed to send message: {response.text}")
                return {"success": False}
    except Exception as e:
        print(f"Error sending telegram message: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False}


async def send_telegram_photo(
    chat_id: int,
    photo_path: str,
    caption: str = None,
    parse_mode: str = "Markdown",
    reply_markup=None
) -> dict:
    if not settings.bot_token:
        print("BOT_TOKEN not configured")
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
                    data["reply_markup"] = json.dumps(reply_markup.to_dict())
                
                response = await client.post(url, data=data, files=files, timeout=30)
                
            if response.status_code == 200:
                result_data = response.json()
                return {
                    "success": True, 
                    "message_id": result_data.get("result", {}).get("message_id")
                }
            else:
                print(f"Failed to send photo: {response.text}")
                return {"success": False}
    except Exception as e:
        print(f"Error sending telegram photo: {e}")
        return {"success": False}


async def edit_message(chat_id: int, message_id: int, text: str, parse_mode: str = "Markdown"):
    url = f"{get_telegram_api_url()}/editMessageText"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": parse_mode,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            return response.status_code == 200
    except Exception as e:
        print(f"Error editing message: {e}")
        return False


async def edit_message_caption(chat_id: int, message_id: int, caption: str, parse_mode: str = "Markdown", reply_markup=None):
    url = f"{get_telegram_api_url()}/editMessageCaption"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "caption": caption,
        "parse_mode": parse_mode,
    }
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup.to_dict())
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            return response.status_code == 200
    except Exception as e:
        print(f"Error editing message caption: {e}")
        return False


async def send_user_message(telegram_id: int, text: str, parse_mode: str = "Markdown") -> bool:
    result = await send_telegram_message(telegram_id, text, parse_mode=parse_mode)
    return result.get("success", False)


async def send_user_photo(telegram_id: int, photo_path: str, caption: str = None, parse_mode: str = "Markdown") -> dict:
    return await send_telegram_photo(telegram_id, photo_path, caption, parse_mode)


def get_screenshot_path(screenshot_url: str) -> str:
    if not screenshot_url:
        return None
    
    # Try multiple possible paths
    possible_paths = [
        os.path.join(PROJECT_ROOT, screenshot_url.lstrip("/")),
        os.path.join(PROJECT_ROOT, "..", "uploads", "screenshots", os.path.basename(screenshot_url)),
        os.path.join(PROJECT_ROOT, "bot", "uploads", "screenshots", os.path.basename(screenshot_url)),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"[DEBUG] Screenshot found at: {path}")
            return path
    
    print(f"[DEBUG] Screenshot not found in any of: {possible_paths}")
    return None


async def send_admin_notification(
    registration_data: dict, 
    registration_id: str = None
) -> bool:
    admin_ids = settings.admin_chat_ids
    print(f"[DEBUG] send_admin_notification - admin_ids: {admin_ids}")
    print(f"[DEBUG] send_admin_notification - bot_token exists: {bool(settings.bot_token)}")
    if not admin_ids:
        print("ADMIN_CHAT_ID not configured")
        return False

    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    
    reg_id = str(registration_data.get("_id") or registration_id)
    if not reg_id:
        print("No registration ID provided")
        return False

    print(f"[DEBUG] Creating notification with reg_id: {reg_id}, type: {type(reg_id)}")
    
    username = registration_data.get('username', 'N/A')
    if username:
        for char in ["_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", "=", "|", "{", "}", ".", "!"]:
            username = username.replace(char, f"\\{char}")
    else:
        username = 'N/A'
    
    course_title = registration_data.get('course_title', 'N/A')
    if course_title:
        for char in ["_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", "=", "|", "{", "}", ".", "!"]:
            course_title = course_title.replace(char, f"\\{char}")
    else:
        course_title = 'N/A'
    
    user_name = registration_data.get('name', 'N/A')
    user_mobile = registration_data.get('mobile', 'N/A')
    
    caption = (
        f"📋 *New Registration - Pending Approval*\n\n"
        f"👤 *Name:* {user_name}\n"
        f"📱 *Mobile:* {user_mobile}\n"
        f"📚 *Course:* {course_title}\n"
    )
    
    keyboard = [
        [
            InlineKeyboardButton("✅ Approve", callback_data=f"admin_approve__{reg_id}"),
            InlineKeyboardButton("❌ Reject", callback_data=f"admin_reject__{reg_id}"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    print(f"[DEBUG] Callback data - approve: admin_approve__{reg_id}")
    print(f"[DEBUG] Callback data - reject: admin_reject__{reg_id}")
    print(f"[DEBUG] reply_markup.to_dict(): {reply_markup.to_dict()}")
    
    # Debug: see what gets JSON encoded
    encoded = json.dumps(reply_markup.to_dict())
    print(f"[DEBUG] JSON encoded reply_markup: {encoded}")
    
    admin_message_ids[reg_id] = []
    
    screenshot_url = registration_data.get("screenshot_url")
    screenshot_path = get_screenshot_path(screenshot_url)
    
    print(f"[DEBUG] Screenshot URL: {screenshot_url}")
    print(f"[DEBUG] Screenshot Path: {screenshot_path}")
    print(f"[DEBUG] Path exists: {screenshot_path and os.path.exists(screenshot_path)}")
    print(f"[DEBUG] PROJECT_ROOT: {PROJECT_ROOT}")
    
    for admin_id in admin_ids:
        try:
            if screenshot_path and os.path.exists(screenshot_path):
                print(f"[DEBUG] Sending photo to admin {admin_id}")
                result = await send_telegram_photo(
                    int(admin_id),
                    screenshot_path,
                    caption=caption,
                    reply_markup=reply_markup
                )
            else:
                print(f"[DEBUG] Screenshot not found, sending text message to admin {admin_id}")
                result = await send_telegram_message(
                    int(admin_id),
                    caption,
                    reply_markup=reply_markup
                )
            
            if result.get("success") and result.get("message_id"):
                admin_message_ids[reg_id].append({
                    "chat_id": int(admin_id),
                    "message_id": result["message_id"]
                })
                print(f"[DEBUG] Successfully sent to admin {admin_id}, message_id: {result['message_id']}")
        except Exception as e:
            print(f"Error sending to admin {admin_id}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    return len(admin_message_ids.get(reg_id, [])) > 0


async def notify_all_admins_approved(registration_data: dict, registration_id: str, approver_name: str = "Admin"):
    caption = (
        f"✅ *Approved*\n\n"
        f"👤 {registration_data.get('name', 'N/A')} - {registration_data.get('course_title', 'N/A')}\n"
        f"By: {approver_name}"
    )
    await update_all_admin_messages(registration_id, caption, remove_buttons=True)


async def notify_all_admins_rejected(registration_data: dict, registration_id: str, reason: str = None, rejecter_name: str = "Admin"):
    caption = (
        f"❌ *Rejected*\n\n"
        f"👤 {registration_data.get('name', 'N/A')} - {registration_data.get('course_title', 'N/A')}\n"
        f"Reason: {reason or 'No reason provided'}\n"
        f"By: {rejecter_name}"
    )
    await update_all_admin_messages(registration_id, caption, remove_buttons=True)


async def update_all_admin_messages(registration_id: str, text: str, remove_buttons: bool = False):
    if registration_id not in admin_message_ids:
        return
    
    for msg_info in admin_message_ids[registration_id]:
        await edit_message(
            msg_info["chat_id"],
            msg_info["message_id"],
            text
        )


async def send_rejection_reasons(chat_id: int, registration_id: str) -> bool:
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    
    keyboard = []
    for reason in settings.rejection_reasons:
        keyboard.append([
            InlineKeyboardButton(
                reason, 
                callback_data=f"admin_reject_reason__{registration_id}__{reason}"
            )
        ])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    result = await send_telegram_message(
        chat_id,
        "❌ *Select Rejection Reason:*",
        reply_markup=reply_markup,
        parse_mode="Markdown"
    )
    
    if result.get("success") and result.get("message_id"):
        reject_reason_message_ids[registration_id] = {
            "chat_id": chat_id,
            "message_id": result["message_id"]
        }
    
    return result.get("success", False)


async def delete_reject_reason_message(registration_id: str):
    if registration_id in reject_reason_message_ids:
        msg_info = reject_reason_message_ids[registration_id]
        await edit_message(
            msg_info["chat_id"],
            msg_info["message_id"],
            "❌ *Rejection reason selected*"
        )
        del reject_reason_message_ids[registration_id]


async def update_admin_message_approved(registration_id: str, approver_name: str = "Admin"):
    if registration_id not in admin_message_ids:
        return False
    
    for msg_info in admin_message_ids[registration_id]:
        await edit_message_caption(
            msg_info["chat_id"],
            msg_info["message_id"],
            f"✅ *Approved by {approver_name}*",
            reply_markup=None
        )
    return True


async def update_admin_message_rejected(registration_id: str, reason: str, rejecter_name: str = "Admin"):
    if registration_id not in admin_message_ids:
        return False
    
    for msg_info in admin_message_ids[registration_id]:
        await edit_message_caption(
            msg_info["chat_id"],
            msg_info["message_id"],
            f"❌ *Rejected*\nReason: {reason}\nBy: {rejecter_name}",
            reply_markup=None
        )
    return True
