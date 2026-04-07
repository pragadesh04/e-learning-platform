import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import (
    connect_to_mongo,
    close_mongo_connection,
    initialize_default_config,
)
from routers import (
    admin_router,
    webhooks_router,
    auth_router,
    courses_router,
    registrations_router,
    inbox_router,
)
import logging
import uvicorn

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await initialize_default_config()
    yield
    await close_mongo_connection()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(webhooks_router)
app.include_router(auth_router)
app.include_router(courses_router)
app.include_router(registrations_router)
app.include_router(inbox_router)


@app.get("/")
async def root():
    return {"message": "Course Registration Bot API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8002)
