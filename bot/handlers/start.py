from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from bot.database import get_courses, get_course_by_id, get_registrations_by_telegram_id
from datetime import datetime


def format_duration_hours(hours: float) -> str:
    if not hours:
        return "N/A"
    h = int(hours)
    m = int((hours - h) * 60)
    if h == 0:
        return f"{m} Minutes"
    elif m == 0:
        return f"{h} Hour{'s' if h > 1 else ''}"
    else:
        return f"{h} Hour{'s' if h > 1 else ''} {m} Minutes"


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command - show inline keyboard with Query and Register options"""
    keyboard = [
        [InlineKeyboardButton("📋 Get Query", callback_data="action_query")],
        [InlineKeyboardButton("📝 Register", callback_data="action_register")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    welcome_message = (
        "👋 *Welcome to Course Registration Bot!*\n\n"
        "Please select an option below:\n\n"
        "📋 *Get Query* - Ask questions and get answers from our AI assistant\n"
        "📝 *Register* - Register for a course\n\n"
        "Type /help to see all commands."
    )

    await update.message.reply_text(
        welcome_message, parse_mode="Markdown", reply_markup=reply_markup
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command - show available commands"""
    help_text = (
        "📚 *Available Commands:*\n\n"
        "• /start - Start the bot and see options\n"
        "• /help - Show this help message\n"
        "• /courses - View all available courses\n"
        "• /register - Start course registration\n"
        "• /myregistrations - View your registrations\n"
        "• /end - Exit query mode\n\n"
        "💡 *Tips:*\n"
        "- Type / to see command suggestions\n"
        "- Use /courses to see all courses with details\n"
        "- Use /register to start registration\n"
        "- Use /myregistrations to view all your course registrations\n"
        "- If you've registered before, you can reuse your name & address"
    )

    await update.message.reply_text(help_text, parse_mode="Markdown")


async def courses_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /courses command - show all courses with View Details buttons"""
    courses = await get_courses()

    if not courses:
        await update.message.reply_text(
            "📚 No courses available yet.", parse_mode="Markdown"
        )
        return

    courses_text = "📚 *Available Courses:*\n\n"

    for i, course in enumerate(courses, 1):
        course_type = course.get("course_type", "recorded")
        type_emoji = "🔴" if course_type == "live" else "📼"
        type_text = "Live" if course_type == "live" else "Recorded"

        courses_text += f"{i}. {type_emoji} *{course['title']}*\n"
        courses_text += f"   📝 {course.get('description', 'No description')[:80]}...\n"
        courses_text += f"   💰 Price: ₹{course.get('fee', 0)}\n"
        courses_text += f"   🎯 Type: {type_text}\n"

        if course_type == "live":
            if course.get("start_date"):
                courses_text += f"   📅 Start: {course['start_date']}"
                if course.get("start_time"):
                    courses_text += f" at {course['start_time']}"
                courses_text += "\n"
            if course.get("sessions"):
                courses_text += f"   📊 {course['sessions']} sessions"
                if course.get("duration"):
                    courses_text += (
                        f", {format_duration_hours(course['duration'])} each"
                    )
                courses_text += "\n"

        courses_text += f"   👥 {course.get('registration_count', 0)} enrolled\n\n"

    courses_text += "\n👇 *Tap a course below to view details and register:*"

    keyboard = []
    for course in courses:
        fee = course.get('fee', 0)
        keyboard.append([
            InlineKeyboardButton(
                f"📖 {course['title']} - ₹{fee}",
                callback_data=f"course_view_{course['_id']}"
            )
        ])

    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        courses_text, parse_mode="Markdown", reply_markup=reply_markup
    )


async def myregistrations_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /myregistrations command - show all user's registrations"""
    user_id = update.effective_user.id
    registrations = await get_registrations_by_telegram_id(user_id)

    if not registrations:
        await update.message.reply_text(
            "📋 *You haven't registered for any course yet.*\n\n"
            "Use /register to start your registration.",
            parse_mode="Markdown",
        )
        return

    status_emoji = {
        "pending": "⏳",
        "approved": "✅",
        "rejected": "❌",
    }

    lines = ["📋 *Your Registrations:*\n"]
    for i, reg in enumerate(registrations, 1):
        status = reg.get("status", "unknown")
        emoji = status_emoji.get(status, "❓")
        course_title = reg.get("course_title", "Unknown course")
        amount = reg.get("amount", 0)
        mobile = reg.get("mobile", "")
        rejection_reason = reg.get("rejection_reason")
        created_at = reg.get("created_at")
        date_str = ""
        if created_at:
            if isinstance(created_at, datetime):
                date_str = created_at.strftime("%d %b %Y")
            else:
                date_str = str(created_at)[:10]

        lines.append(f"{i}. {emoji} *{course_title}*")
        lines.append(f"   💰 Amount: ₹{amount}")
        lines.append(f"   📊 Status: {status.capitalize()}")
        if mobile:
            lines.append(f"   📱 Mobile: {mobile}")
        if rejection_reason:
            lines.append(f"   ❌ Reason: {rejection_reason}")
        if date_str:
            lines.append(f"   📅 Date: {date_str}")
        lines.append("")

    result = "\n".join(lines)
    await update.message.reply_text(result, parse_mode="Markdown")


async def course_view_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle course view callback - show course details with Proceed to Pay and Back buttons"""
    query = update.callback_query
    data = query.data

    await query.answer()

    if data.startswith("course_view_"):
        course_id = data.replace("course_view_", "")
        course = await get_course_by_id(course_id)

        if not course:
            await query.edit_message_text(
                "❌ Course not found.", parse_mode="Markdown"
            )
            return

        course_type = course.get("course_type", "recorded")
        type_emoji = "🔴" if course_type == "live" else "📼"
        type_text = "Live" if course_type == "live" else "Recorded"

        fee = course.get('fee', 0)
        description = course.get('description', 'No description available.')

        course_details = (
            f"{type_emoji} *{course['title']}*\n\n"
            f"📝 *Description:*\n{description}\n\n"
            f"💰 *Price:* ₹{fee}\n"
            f"🎯 *Type:* {type_text}\n"
        )

        if course_type == "live":
            if course.get("start_date"):
                course_details += f"📅 *Start Date:* {course['start_date']}\n"
            if course.get("start_time"):
                course_details += f"⏰ *Time:* {course['start_time']}\n"
            if course.get("sessions"):
                course_details += f"📊 *Sessions:* {course['sessions']}\n"
            if course.get("duration"):
                course_details += f"⏱️ *Duration:* {format_duration_hours(course['duration'])} per session\n"
        else:
            if course.get("total_videos"):
                course_details += f"🎬 *Total Videos:* {course['total_videos']}\n"
            if course.get("duration"):
                course_details += f"⏱️ *Total Duration:* {format_duration_hours(course['duration'])}\n"

        course_details += f"\n👥 *Enrolled:* {course.get('registration_count', 0)} students"

        keyboard = [
            [InlineKeyboardButton("💳 Proceed to Pay", callback_data=f"course_register_{course_id}")],
            [InlineKeyboardButton("🔙 Back to Courses", callback_data="back_to_courses")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(
            course_details,
            parse_mode="Markdown",
            reply_markup=reply_markup
        )


async def back_to_courses_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle back to courses callback"""
    query = update.callback_query
    await query.answer()

    courses = await get_courses()

    if not courses:
        await query.edit_message_text(
            "📚 No courses available yet.", parse_mode="Markdown"
        )
        return

    courses_text = "📚 *Available Courses:*\n\n"
    for i, course in enumerate(courses, 1):
        courses_text += f"{i}. *{course['title']}* - ₹{course.get('fee', 0)}\n"
    courses_text += "\n👇 *Tap a course below to view details and register:*"

    keyboard = []
    for course in courses:
        keyboard.append([
            InlineKeyboardButton(
                f"📖 {course['title']} - ₹{course.get('fee', 0)}",
                callback_data=f"course_view_{course['_id']}"
            )
        ])

    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        courses_text, parse_mode="Markdown", reply_markup=reply_markup
    )
