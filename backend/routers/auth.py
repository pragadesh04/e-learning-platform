import sys
import os
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
import base64

import database
import models
from settings import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = settings.admin_webhook_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer()


def create_access_token(data: dict):
    import jwt
    print(jwt.__file__)
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        import jwt as pyjwt

        token = credentials.credentials
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Token decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await database.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register", response_model=models.LoginResponse)
async def register(
    name: str = Form(...),
    mobile: str = Form(...),
    password: str = Form(...),
):
    logger.info(f"Registration attempt for mobile: {mobile}")
    try:
        existing_user = await database.get_user_by_mobile(mobile)
        if existing_user:
            raise HTTPException(status_code=400, detail="Mobile number already registered")

        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        
        user_data = {
            "mobile": mobile,
            "password_hash": hashed.decode("utf-8"),
            "name": name,
            "is_admin": False,
            "accessible_courses": [],
        }
        
        user = await database.create_user(user_data)
        
        access_token = create_access_token({"sub": user["id"]})
        logger.info(f"Registration successful for: {mobile}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "mobile": user["mobile"],
                "name": user["name"],
                "is_admin": user.get("is_admin", False),
                "accessible_courses": user.get("accessible_courses", []),
                "created_at": user.get("created_at"),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/login", response_model=models.LoginResponse)
async def login(request: models.LoginRequest):
    logger.info(f"Login attempt for mobile: {request.mobile}")
    try:
        user = await database.get_user_by_mobile(request.mobile)
        logger.info(f"User found: {user is not None}, user: {user}")
        if not user:
            raise HTTPException(status_code=401, detail="Invalid mobile or password")

        if not bcrypt.checkpw(
            request.password.encode("utf-8"), user["password_hash"].encode("utf-8")
        ):
            raise HTTPException(status_code=401, detail="Invalid mobile or password")

        access_token = create_access_token({"sub": user["id"]})
        logger.info(f"Login successful for: {request.mobile}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "mobile": user["mobile"],
                "name": user["name"],
                "is_admin": user.get("is_admin", False),
                "accessible_courses": user.get("accessible_courses", []),
                "created_at": user.get("created_at"),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/me", response_model=models.UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "mobile": current_user["mobile"],
        "name": current_user["name"],
        "is_admin": current_user.get("is_admin", False),
        "accessible_courses": current_user.get("accessible_courses", []),
        "created_at": current_user.get("created_at"),
    }
