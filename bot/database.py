import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.database import Database
from dotenv import load_dotenv
import logging

from settings import settings

load_dotenv()

logger = logging.getLogger(__name__)


class MongoDB:
    client: AsyncIOMotorClient = None
    db: Database = None


db_instance = MongoDB()


async def connect_to_mongo():
    db_instance.client = AsyncIOMotorClient(settings.mongodb_uri)
    db_instance.db = db_instance.client[settings.mongodb_name]
    print(f"Connected to MongoDB - Database: {settings.mongodb_name}")


async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("MongoDB connection closed")


def get_database() -> Database:
    return db_instance.db


# Courses Collection
async def get_courses():
    db = get_database()
    courses = []
    cursor = db.courses.find({"registration_open": True}).sort("registration_count", -1)
    async for course in cursor:
        course["_id"] = str(course["_id"])
        courses.append(course)
    return courses


async def get_all_courses():
    """Get all courses including ones with registration closed (for admin/filtering)."""
    db = get_database()
    courses = []
    cursor = db.courses.find().sort("registration_count", -1)
    async for course in cursor:
        course["_id"] = str(course["_id"])
        courses.append(course)
    return courses


async def get_course_by_id(course_id: str):
    db = get_database()
    from bson import ObjectId

    course = await db.courses.find_one({"_id": ObjectId(course_id)})
    if course:
        course["_id"] = str(course["_id"])
    return course


async def create_course(course_data: dict):
    db = get_database()
    from datetime import datetime

    course_data["registration_count"] = 0
    course_data["created_at"] = datetime.utcnow()
    course_data["updated_at"] = datetime.utcnow()
    result = await db.courses.insert_one(course_data)
    return str(result.inserted_id)


async def update_course(course_id: str, update_data: dict):
    db = get_database()
    from bson import ObjectId
    from datetime import datetime

    update_data["updated_at"] = datetime.utcnow()
    await db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_data})


async def delete_course(course_id: str):
    db = get_database()
    from bson import ObjectId

    await db.courses.delete_one({"_id": ObjectId(course_id)})


async def increment_course_count(course_id: str):
    db = get_database()
    from bson import ObjectId

    await db.courses.update_one(
        {"_id": ObjectId(course_id)}, {"$inc": {"registration_count": 1}}
    )


# Registrations Collection
async def get_registrations(status: str = None):
    db = get_database()
    registrations = []
    query = {}
    if status:
        query["status"] = status
    cursor = db.registrations.find(query).sort("created_at", -1)
    async for reg in cursor:
        reg["_id"] = str(reg["_id"])
        reg["course_id"] = str(reg["course_id"]) if reg.get("course_id") else None
        logger.info(f"Registration: {reg}")
        registrations.append(reg)
    return registrations


async def get_registration_by_telegram_id(telegram_id: int):
    db = get_database()
    reg = await db.registrations.find_one({"telegram_id": telegram_id})
    if reg:
        reg["_id"] = str(reg["_id"])
        reg["course_id"] = str(reg["course_id"]) if reg.get("course_id") else None
    return reg


async def get_registrations_by_telegram_id(telegram_id: int):
    """Get ALL registrations for a user (supports multiple course registrations)."""
    db = get_database()
    registrations = []
    cursor = db.registrations.find({"telegram_id": telegram_id}).sort("created_at", -1)
    async for reg in cursor:
        reg["_id"] = str(reg["_id"])
        reg["course_id"] = str(reg["course_id"]) if reg.get("course_id") else None
        registrations.append(reg)
    return registrations


async def get_latest_user_info(telegram_id: int):
    """Get the most recent name, address and mobile for a user."""
    db = get_database()
    reg = await db.registrations.find_one(
        {"telegram_id": telegram_id}, {"name": 1, "address": 1, "mobile": 1}
    )
    if reg:
        return {
            "name": reg.get("name"),
            "address": reg.get("address"),
            "mobile": reg.get("mobile"),
        }
    return None


async def get_registered_course_titles(telegram_id: int):
    """Get course titles user has pending or approved registration for."""
    db = get_database()
    registrations = await db.registrations.find(
        {"telegram_id": telegram_id, "status": {"$in": ["pending", "approved"]}},
        {"course_title": 1},
    ).to_list(length=None)
    return [r.get("course_title") for r in registrations]


async def create_registration(reg_data: dict):
    db = get_database()
    from datetime import datetime

    reg_data["status"] = "pending"
    reg_data["created_at"] = datetime.utcnow()
    reg_data["updated_at"] = datetime.utcnow()
    result = await db.registrations.insert_one(reg_data)
    return str(result.inserted_id)


async def update_registration_status(reg_id: str, status: str, rejection_reason: str = None):
    db = get_database()
    from bson import ObjectId
    from datetime import datetime

    update_data = {"status": status, "updated_at": datetime.utcnow()}
    if rejection_reason:
        update_data["rejection_reason"] = rejection_reason

    await db.registrations.update_one(
        {"_id": ObjectId(reg_id)},
        {"$set": update_data},
    )


async def get_registration_by_id(reg_id: str):
    db = get_database()
    from bson import ObjectId

    reg = await db.registrations.find_one({"_id": ObjectId(reg_id)})
    if reg:
        reg["_id"] = str(reg["_id"])
        reg["course_id"] = str(reg["course_id"]) if reg.get("course_id") else None
    return reg


async def increment_course_count(course_id: str):
    db = get_database()
    from bson import ObjectId

    await db.courses.update_one(
        {"_id": ObjectId(course_id)}, {"$inc": {"registration_count": 1}}
    )


async def create_user(user_data: dict):
    db = get_database()
    from datetime import datetime
    from bson import ObjectId

    user_data["accessible_courses"] = user_data.get("accessible_courses", [])
    user_data["created_at"] = datetime.utcnow()
    user_data["_id"] = ObjectId()
    result = await db.users.insert_one(user_data)
    user_data["id"] = str(result.inserted_id)
    user_data["_id"] = str(user_data["_id"])
    return user_data


async def get_user_by_mobile(mobile: str):
    db = get_database()
    user = await db.users.find_one({"mobile": mobile})
    if user:
        user["id"] = str(user["_id"])
        user.pop("_id", None)
    return user


async def add_course_access(user_id: str, course_id: str):
    db = get_database()
    from bson import ObjectId

    await db.users.update_one(
        {"_id": ObjectId(user_id)}, {"$addToSet": {"accessible_courses": course_id}}
    )


async def update_registration_screenshot(reg_id: str, screenshot_path: str):
    db = get_database()
    from bson import ObjectId

    await db.registrations.update_one(
        {"_id": ObjectId(reg_id)}, {"$set": {"screenshot_url": screenshot_path}}
    )


# Chat History Collection
async def add_chat_message(telegram_id: int, role: str, message: str):
    db = get_database()
    from datetime import datetime

    await db.chat_history.insert_one(
        {
            "telegram_id": telegram_id,
            "role": role,
            "message": message,
            "created_at": datetime.utcnow(),
        }
    )


async def get_chat_history(telegram_id: int, limit: int = 20):
    db = get_database()
    messages = []
    cursor = (
        db.chat_history.find({"telegram_id": telegram_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    async for msg in cursor:
        messages.append(msg)
    return list(reversed(messages))


async def clear_chat_history(telegram_id: int):
    db = get_database()
    await db.chat_history.delete_many({"telegram_id": telegram_id})


# Config Collection
async def get_config(key: str):
    db = get_database()
    config = await db.config.find_one({"key": key})
    return config["value"] if config else None


async def set_config(key: str, value: str):
    db = get_database()
    from datetime import datetime

    await db.config.update_one(
        {"key": key},
        {"$set": {"value": value, "updated_at": datetime.utcnow()}},
        upsert=True,
    )


async def initialize_default_config():
    db = get_database()
    existing = await db.config.find_one({"key": "upi_id"})
    if not existing:
        await set_config("upi_id", "yourname@upi")
    existing_course = await db.courses.find_one({"title": "Sample Course"})
    if not existing_course:
        from datetime import datetime

        await db.courses.insert_one(
            {
                "title": "Sample Course",
                "description": "Description",
                "fee": 0,
                "image_url": "https://placehold.co/400x200/transparent?text=Sample+Course&font=Poppins",
                "registration_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )


# Stats
async def get_stats():
    db = get_database()
    total = await db.registrations.count_documents({})
    pending = await db.registrations.count_documents({"status": "pending"})
    approved = await db.registrations.count_documents({"status": "approved"})
    rejected = await db.registrations.count_documents({"status": "rejected"})
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
    }
