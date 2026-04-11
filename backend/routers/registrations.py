import sys
import os
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
import logging
from datetime import datetime

import database
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/web", tags=["web-registrations"])


@router.get("")
async def list_registrations(
    current_user: dict = Depends(get_current_user),
    status: str = None,
    course: str = None,
    sort_by: str = None,
    order: str = "desc",
):
    """List all registrations (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    return await database.get_registrations(status, course, sort_by, order)


@router.get("/user")
async def get_my_registrations(current_user: dict = Depends(get_current_user)):
    """Get current user's registrations"""
    user_id = current_user["id"]
    registrations = await database.get_user_registrations(user_id)
    return registrations


@router.post("")
async def create_registration(
    course_id: str = Form(...),
    name: str = Form(...),
    city: str = Form(...),
    access_duration_type: str = Form(...),
    screenshot: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Register for a course (web registration)"""
    course = await database.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not course.get("registration_open", True):
        raise HTTPException(
            status_code=400, detail="Registration is closed for this course"
        )

    valid_durations = ["three_months", "six_months", "lifetime"]
    if access_duration_type not in valid_durations:
        raise HTTPException(
            status_code=400, detail="Invalid access duration type"
        )

    access_durations = course.get("access_durations", {})
    amount = access_durations.get(access_duration_type, 0)

    if amount <= 0:
        raise HTTPException(
            status_code=400, detail="Selected access duration is not available"
        )

    user_id = current_user["id"]
    user_mobile = current_user.get("mobile", "")

    existing_reg = await database.get_user_registrations(user_id)
    for reg in existing_reg:
        if reg.get("course_id") == course_id and reg.get("status") in [
            "pending",
            "approved",
        ]:
            raise HTTPException(
                status_code=400, detail="Already registered for this course"
            )

    screenshot_url = None
    screenshot_public_id = None
    screenshot_uploaded_at = None

    try:
        from utils.cloud_upload import upload_screenshot

        upload_result = upload_screenshot(screenshot.file)
        screenshot_url = upload_result["url"]
        screenshot_public_id = upload_result["public_id"]
        screenshot_uploaded_at = upload_result["uploaded_at"]
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")

    registration_data = {
        "user_id": user_id,
        "name": name,
        "address": city,
        "mobile": user_mobile,
        "course_id": course_id,
        "course_title": course.get("title"),
        "amount": amount,
        "access_duration_type": access_duration_type,
        "screenshot_url": screenshot_url,
        "screenshot_public_id": screenshot_public_id,
        "screenshot_uploaded_at": screenshot_uploaded_at,
        "screenshot_expired": False,
        "status": "pending",
        "source": "web",
    }

    registration = await database.create_registration(registration_data)

    return {
        "message": "Registration submitted successfully. Awaiting approval.",
        "registration": registration,
    }


@router.put("/{registration_id}/approve")
async def approve_registration(
    registration_id: str, current_user: dict = Depends(get_current_user)
):
    """Approve a registration (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    reg = await database.get_registration_by_id(registration_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    await database.update_registration_status(registration_id, "approved")
    await database.increment_course_count(registration_id)

    if reg.get("user_id"):
        duration_type = reg.get("access_duration_type", "lifetime")
        await database.add_course_access(reg["user_id"], reg["course_id"], duration_type)

    return {"message": "Registration approved"}


@router.put("/{registration_id}/reject")
async def reject_registration(
    registration_id: str,
    current_user: dict = Depends(get_current_user),
    reason: str = None,
):
    """Reject a registration (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    await database.update_registration_status(registration_id, "rejected", reason)
    return {"message": "Registration rejected"}
