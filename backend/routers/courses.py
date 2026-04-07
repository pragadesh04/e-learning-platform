import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from typing import Optional
import logging

import database
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/course-post-login", tags=["courses"])


@router.get("/available")
async def get_available_courses(current_user: dict = Depends(get_current_user)):
    """Get courses with registration open"""
    courses = await database.get_available_courses()
    return courses


@router.get("/popular")
async def get_popular_courses(
    current_user: dict = Depends(get_current_user), limit: int = Query(10, ge=1, le=50)
):
    """Get popular courses by registration count"""
    courses = await database.get_popular_courses(limit)
    return courses


@router.get("/recommendations")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    """Get AI-powered recommendations"""
    from langchain_mistralai import ChatMistralAI
    from langchain_core.prompts import ChatPromptTemplate
    import os

    user_id = current_user["id"]
    user_registrations = await database.get_user_registrations(user_id)
    available_courses = await database.get_available_courses()

    registered_course_titles = []
    if user_registrations:
        for reg in user_registrations:
            if reg.get("status") in ["approved", "pending"]:
                registered_course_titles.append(reg.get("course_title", ""))

    if not registered_course_titles:
        popular_courses = await database.get_popular_courses(6)
        return {"type": "popular", "courses": popular_courses}

    available_courses_text = "\n".join(
        [
            f"- {c.get('title', 'Untitled')}: {c.get('description', 'No description')} (₹{c.get('fee', 0)})"
            for c in available_courses
        ]
    )

    registered_text = "\n".join([f"- {title}" for title in registered_course_titles])

    prompt = f"""Based on the user's registered courses:
{registered_text}

Available courses:
{available_courses_text}

The user has registered for some courses. Recommend 6 most relevant courses from the available courses list that would be beneficial for them based on their interests and registered courses. 

Return your response as a JSON array with exactly 6 course titles:
["Course Title 1", "Course Title 2", "Course Title 3", "Course Title 4", "Course Title 5", "Course Title 6"]

Only include course titles that exist in the available courses list. If there are fewer than 6 available courses, return all of them."""

    try:
        llm = ChatMistralAI(
            model="mistral-large-latest",
            api_key=os.getenv("MISTRAL_API_KEY"),
            temperature=0.3,
        )

        prompt_template = ChatPromptTemplate.from_template("{prompt}")
        chain = prompt_template | llm

        response = chain.invoke({"prompt": prompt})
        content = response.content

        import json
        import re

        json_match = re.search(r"\[.*\]", content, re.DOTALL)
        if json_match:
            recommended_titles = json.loads(json_match.group())
        else:
            lines = [
                line.strip().strip("-").strip('"').strip("'")
                for line in content.split("\n")
                if line.strip() and ("-" in line or '"' in line or "'" in line)
            ]
            recommended_titles = [
                title.strip().strip('"').strip("'") for title in lines[:6]
            ]

        recommended_courses = []
        for course in available_courses:
            if course.get("title") in recommended_titles:
                recommended_courses.append(course)

        for title in recommended_titles:
            if not any(c.get("title") == title for c in recommended_courses):
                for course in available_courses:
                    if course.get("title") == title:
                        recommended_courses.append(course)
                        break

        if len(recommended_courses) < 6:
            existing_ids = {c.get("id") for c in recommended_courses}
            for course in available_courses:
                if (
                    course.get("id") not in existing_ids
                    and len(recommended_courses) < 6
                ):
                    recommended_courses.append(course)

        return {"type": "ai_recommendations", "courses": recommended_courses[:6]}

    except Exception as e:
        logger.error(f"AI recommendation error: {str(e)}")
        popular_courses = await database.get_popular_courses(6)
        return {"type": "popular_fallback", "courses": popular_courses}


@router.get("/{course_id}/qr")
async def get_course_qr(course_id: str, current_user: dict = Depends(get_current_user)):
    """Get QR code for course payment"""
    course = await database.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    upi_id = await database.get_config("upi_id") or "yourname@upi"
    amount = course.get("fee", 0)

    from bot.utils.qr_generator import generate_qr_code

    qr_base64 = generate_qr_code(upi_id, amount)

    return {
        "course_id": course_id,
        "course_title": course.get("title"),
        "amount": amount,
        "upi_id": upi_id,
        "qr_code": f"data:image/png;base64,{qr_base64}",
    }


@router.get("/{course_id}/videos")
async def get_course_videos(
    course_id: str, current_user: dict = Depends(get_current_user)
):
    """Get course videos (requires course access)"""
    user = await database.get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    course_ids = user.get("accessible_courses", [])
    if course_id not in course_ids and not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Access denied")

    course = await database.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return course.get("videos", [])


@router.get("/search")
async def search_courses(
    q: str = Query("", description="Search query"),
    current_user: dict = Depends(get_current_user),
):
    """Search courses by title, description, or tags using regex"""
    if not q or len(q.strip()) < 2:
        return []

    search_term = q.strip()
    courses = await database.search_courses(search_term)
    return courses
