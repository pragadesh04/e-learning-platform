import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
import shutil
import logging
from datetime import datetime

import database
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/web", tags=["web-registrations"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "screenshots", "web")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("")
async def list_registrations(
    current_user: dict = Depends(get_current_user),
    status: str = None,
    course: str = None,
    sort_by: str = None,
    order: str = "desc"
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
    address: str = Form(...),
    mobile: str = Form(...),
    screenshot: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Register for a course (web registration)"""
    course = await database.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course.get("registration_open", True):
        raise HTTPException(status_code=400, detail="Registration is closed for this course")
    
    user_id = current_user["id"]
    
    # Check existing registration
    existing_reg = await database.get_user_registrations(user_id)
    for reg in existing_reg:
        if reg.get("course_id") == course_id and reg.get("status") in ["pending", "approved"]:
            raise HTTPException(status_code=400, detail="Already registered for this course")
    
    # Save screenshot
    screenshot_filename = None
    if screenshot:
        ext = screenshot.filename.split('.')[-1] if '.' in screenshot.filename else 'jpg'
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        screenshot_filename = f"{user_id}_{course_id}_{timestamp}.{ext}"
        screenshot_path = os.path.join(UPLOAD_DIR, screenshot_filename)
        
        with open(screenshot_path, "wb") as buffer:
            shutil.copyfileobj(screenshot.file, buffer)
    
    registration_data = {
        "user_id": user_id,
        "name": name,
        "address": address,
        "mobile": mobile,
        "course_id": course_id,
        "course_title": course.get("title"),
        "amount": course.get("fee", 0),
        "screenshot_url": f"/uploads/screenshots/web/{screenshot_filename}" if screenshot_filename else None,
        "status": "pending",
        "source": "web"
    }
    
    registration = await database.create_registration(registration_data)
    
    return {
        "message": "Registration submitted successfully. Awaiting approval.",
        "registration": registration
    }


@router.put("/{registration_id}/approve")
async def approve_registration(
    registration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve a registration (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await database.update_registration_status(registration_id, "approved")
    await database.increment_course_count(registration_id)
    
    # Add course access to user
    reg = await database.get_registration_by_id(registration_id)
    if reg and reg.get("user_id"):
        await database.add_course_access(reg["user_id"], reg["course_id"])
    
    return {"message": "Registration approved"}


@router.put("/{registration_id}/reject")
async def reject_registration(
    registration_id: str,
    current_user: dict = Depends(get_current_user),
    reason: str = None
):
    """Reject a registration (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await database.update_registration_status(registration_id, "rejected", reason)
    return {"message": "Registration rejected"}
