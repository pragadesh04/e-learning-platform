import asyncio
from datetime import datetime, timedelta
from bson import ObjectId

from database import get_database
from utils.cloud_upload import delete_screenshot
from settings import settings


async def cleanup_expired_screenshots(days=30):
    """Delete screenshots older than specified days from Cloudinary"""
    if not settings.cloudinary_cloud_name:
        print("Cloudinary not configured, skipping cleanup")
        return
    
    db = await get_database()
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    print(f"Looking for screenshots older than {cutoff_date}")
    
    cursor = db.registrations.find({
        "screenshot_uploaded_at": {"$exists": True, "$lt": cutoff_date.isoformat()},
        "screenshot_public_id": {"$exists": True, "$ne": None}
    })
    
    deleted_count = 0
    async for reg in cursor:
        public_id = reg.get("screenshot_public_id")
        if public_id:
            try:
                delete_screenshot(public_id)
                await db.registrations.update_one(
                    {"_id": ObjectId(reg["_id"])},
                    {
                        "$set": {
                            "screenshot_url": None,
                            "screenshot_public_id": None,
                            "screenshot_expired": True
                        }
                    }
                )
                deleted_count += 1
                print(f"Deleted expired screenshot: {public_id}")
            except Exception as e:
                print(f"Failed to delete {public_id}: {e}")
    
    print(f"Cleanup complete. Deleted {deleted_count} expired screenshots")
    return deleted_count


async def cleanup_expired_course_access():
    """Remove expired course access entries from users' accessible_courses arrays"""
    db = await get_database()
    now = datetime.utcnow()
    
    print(f"Cleaning up expired course access at {now}")
    
    cursor = db.users.find({
        "accessible_courses": {"$exists": True, "$ne": []}
    })
    
    cleaned_count = 0
    users_checked = 0
    
    async for user in cursor:
        users_checked += 1
        accessible_courses = user.get("accessible_courses", [])
        
        if not accessible_courses:
            continue
        
        new_accessible = []
        has_changes = False
        
        for access in accessible_courses:
            if isinstance(access, dict):
                expires_at = access.get("expires_at")
                if expires_at is not None and now > expires_at:
                    has_changes = True
                    print(f"Removing expired access: user {user.get('_id')}, course {access.get('course_id')}")
                    cleaned_count += 1
                else:
                    new_accessible.append(access)
            else:
                new_accessible.append(access)
        
        if has_changes:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"accessible_courses": new_accessible}}
            )
    
    print(f"Course access cleanup complete. Checked {users_checked} users, removed {cleaned_count} expired entries")
    return cleaned_count


async def run_cleanup_task():
    """Run cleanup task - can be called by scheduler"""
    try:
        await cleanup_expired_screenshots(days=30)
        await cleanup_expired_course_access()
    except Exception as e:
        print(f"Cleanup task failed: {e}")


if __name__ == "__main__":
    asyncio.run(run_cleanup_task())
