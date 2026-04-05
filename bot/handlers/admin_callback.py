from telegram import Update
from telegram.ext import ContextTypes
from bot.database import (
    get_registration_by_id,
    update_registration_status,
    increment_course_count,
    create_user,
    get_user_by_mobile,
    add_course_access,
)
from bot.utils import send_user_message, send_rejection_reasons, update_admin_message_approved, update_admin_message_rejected, delete_reject_reason_message
import bcrypt
import random
import string


async def handle_admin_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data
    
    print(f"[DEBUG] Callback received: {data}")
    
    await query.answer()
    
    if data.startswith("admin_approve__"):
        reg_id = data.replace("admin_approve__", "")
        print(f"[DEBUG] Approve clicked for reg_id: {reg_id}")
        await handle_approve(update, context, reg_id)
    
    elif data.startswith("admin_reject__"):
        reg_id = data.replace("admin_reject__", "")
        print(f"[DEBUG] Reject clicked for reg_id: {reg_id}")
        await send_rejection_reasons(query.message.chat_id, reg_id)
    
    elif data.startswith("admin_reject_reason__"):
        parts = data.split("__", 1)
        if len(parts) == 2:
            reg_id_and_reason = parts[1]
            sep_index = reg_id_and_reason.find("__")
            if sep_index > 0:
                reg_id = reg_id_and_reason[:sep_index]
                reason = reg_id_and_reason[sep_index + 2:]
                print(f"[DEBUG] Reject reason clicked for reg_id: {reg_id}, reason: {reason}")
                await handle_reject(update, context, reg_id, reason)
            else:
                print(f"[DEBUG] Invalid reject reason data: {data}")
                await query.answer("Error: Invalid data", show_alert=True)
        else:
            print(f"[DEBUG] Invalid reject reason format: {data}")
            await query.answer("Error: Invalid data", show_alert=True)


async def handle_approve(update: Update, context: ContextTypes.DEFAULT_TYPE, reg_id: str):
    query = update.callback_query
    
    reg = await get_registration_by_id(reg_id)
    if not reg:
        await query.answer("Registration not found", show_alert=True)
        return
    
    if reg.get("status") == "approved":
        await query.answer("Already approved!", show_alert=True)
        return
    
    await update_registration_status(reg_id, "approved")
    
    print(f"[DEBUG] After update, reg: {reg}")
    print(f"[DEBUG] telegram_id from reg: {reg.get('telegram_id')}")
    
    if reg.get("course_id"):
        await increment_course_count(reg["course_id"])
    
    telegram_id = reg.get("telegram_id")
    mobile = reg.get("mobile")
    course_title = reg.get("course_title", "the course")
    
    password_display = ""
    user_created = False
    
    if mobile:
        existing_user = await get_user_by_mobile(mobile)
        if not existing_user:
            chars = string.ascii_letters + string.digits
            raw_password = "".join(random.choices(chars, k=8))
            password_display = " ".join(raw_password[i:i+4] for i in range(0, len(raw_password), 4))
            
            hashed = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt())
            user_data = {
                "mobile": mobile,
                "password_hash": hashed.decode("utf-8"),
                "name": reg.get("name", "User"),
                "is_admin": False,
                "accessible_courses": [],
            }
            new_user = await create_user(user_data)
            user_created = True
            if reg.get("course_id"):
                await add_course_access(new_user["id"], reg["course_id"])
        else:
            password_display = "(existing account)"
            if reg.get("course_id"):
                await add_course_access(existing_user["id"], reg["course_id"])
    
    await update_admin_message_approved(reg_id, "Admin")
    
    if telegram_id:
        if user_created:
            login_info = (
                f"\n\n📱 *Login Credentials:*\n"
                f"Mobile: `{mobile}`\n"
                f"Password: `{password_display}`\n\n"
                f"Please login and access your course."
            )
        else:
            login_info = "\n\nYou can login with your existing credentials to access this course."
        
        user_message = f"✅ Your registration for *{course_title}* has been approved!{login_info}"
        await send_user_message(telegram_id, user_message)


async def handle_reject(update: Update, context: ContextTypes.DEFAULT_TYPE, reg_id: str, reason: str):
    query = update.callback_query
    
    reg = await get_registration_by_id(reg_id)
    if not reg:
        await query.answer("Registration not found", show_alert=True)
        return
    
    if reg.get("status") == "rejected":
        await query.answer("Already rejected!", show_alert=True)
        return
    
    await delete_reject_reason_message(reg_id)
    
    await update_registration_status(reg_id, "rejected", reason)
    
    telegram_id = reg.get("telegram_id")
    course_title = reg.get("course_title", "the course")
    
    await update_admin_message_rejected(reg_id, reason, "Admin")
    
    if telegram_id:
        user_message = (
            f"❌ Your registration for *{course_title}* has been rejected.\n\n"
            f"Reason: {reason}"
        )
        await send_user_message(telegram_id, user_message)
