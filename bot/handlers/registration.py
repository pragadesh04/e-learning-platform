from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from bot.database import (
    get_courses,
    get_course_by_id,
    get_latest_user_info,
    get_registered_course_titles,
)


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


REGISTRATION_STEPS = {
    "name": "Enter your FULL NAME:",
    "address": "Enter your ADDRESS:",
    "mobile": "Enter your MOBILE NUMBER:",
    "course": "Select a course:",
    "payment": "Payment",
}


async def register_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle register callback - start registration flow"""
    query = update.callback_query
    await query.answer()

    user_id = update.effective_user.id
    existing_info = await get_latest_user_info(user_id)

    if existing_info and existing_info.get("name") and existing_info.get("address"):
        keyboard = [
            [
                InlineKeyboardButton(
                    "✅ Use Same Details", callback_data="use_same_details_yes"
                ),
                InlineKeyboardButton(
                    "✏️ Enter New Details", callback_data="use_same_details_no"
                ),
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        mobile_text = (
            f"\n• Mobile: *{existing_info['mobile']}*"
            if existing_info.get("mobile")
            else ""
        )
        await query.edit_message_text(
            text=(
                f"📝 *Registration Started!*\n\n"
                f"We found your previous registration details:\n"
                f"• Name: *{existing_info['name']}*\n"
                f"• Address: *{existing_info['address']}*\n"
                f"{mobile_text}\n\n"
                f"Would you like to use the same details?"
            ),
            parse_mode="Markdown",
            reply_markup=reply_markup,
        )
    else:
        context.user_data["in_registration"] = True
        context.user_data["in_query_mode"] = False
        context.user_data["registration_step"] = "name"
        context.user_data["use_same_details"] = False

        await query.edit_message_text(
            text="📝 *Registration Started!*\n\n" + REGISTRATION_STEPS["name"],
            parse_mode="Markdown",
        )


async def use_same_details_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle use same details confirmation"""
    query = update.callback_query
    data = query.data
    await query.answer()

    user_id = update.effective_user.id
    existing_info = await get_latest_user_info(user_id)

    if data == "use_same_details_yes" and existing_info:
        context.user_data["in_registration"] = True
        context.user_data["in_query_mode"] = False
        context.user_data["reg_name"] = existing_info["name"]
        context.user_data["reg_address"] = existing_info["address"]
        context.user_data["reg_mobile"] = existing_info.get("mobile", "")
        context.user_data["reg_telegram_id"] = user_id
        context.user_data["use_same_details"] = True
        context.user_data["registration_step"] = "course"

        details_text = f"✅ *Using same details:*\n• Name: *{existing_info['name']}*\n• Address: *{existing_info['address']}*\n"
        if existing_info.get("mobile"):
            details_text += f"\n• Mobile: *{existing_info['mobile']}*"

        await query.edit_message_text(
            text=f"{details_text}\n\n📚 *{REGISTRATION_STEPS['course']}*\n\nSelect a course to continue.",
            parse_mode="Markdown",
        )
        await show_course_selection(update, context)
    else:
        context.user_data["in_registration"] = True
        context.user_data["in_query_mode"] = False
        context.user_data["registration_step"] = "name"
        context.user_data["use_same_details"] = False

        await query.edit_message_text(
            text="📝 *Registration Started!*\n\n" + REGISTRATION_STEPS["name"],
            parse_mode="Markdown",
        )


async def handle_registration_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle registration input based on current step"""
    if not context.user_data.get("in_registration"):
        return None

    step = context.user_data.get("registration_step")
    text = update.message.text.strip()

    if step == "name":
        context.user_data["reg_name"] = text
        context.user_data["registration_step"] = "address"
        await update.message.reply_text(
            f"✅ Name saved: *{text}*\n\n" + REGISTRATION_STEPS["address"],
            parse_mode="Markdown",
        )
        return True

    elif step == "address":
        context.user_data["reg_address"] = text
        context.user_data["registration_step"] = "mobile"
        await update.message.reply_text(
            f"✅ Address saved: *{text}*\n\n" + REGISTRATION_STEPS["mobile"],
            parse_mode="Markdown",
        )
        return True

    elif step == "mobile":
        context.user_data["reg_mobile"] = text
        context.user_data["reg_telegram_id"] = update.effective_user.id
        context.user_data["registration_step"] = "course"
        await show_course_selection(update, context)
        return True

    elif step == "course":
        return await handle_course_selection(update, context, text)

    return None


async def show_course_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show course selection with top 5 and 'See All' option, filtering already registered courses"""
    courses = await get_courses()

    telegram_id = context.user_data.get("reg_telegram_id")
    if telegram_id:
        registered_titles = await get_registered_course_titles(telegram_id)
        courses = [c for c in courses if c.get("title") not in registered_titles]

    if not courses:
        if update.callback_query:
            await update.callback_query.edit_message_text(
                text="📚 *No courses available for registration.*\n\nAll courses are either already registered or registration is closed.",
                parse_mode="Markdown",
            )
        else:
            await update.message.reply_text(
                text="📚 *No courses available for registration.*\n\nAll courses are either already registered or registration is closed.",
                parse_mode="Markdown",
            )
        return

    keyboard = []

    top_5 = courses[:5]
    for i, course in enumerate(top_5):
        keyboard.append(
            [
                InlineKeyboardButton(
                    f"{i + 1}. {course['title']} (₹{course['fee']})",
                    callback_data=f"course_select_{course['_id']}",
                )
            ]
        )

    if len(courses) > 5:
        keyboard.append(
            [
                InlineKeyboardButton(
                    "📋 See All Courses",
                    callback_data="course_show_all",
                )
            ]
        )

    reply_markup = InlineKeyboardMarkup(keyboard)

    header = (
        f"✅ Details saved!\n\n"
        f"📚 *{REGISTRATION_STEPS['course']}*\n\n"
        f"*Available Courses:*\n"
        f"(Enter the number to select)\n\n"
    )

    if update.callback_query:
        await update.callback_query.edit_message_text(
            header, parse_mode="Markdown", reply_markup=reply_markup
        )
    else:
        await update.message.reply_text(
            header, parse_mode="Markdown", reply_markup=reply_markup
        )


async def show_all_courses(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show all courses, filtering already registered courses"""
    query = update.callback_query
    await query.answer()

    courses = await get_courses()

    telegram_id = context.user_data.get("reg_telegram_id")
    if telegram_id:
        registered_titles = await get_registered_course_titles(telegram_id)
        courses = [c for c in courses if c.get("title") not in registered_titles]

    keyboard = []
    for i, course in enumerate(courses):
        course_type = course.get("course_type", "recorded")
        type_emoji = "🔴" if course_type == "live" else "📼"

        button_text = f"{i + 1}. {type_emoji} {course['title']} (₹{course['fee']})"

        keyboard.append(
            [
                InlineKeyboardButton(
                    button_text,
                    callback_data=f"course_select_{course['_id']}",
                )
            ]
        )

    keyboard.append(
        [InlineKeyboardButton("🔙 Back to Top 5", callback_data="course_back_top5")]
    )

    reply_markup = InlineKeyboardMarkup(keyboard)

    course_list = "\n".join(
        [
            f"{i + 1}. {('🔴 ' if c.get('course_type') == 'live' else '📼 ')}{c['title']} - ₹{c['fee']}"
            f"{' (' + format_duration_hours(c['duration']) + ')' if c.get('duration') and c.get('course_type') == 'live' else ''}"
            f" ({c['registration_count']} registered)"
            for i, c in enumerate(courses)
        ]
    )

    await query.edit_message_text(
        f"📚 *All Courses:*\n\n{course_list}\n\n*Select a course:*",
        parse_mode="Markdown",
        reply_markup=reply_markup,
    )


async def handle_course_selection(
    update: Update, context: ContextTypes.DEFAULT_TYPE, text: str
):
    """Handle course selection by number"""
    courses = await get_courses()

    try:
        index = int(text) - 1
        if 0 <= index < len(courses):
            course = courses[index]
            context.user_data["selected_course"] = course
            
            course_type = course.get("course_type", "recorded")
            if course_type == "live":
                await show_live_course_timing(update, course, context)
            else:
                context.user_data["registration_step"] = "payment"
                from handlers.payment import start_payment_flow
                await start_payment_flow(update, context)
            return True
        else:
            if update.callback_query:
                await update.callback_query.message.reply_text(
                    "❌ Invalid selection. Please enter a valid number."
                )
            else:
                await update.message.reply_text(
                    "❌ Invalid selection. Please enter a valid number."
                )
            return True
    except ValueError:
        if update.callback_query:
            await update.callback_query.message.reply_text("❌ Please enter a number.")
        else:
            await update.message.reply_text("❌ Please enter a number.")
        return True


async def show_live_course_timing(update, course, context):
    """Show live course timing info and proceed to payment"""
    course_type = course.get("course_type", "recorded")
    
    timing_text = ""
    if course_type == "live":
        if course.get("start_date"):
            timing_text = f"\n\n📅 *Class Schedule:*\n   📅 Date: {course['start_date']}"
            if course.get("start_time"):
                timing_text += f"\n   ⏰ Time: {course['start_time']}"
            if course.get("sessions"):
                timing_text += f"\n   📊 Sessions: {course['sessions']}"
            if course.get("duration"):
                timing_text += f"\n   ⏱️ Duration: {format_duration_hours(course['duration'])} per session"
    
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    
    keyboard = [
        [InlineKeyboardButton("💳 Proceed to Payment", callback_data="proceed_payment")],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel_registration")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = f"✅ *Course Selected:* {course['title']}\n\n💰 *Fee:* ₹{course.get('fee', 0)}{timing_text}\n\nClick below to proceed with payment."
    
    if update.callback_query:
        await update.callback_query.edit_message_text(message, parse_mode="Markdown", reply_markup=reply_markup)
    else:
        await update.message.reply_text(message, parse_mode="Markdown", reply_markup=reply_markup)
    
    return True


async def course_select_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle course selection via inline button"""
    query = update.callback_query
    data = query.data

    await query.answer()

    if data == "course_show_all":
        await show_all_courses(update, context)
        return

    if data == "course_back_top5":
        context.user_data["registration_step"] = "course"
        await show_course_selection(update, context)
        return
    
    if data == "proceed_payment":
        course = context.user_data.get("selected_course")
        if course:
            from handlers.payment import start_payment_flow
            await start_payment_flow(update, context)
        return
    
    if data == "cancel_registration":
        context.user_data["in_registration"] = False
        context.user_data["in_query_mode"] = False
        context.user_data["registration_step"] = None
        context.user_data["selected_course"] = None
        
        await query.edit_message_text(
            "❌ *Registration Cancelled*\n\nType /register to start again.",
            parse_mode="Markdown"
        )
        return

    if data.startswith("course_select_") or data.startswith("course_register_"):
        course_id = data.replace("course_select_", "").replace("course_register_", "")
        course = await get_course_by_id(course_id)

        if course:
            context.user_data["selected_course"] = course
            context.user_data["in_registration"] = True
            context.user_data["in_query_mode"] = False
            
            course_type = course.get("course_type", "recorded")
            if course_type == "live":
                await show_live_course_timing(update, course, context)
            else:
                context.user_data["registration_step"] = "payment"
                from handlers.payment import start_payment_flow
                await start_payment_flow(update, context)
