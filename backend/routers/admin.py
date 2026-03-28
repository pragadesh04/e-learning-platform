import sys
import os
import re
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
import bcrypt
import jwt
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
import logging

router = APIRouter(prefix="/api", tags=["admin"])

SECRET_KEY = os.getenv("ADMIN_WEBHOOK_SECRET", "your_secret_key_here")
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
    except jwt.InvalidTokenError:
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
    reg = await database.get_registration_by_id(registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    await database.update_registration_status(registration_id, "approved")

    if reg.get("course_id"):
        await database.increment_course_count(reg["course_id"])

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
            await database.add_course_access(new_user["id"], reg["course_id"])
        else:
            password_display = "(existing account)"
            await database.add_course_access(existing_user["id"], reg["course_id"])

    if telegram_id:
        course_type = course.get("course_type") if course else "recorded"
        start_date = course.get("start_date") if course else None
        start_time = course.get("start_time") if course else None

        if user_created:
            login_info = f"\n\n📱 Login Credentials:\nMobile: {mobile}\nPassword: {password_display}\n\nPlease login and access your course."
        else:
            login_info = f"\n\nYou can login with your existing credentials to access this course."

        if course_type == "live":
            timing = ""
            if start_date and start_time:
                timing = f"Class timing: {start_date} at {start_time}."
            elif start_time:
                timing = f"Class timing: {start_time}."
            message = f"✅ Your registration for <b>{course_title}</b> has been approved!{timing}\n\nWe will send you the class link 1 hour before the class starts.{login_info}"
        else:
            message = f"✅ Your registration for <b>{course_title}</b> has been approved!{login_info}"

        await send_telegram_message(telegram_id, message)

    return {"message": "Registration approved successfully"}


@router.put("/registrations/{registration_id}/reject")
async def reject_registration(registration_id: str, reason: str = None):
    reg = await database.get_registration_by_id(registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    await database.update_registration_status(registration_id, "rejected", reason)

    course_title = reg.get("course_title", "the course")
    telegram_id = reg.get("telegram_id")

    if telegram_id:
        rejection_text = f"Reason: {reason}" if reason else "No reason provided."
        message = f"❌ Your registration for <b>{course_title}</b> has been rejected.\n\n{rejection_text}"
        await send_telegram_message(telegram_id, message)

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


@router.get("/courses/{course_id}/videos")
async def get_course_videos(course_id: str, user_id: str = Depends(decode_token)):
    user = await database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    course_ids = user.get("accessible_courses", [])
    if course_id not in course_ids and not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Access denied")

    course = await database.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return course.get("videos", [])


@router.get("/user/courses")
async def get_user_courses(user_id: str = Depends(decode_token)):
    user = await database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    courses = await database.get_user_courses(user_id)
    return courses


@router.get("/user/registrations")
async def get_user_registrations(user_id: str = Depends(decode_token)):
    user = await database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    mobile = user.get("mobile")
    if not mobile:
        raise HTTPException(status_code=400, detail="User mobile not found")

    db = await database.get_database()
    registrations = []
    cursor = db.registrations.find({"mobile": mobile}).sort("created_at", -1)
    async for reg in cursor:
        reg["id"] = str(reg["_id"])
        reg.pop("_id", None)
        reg["course_id"] = str(reg["course_id"]) if reg.get("course_id") else None
        registrations.append(reg)
    return registrations
