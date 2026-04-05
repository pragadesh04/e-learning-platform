import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.database import Database
from dotenv import load_dotenv
import logging

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

from settings import settings

logger = logging.getLogger(__name__)


class MongoDB:
    client: AsyncIOMotorClient = None
    db: Database = None
    connected: bool = False


db_instance = MongoDB()


async def connect_to_mongo():
    if db_instance.connected:
        return
    db_instance.client = AsyncIOMotorClient(settings.mongodb_uri)
    db_instance.db = db_instance.client[settings.mongodb_name]
    db_instance.connected = True
    print(f"Connected to MongoDB - Database: {settings.mongodb_name}", flush=True)


async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        db_instance.connected = False
        print("MongoDB connection closed", flush=True)


async def get_database() -> Database:
    if not db_instance.connected:
        await connect_to_mongo()
    return db_instance.db


async def get_courses():
    db = await get_database()
    courses = []
    cursor = db.courses.find().sort("registration_count", -1)
    async for course in cursor:
        course["id"] = str(course["_id"])
        course["_id"] = str(course["_id"])
        courses.append(course)
    return courses


async def get_course_by_id(course_id: str):
    db = await get_database()
    from bson import ObjectId
    from bson.errors import InvalidId

    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
    except (InvalidId, ValueError):
        return None
    
    if course:
        course["id"] = str(course["_id"])
        course["_id"] = str(course["_id"])
    return course


async def create_course(course_data: dict):
    db = await get_database()
    from datetime import datetime

    course_data["registration_count"] = 0
    course_data["created_at"] = datetime.utcnow()
    course_data["updated_at"] = datetime.utcnow()
    result = await db.courses.insert_one(course_data)
    return str(result.inserted_id)


async def update_course(course_id: str, update_data: dict):
    db = await get_database()
    from bson import ObjectId
    from datetime import datetime

    update_data["updated_at"] = datetime.utcnow()
    await db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_data})


async def delete_course(course_id: str):
    db = await get_database()
    from bson import ObjectId

    await db.courses.delete_one({"_id": ObjectId(course_id)})


async def increment_course_count(course_id: str):
    db = await get_database()
    from bson import ObjectId

    await db.courses.update_one(
        {"_id": ObjectId(course_id)}, {"$inc": {"registration_count": 1}}
    )


async def get_registrations(
    status: str = None, course: str = None, sort_by: str = None, order: str = "desc"
):
    db = await get_database()
    registrations = []
    query = {}
    if status:
        query["status"] = status
    if course:
        query["course_title"] = course

    sort_field = "created_at"
    sort_order = -1  # descending

    if sort_by == "date":
        sort_field = "created_at"
        sort_order = -1 if order == "desc" else 1
    elif sort_by == "amount":
        sort_field = "amount"
        sort_order = -1 if order == "desc" else 1

    cursor = db.registrations.find(query).sort(sort_field, sort_order)
    async for reg in cursor:
        reg["id"] = str(reg["_id"])
        reg.pop("_id", None)
        reg["course_id"] = str(reg["course_id"]) if reg.get("course_id") else None
        reg["updated_at"] = str(reg["updated_at"])
        reg["created_at"] = str(reg["created_at"])
        logger.info(f"Registration: {reg}")
        registrations.append(reg)
    return registrations


async def get_registration_by_id(reg_id: str):
    db = await get_database()
    from bson import ObjectId
    from bson.errors import InvalidId

    try:
        reg = await db.registrations.find_one({"_id": ObjectId(reg_id)})
    except (InvalidId, ValueError):
        return None
    
    if reg:
        reg["id"] = str(reg["_id"])
        reg.pop("_id", None)
        if reg.get("course_id"):
            reg["course_id"] = str(reg["course_id"])
        for key, value in reg.items():
            if hasattr(value, '__class__') and 'ObjectId' in str(type(value)):
                reg[key] = str(value)
    return reg


async def update_registration_status(
    reg_id: str, status: str, rejection_reason: str = None
):
    db = await get_database()
    from bson import ObjectId
    from datetime import datetime

    update_data = {"status": status, "updated_at": datetime.utcnow()}
    if rejection_reason:
        update_data["rejection_reason"] = rejection_reason

    await db.registrations.update_one(
        {"_id": ObjectId(reg_id)},
        {"$set": update_data},
    )


async def get_config(key: str):
    db = await get_database()
    config = await db.config.find_one({"key": key})
    return config["value"] if config else None


async def set_config(key: str, value: str):
    db = await get_database()
    from datetime import datetime

    await db.config.update_one(
        {"key": key},
        {"$set": {"value": value, "updated_at": datetime.utcnow()}},
        upsert=True,
    )


async def get_stats():
    db = await get_database()
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


async def initialize_default_config():
    db = await get_database()
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
                "image_url": "https://placehold.co/400x200/transparent/white?text=Sample+Course&font=Poppins",
                "registration_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )


async def create_user(user_data: dict):
    db = await get_database()
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
    db = await get_database()
    user = await db.users.find_one({"mobile": mobile})
    if user:
        user["id"] = str(user["_id"])
        user.pop("_id", None)
    return user


async def get_user_by_id(user_id: str):
    db = await get_database()
    from bson import ObjectId
    from bson.errors import InvalidId

    if not user_id:
        return None
        
    # Try as ObjectId first
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["id"] = str(user["_id"])
            user.pop("_id", None)
            return user
    except (InvalidId, ValueError, Exception):
        pass
    
    # Try as mobile number
    try:
        user = await db.users.find_one({"mobile": user_id})
        if user:
            user["id"] = str(user["_id"])
            user.pop("_id", None)
            return user
    except Exception:
        pass
    
    return None


async def add_course_access(user_id: str, course_id: str):
    db = await get_database()
    from bson import ObjectId

    await db.users.update_one(
        {"_id": ObjectId(user_id)}, {"$addToSet": {"accessible_courses": course_id}}
    )


async def get_user_courses(user_id: str):
    db = await get_database()
    from bson import ObjectId

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return []

    course_ids = user.get("accessible_courses", [])
    courses = []
    for course_id in course_ids:
        course = await get_course_by_id(course_id)
        if course:
            courses.append(course)
    return courses


async def initialize_admin_user():
    db = await get_database()
    from datetime import datetime

    existing_admin = await db.users.find_one({"mobile": "5555511111"})
    if existing_admin:
        return

    import bcrypt

    hashed = bcrypt.hashpw("Admin@123".encode("utf-8"), bcrypt.gensalt())
    await db.users.insert_one(
        {
            "mobile": "5555511111",
            "password_hash": hashed.decode("utf-8"),
            "name": "Admin",
            "is_admin": True,
            "accessible_courses": [],
            "created_at": datetime.utcnow(),
        }
    )
    print("Admin user created: Mobile=5555511111, Password=Admin@123", flush=True)


async def get_available_courses():
    db = await get_database()
    courses = []
    cursor = db.courses.find({"registration_open": True}).sort("registration_count", -1)
    async for course in cursor:
        course["id"] = str(course["_id"])
        course["_id"] = str(course["_id"])
        courses.append(course)
    return courses


async def get_popular_courses(limit: int = 10):
    db = await get_database()
    courses = []
    cursor = db.courses.find({"registration_open": True}).sort("registration_count", -1).limit(limit)
    async for course in cursor:
        course["id"] = str(course["_id"])
        course["_id"] = str(course["_id"])
        courses.append(course)
    return courses


async def get_user_registrations(user_id: str):
    db = await get_database()

    registrations = []
    
    # Get user's mobile for Telegram registrations
    mobile = None
    try:
        user = await get_user_by_id(user_id)
        mobile = user.get("mobile") if user else None
    except Exception:
        pass
    
    # Query by user_id OR mobile to catch all registrations
    if mobile:
        query = {"$or": [{"user_id": user_id}, {"mobile": mobile}]}
    else:
        query = {"user_id": user_id}
    
    try:
        cursor = db.registrations.find(query).sort("created_at", -1)
        async for reg in cursor:
            reg["id"] = str(reg["_id"])
            reg.pop("_id", None)
            if reg.get("course_id"):
                reg["course_id"] = str(reg["course_id"])
            registrations.append(reg)
    except Exception as e:
        print(f"Error fetching registrations: {e}")
    
    return registrations


async def create_registration(registration_data: dict):
    db = await get_database()
    from datetime import datetime
    from bson import ObjectId

    registration_data["created_at"] = datetime.utcnow()
    registration_data["updated_at"] = datetime.utcnow()
    registration_data["_id"] = ObjectId()
    result = await db.registrations.insert_one(registration_data)
    registration_data["id"] = str(result.inserted_id)
    registration_data["_id"] = str(registration_data["_id"])
    return registration_data
