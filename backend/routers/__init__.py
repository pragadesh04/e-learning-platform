import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from routers.admin import router as admin_router
from routers.webhooks import router as webhooks_router
from routers.auth import router as auth_router
from routers.courses import router as courses_router
from routers.registrations import router as registrations_router

__all__ = ["admin_router", "webhooks_router", "auth_router", "courses_router", "registrations_router"]
