import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime
import database
from routers.auth import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


@router.get("")
async def get_inbox(current_user: dict = Depends(get_current_user)):
    """Get user's inbox messages"""
    user_id = current_user.get("id")
    messages = await database.get_inbox_messages(user_id)
    return messages


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread messages"""
    user_id = current_user.get("id")
    count = await database.get_unread_count(user_id)
    return {"unread_count": count}


@router.put("/{message_id}/read")
async def mark_as_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark message as read"""
    user_id = current_user.get("id")
    result = await database.mark_inbox_read(message_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_as_read(current_user: dict = Depends(get_current_user)):
    """Mark all messages as read"""
    user_id = current_user.get("id")
    await database.mark_all_inbox_read(user_id)
    return {"message": "All messages marked as read"}


@router.delete("/{message_id}")
async def delete_message(
    message_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a message"""
    user_id = current_user.get("id")
    result = await database.delete_inbox_message(message_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}
