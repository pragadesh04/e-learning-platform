import sys
import os
import asyncio
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from database import (
    connect_to_mongo,
    close_mongo_connection,
    initialize_default_config,
    initialize_admin_user,
)
from routers import webhooks_router, auth_router, admin_router, courses_router, registrations_router
from utils.cleanup import cleanup_expired_screenshots
from settings import settings

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)
logger.info("logging successfull")


async def daily_cleanup_task():
    """Run cleanup task daily at midnight"""
    while True:
        try:
            # Calculate time until next midnight
            now = datetime.now()
            next_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
            if now >= next_midnight:
                next_midnight = next_midnight.replace(day=next_midnight.day + 1)
            
            sleep_seconds = (next_midnight - now).total_seconds()
            logger.info(f"Next screenshot cleanup scheduled in {sleep_seconds/3600:.1f} hours")
            
            await asyncio.sleep(sleep_seconds)
            
            # Run cleanup
            logger.info("Running daily screenshot cleanup...")
            await cleanup_expired_screenshots(days=30)
            logger.info("Screenshot cleanup completed")
            
        except Exception as e:
            logger.error(f"Cleanup task error: {e}")
            await asyncio.sleep(3600)  # Retry after 1 hour on error


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await initialize_default_config()
    await initialize_admin_user()
    
    # Start background cleanup task
    cleanup_task = asyncio.create_task(daily_cleanup_task())
    
    yield
    
    # Cleanup on shutdown
    cleanup_task.cancel()
    await close_mongo_connection()


app = FastAPI(
    title="Course Registration Bot API",
    description="Backend API for Telegram bot and Admin Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory (screenshots, etc.)
upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
print(f"[DEBUG] Upload directory: {upload_dir}")
print(f"[DEBUG] Exists: {os.path.exists(upload_dir)}")
if os.path.exists(upload_dir):
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
else:
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(webhooks_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(courses_router)
app.include_router(registrations_router)


@app.get("/")
async def root():
    return {"message": "Course Registration Bot API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
