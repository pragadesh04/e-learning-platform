from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import os
import httpx

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from settings import settings

router = APIRouter(prefix="/webhook", tags=["webhooks"])


class WebhookRegistrationPending(BaseModel):
    telegram_id: int
    name: str
    course_title: str


async def notify_admin_new_registration(data: dict):
    if not settings.bot_token or not settings.admin_chat_id:
        return

    message = (
        f"🆕 *New Registration Pending*\n\n"
        f"👤 Name: {data.get('name', 'N/A')}\n"
        f"📚 Course: {data.get('course_title', 'N/A')}\n"
        f"🆔 Telegram ID: {data.get('telegram_id', 'N/A')}"
    )

    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.bot_token}/sendMessage",
            json={"chat_id": settings.admin_chat_id, "text": message, "parse_mode": "Markdown"},
        )


@router.post("/registration-pending")
async def registration_pending_webhook(data: WebhookRegistrationPending):
    await notify_admin_new_registration(data.model_dump())
    return {"status": "ok"}


async def notify_user_approval(telegram_id: int, course_title: str):
    if not settings.bot_token:
        return

    message = (
        f"✅ *Congratulations!*\n\n"
        f"Your registration for *{course_title}* has been approved!\n"
        f"You are now officially registered."
    )

    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.bot_token}/sendMessage",
            json={"chat_id": telegram_id, "text": message, "parse_mode": "Markdown"},
        )


@router.post("/notify-approval")
async def notify_approval_webhook(telegram_id: int, course_title: str):
    await notify_user_approval(telegram_id, course_title)
    return {"status": "ok"}
