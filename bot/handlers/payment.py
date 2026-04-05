from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from bot.database import get_config, create_registration
from bot.utils import generate_qr_code, send_admin_notification
from bson import ObjectId
import os
import tempfile


async def start_payment_flow(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start payment flow after course selection"""
    course = context.user_data.get("selected_course")
    name = context.user_data.get("reg_name")
    address = context.user_data.get("reg_address")

    upi_id = await get_config("upi_id") or "yourname@upi"
    amount = course.get("fee") or course.get("price") or course.get("amount") or 0
    amount = float(amount) if amount else 0.0

    context.user_data["registration_step"] = "waiting_screenshot"
    context.user_data["payment_amount"] = amount

    qr_base64 = generate_qr_code(upi_id, amount)

    # Save QR to temp file
    import base64

    qr_bytes = base64.b64decode(qr_base64)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(qr_bytes)
        tmp_path = tmp.name

    course_info = (
        f"✅ *Course Selected:*\n"
        f"📚 {course['title']}\n"
        f"💰 Amount: ₹{amount}\n\n"
        f"📱 *UPI ID:* `{upi_id}`\n\n"
        f"Please pay the above amount and send the screenshot."
    )

    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    
    keyboard = [[InlineKeyboardButton("❌ Cancel", callback_data="cancel_registration")]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if update.callback_query:
        chat_id = update.callback_query.message.chat_id
        await update.callback_query.message.reply_text(
            course_info, parse_mode="Markdown", reply_markup=reply_markup
        )
    else:
        chat_id = update.message.chat_id
        await update.message.reply_text(course_info, parse_mode="Markdown", reply_markup=reply_markup)

    await context.bot.send_photo(
        chat_id=chat_id,
        photo=open(tmp_path, "rb"),
        caption=f"Scan QR code to pay ₹{amount}",
    )

    context.user_data["payment_upi_id"] = upi_id
    context.user_data["payment_amount"] = amount


async def handle_screenshot(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle screenshot submission"""
    if not context.user_data.get("in_registration"):
        return None

    if context.user_data.get("registration_step") != "waiting_screenshot":
        return None

    if not update.message.photo:
        return None

    photo = update.message.photo[-1]
    file = await photo.get_file()

    user_id = update.message.from_user.id
    filename = f"screenshot_{user_id}_{update.message.message_id}.jpg"
    filepath = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "..",
        "uploads",
        "screenshots",
        filename,
    )

    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    await file.download_to_drive(filepath)

    course = context.user_data.get("selected_course")
    name = context.user_data.get("reg_name")
    address = context.user_data.get("reg_address")
    mobile = context.user_data.get("reg_mobile", "")
    amount = context.user_data.get("payment_amount", 0)

    screenshot_url = f"/uploads/screenshots/{filename}"

    username = update.message.from_user.username or update.message.from_user.first_name or "User"

    registration_data = {
        "telegram_id": user_id,
        "name": name,
        "address": address,
        "mobile": mobile,
        "course_id": ObjectId(course["_id"])
        if isinstance(course.get("_id"), str)
        else course.get("_id"),
        "course_title": course["title"],
        "course_type": course.get("course_type", "recorded"),
        "start_date": course.get("start_date"),
        "start_time": course.get("start_time"),
        "amount": amount,
        "screenshot_url": screenshot_url,
        "status": "pending",
        "username": username,
    }

    reg_id = await create_registration(registration_data)
    registration_data["_id"] = reg_id

    await send_admin_notification(registration_data, reg_id)

    await update.message.reply_text(
        f"✅ *Screenshot Received!*\n\n"
        f"📚 Course: {course['title']}\n\n"
        f"✅ Your registration is complete and waiting for manual approval.\n\n"
        f"💡 For any questions, you can ask here.\n"
        f"🔄 To register for another course, type /end and then /register",
        parse_mode="Markdown",
    )

    return True
