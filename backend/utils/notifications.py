import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import database

logger = logging.getLogger(__name__)


async def notify_new_course(course_id: str, course_title: str):
    """Notify users when a new course is launched"""
    try:
        # Check if AI is available
        use_ai = True
        try:
            from langchain_mistralai import ChatMistralAI
            import os

            if not os.getenv("MISTRAL_API_KEY"):
                use_ai = False
        except ImportError:
            use_ai = False

        all_users = await database.get_all_users()
        if not all_users:
            return

        # Get users with at least one approved registration
        users_to_notify = []
        for user in all_users:
            if user.get("is_admin", False):
                continue
            user_id = user.get("id")
            registrations = await database.get_user_registrations(user_id)
            approved_regs = [r for r in registrations if r.get("status") == "approved"]
            if len(approved_regs) > 0:
                users_to_notify.append(
                    {
                        "user": user,
                        "registered_courses": [
                            r.get("course_title", "") for r in approved_regs
                        ],
                    }
                )

        if not users_to_notify:
            logger.info("No users with registrations to notify")
            return

        logger.info(
            f"Notifying {len(users_to_notify)} users about new course: {course_title}"
        )

        # If AI not available, notify ALL users with registrations
        if not use_ai:
            for user_data in users_to_notify:
                user_id = user_data["user"].get("id")
                await database.create_inbox_message(
                    {
                        "user_id": user_id,
                        "type": "new_course",
                        "title": "New Course Launched!",
                        "message": f"{course_title} - Check out our latest course!",
                        "course_id": course_id,
                    }
                )
            logger.info(f"Notified {len(users_to_notify)} users without AI")
            return

        # Continue with AI-based relevance check
        llm = ChatMistralAI(
            model="mistral-large-latest",
            api_key=os.getenv("MISTRAL_API_KEY"),
            temperature=0.2,
        )

        for user_data in users_to_notify:
            user = user_data["user"]
            user_id = user.get("id")
            registered_titles = user_data["registered_courses"]

            # Use AI to check relevance
            registered_text = (
                ", ".join(registered_titles) if registered_titles else "none"
            )

            prompt = f"""A new course "{course_title}" has been launched.

User's registered courses: {registered_text}

Is this new course relevant to the user's registered courses? Consider:
1. Topic similarity (same subject/topic area)
2. Skill level progression (beginner to advanced)
3. Complementary courses

Respond with ONLY "yes" or "no"."""

            try:
                response = llm.invoke(prompt)
                is_relevant = response.content.strip().lower().startswith("yes")

                if is_relevant:
                    await database.create_inbox_message(
                        {
                            "user_id": user_id,
                            "type": "new_course",
                            "title": "New Course Launched!",
                            "message": f"{course_title} - Based on your registered courses, we think you might be interested!",
                            "course_id": course_id,
                        }
                    )
                    logger.info(
                        f"Notified user {user_id} about new course {course_title}"
                    )
            except Exception as e:
                logger.error(f"AI relevance check failed for user {user_id}: {e}")
                continue

    except Exception as e:
        logger.error(f"New course notification error: {e}")


async def notify_new_video(course_id: str, course_title: str):
    """Notify all approved users when a new video is added to a course"""
    try:
        from bson import ObjectId

        # Get all registrations with this course_id and status approved
        db = await database.get_database()
        registrations = await db.registrations.find(
            {"course_id": ObjectId(course_id), "status": "approved"}
        ).to_list(length=1000)

        notified_count = 0
        for reg in registrations:
            user_id = reg.get("user_id")
            if user_id:
                await database.create_inbox_message(
                    {
                        "user_id": user_id,
                        "type": "new_video",
                        "title": "New Video Added!",
                        "message": f"A new video has been added to {course_title}. Start watching now!",
                        "course_id": course_id,
                    }
                )
                notified_count += 1

        logger.info(
            f"Notified {notified_count} users about new video in {course_title}"
        )

    except Exception as e:
        logger.error(f"New video notification error: {e}")
