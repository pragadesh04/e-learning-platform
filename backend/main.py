import sys
import os

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
from routers import webhooks_router, auth_router, admin_router

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)
logger.info("logging successfull")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await initialize_default_config()
    await initialize_admin_user()
    yield
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

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if os.path.exists(upload_dir):
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(webhooks_router)
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/")
async def root():
    return {"message": "Course Registration Bot API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
