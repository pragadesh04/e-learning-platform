import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from main import app
from fastapi import FastAPI
import uvicorn

if __name__ == "__main__":
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8000,
        loop="asyncio",
        timeout_keep_alive=5,
    )
    server = uvicorn.Server(config)
    asyncio.run(server.serve())
