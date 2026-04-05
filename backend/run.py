import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from main import app
import uvicorn
from settings import settings

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
