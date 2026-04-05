import sys
import os
import re
import httpx
import html

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
import bcrypt
from jose import jwt
from datetime import datetime, timedelta
import database
import models
from models import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    RegistrationResponse,
    StatsResponse,
    ConfigUpdate,
)
from utils.telegram import send_telegram_message
from settings import settings
import logging

router = APIRouter(prefix="/api", tags=["admin"])

SECRET_KEY = settings.admin_webhook_secret
ALGORITHM = "HS256"

security = HTTPBearer()


def decode_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    return await database.get_stats()


@router.get("/courses", response_model=List[CourseResponse])
async def list_courses():
    return await database.get_courses()


@router.get("/courses/{course_id}")
async def get_course(course_id: str):
    course = await database.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/courses", response_model=dict)
async def create_course(course: CourseCreate):
    course_dict = course.model_dump()
    if not course_dict.get("image_url"):
        course_dict["image_url"] = (
            f"https://placehold.co/400x200/transparent/white?text={course_dict['title'].replace(' ', '+')}&font=Poppins"
        )
    course_id = await database.create_course(course_dict)
    return {"id": course_id, "message": "Course created successfully"}


@router.put("/courses/{course_id}")
async def update_course(course_id: str, course: CourseUpdate):
    existing = await database.get_course_by_id(course_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = course.model_dump(exclude_unset=True)
    if update_data.get("image_url") == "":
        update_data["image_url"] = None
    await database.update_course(course_id, update_data)
    return {"message": "Course updated successfully"}


@router.delete("/courses/{course_id}")
async def delete_course(course_id: str):
    existing = await database.get_course_by_id(course_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")

    await database.delete_course(course_id)
    return {"message": "Course deleted successfully"}


@router.put("/courses/{course_id}/toggle-registration")
async def toggle_course_registration(course_id: str):
    """Toggle registration open/closed status for a course"""
    existing = await database.get_course_by_id(course_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")

    current_status = existing.get("registration_open", True)
    new_status = not current_status
    await database.update_course(course_id, {"registration_open": new_status})
    status_text = "opened" if new_status else "closed"
    return {
        "message": f"Registration {status_text} successfully",
        "registration_open": new_status,
    }


@router.get("/registrations", response_model=List[RegistrationResponse])
async def list_registrations(
    status: Optional[str] = None,
    course: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: Optional[str] = "desc",
):
    return await database.get_registrations(status, course, sort_by, order)


@router.get("/registrations/{registration_id}", response_model=RegistrationResponse)
async def get_registration(registration_id: str):
    reg = await database.get_registration_by_id(registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return reg


@router.put("/registrations/{registration_id}/approve")
async def approve_registration(registration_id: str):
    try:
        reg = await database.get_registration_by_id(registration_id)
        if not reg:
            raise HTTPException(status_code=404, detail="Registration not found")

        if reg.get("status") == "approved":
            raise HTTPException(status_code=400, detail="Registration already approved")

        await database.update_registration_status(registration_id, "approved")

        reg = await database.get_registration_by_id(registration_id)
        print(f"[DEBUG] Registration after update: {reg}")
        print(f"[DEBUG] telegram_id type: {type(reg.get('telegram_id'))}, value: {reg.get('telegram_id')}")

        if reg.get("course_id"):
            try:
                await database.increment_course_count(reg["course_id"])
            except Exception as e:
                print(f"[WARN] Failed to increment course count: {e}")

        course = None
        if reg.get("course_id"):
            course = await database.get_course_by_id(reg["course_id"])

        course_title = reg.get("course_title", "the course")
        telegram_id = reg.get("telegram_id")
        mobile = reg.get("mobile")

        user_created = False
        password_display = ""

        if mobile:
            existing_user = await database.get_user_by_mobile(mobile)
            if not existing_user:
                import random
                import string

                chars = string.ascii_letters + string.digits
                raw_password = "".join(random.choices(chars, k=8))
                password_with_hyphen = raw_password[:4] + "-" + raw_password[4:]
                password_display = password_with_hyphen.replace("-", " ")

                hashed = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt())
                user_data = {
                    "mobile": mobile,
                    "password_hash": hashed.decode("utf-8"),
                    "name": reg.get("name", "User"),
                    "is_admin": False,
                    "accessible_courses": [],
                }
                new_user = await database.create_user(user_data)
                user_created = True
                course_id_str = str(reg["course_id"]) if reg.get("course_id") else None
                print(f"[DEBUG] course_id_str: {course_id_str}, type: {type(course_id_str)}")
                if course_id_str:
                    await database.add_course_access(new_user["id"], course_id_str)
            else:
                password_display = "(existing account)"
                course_id_str = str(reg["course_id"]) if reg.get("course_id") else None
                if course_id_str:
                    await database.add_course_access(existing_user["id"], course_id_str)

        print(f"[DEBUG] About to notify admins for reg_id: {registration_id}")
        try:
            from utils.telegram import notify_all_admins
            user_name = reg.get("name", "Unknown")
            await notify_all_admins(registration_id, "approved", approver_name="Dashboard", user_name=user_name, course_title=course_title)
            print(f"[DEBUG] notify_all_admins completed")
        except Exception as e:
            print(f"[ERROR] notify_all_admins failed: {e}")

        if telegram_id:
            course_type = reg.get("course_type", "recorded")
            start_date = reg.get("start_date")
            start_time = reg.get("start_time")
            
            if course_type == "live":
                timing = ""
                if start_date:
                    timing = f"\n📅 Date: {start_date}"
                if start_time:
                    timing += f"\n⏰ Time: {start_time}"
                message = f"✅ *Your registration is approved!*\n\n📚 *Course:* {course_title}{timing}\n\n📎 We'll send you the meeting link 1 hour before the class starts.\n\nLogin to access your course."
            else:
                message = f"✅ *Your registration is approved!*\n\n📚 *Course:* {course_title}\n\n📱 *Login Credentials:*\nMobile: `{mobile}`\nPassword: `{password_display}`\n\nLogin to access your course."
            
            try:
                from utils.telegram import send_telegram_message
                await send_telegram_message(telegram_id, message)
            except Exception as e:
                print(f"[ERROR] Failed to send approval message to user: {e}")

        return {"message": "Registration approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Approve registration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/registrations/{registration_id}/reject")
async def reject_registration(registration_id: str, reason: str = None):
    reg = await database.get_registration_by_id(registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    if reg.get("status") == "rejected":
        raise HTTPException(status_code=400, detail="Registration already rejected")

    await database.update_registration_status(registration_id, "rejected", reason)

    user_name = reg.get("name", "Unknown")
    course_title = reg.get("course_title", "the course")

    from utils.telegram import notify_all_admins
    await notify_all_admins(registration_id, "rejected", reason=reason, approver_name="Dashboard", user_name=user_name, course_title=course_title)

    telegram_id = reg.get("telegram_id")
    if telegram_id:
        rejection_text = f"Reason: {reason}" if reason else "No reason provided."
        message = f"❌ *Your registration has been rejected.*\n\n📚 *Course:* {course_title}\n\n{rejection_text}"
        
        try:
            from utils.telegram import send_telegram_message
            await send_telegram_message(telegram_id, message)
        except Exception as e:
            print(f"[ERROR] Failed to send rejection message to user: {e}")

    return {"message": "Registration rejected"}


@router.get("/config/upi")
async def get_upi():
    value = await database.get_config("upi_id")
    return {"upi_id": value or "yourname@upi"}


@router.put("/config/upi")
async def update_upi(config: ConfigUpdate):
    await database.set_config("upi_id", config.value)
    return {"message": "UPI ID updated successfully"}


def extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        r"^([a-zA-Z0-9_-]{11})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


async def fetch_video_info(video_url: str) -> Optional[dict]:
    video_id = extract_video_id(video_url)
    if not video_id:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.youtube.com/oembed",
                params={
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "format": "json",
                },
                timeout=10,
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "video_url": video_url,
                    "title": data.get("title", "Untitled"),
                    "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg",
                }
    except Exception as e:
        logger.error(f"Error fetching video info: {e}")
    return None


@router.post("/courses/video-info")
async def get_video_info(urls: List[str]):
    results = []
    for url in urls:
        info = await fetch_video_info(url)
        if info:
            results.append(info)
        else:
            results.append({"video_url": url, "title": "Unknown", "thumbnail_url": ""})
    return results


@router.get("/user/courses")
async def get_user_courses(user_id: str = Depends(decode_token)):
    user = await database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    courses = await database.get_user_courses(user_id)
    return courses
