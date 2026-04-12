import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
import database
from bson import ObjectId

router = APIRouter(prefix="/api", tags=["gallery"])


async def get_current_user(credentials = Depends(lambda: None)):
    """Temporary - all gallery endpoints are public for now"""
    return {"id": "public", "is_admin": True}


@router.get("/gallery")
async def get_gallery():
    """Get gallery data - hero banner, founder, before/after, and gallery images"""
    db = await database.get_database()
    
    gallery_doc = await db.config.find_one({"key": "gallery"})
    
    if not gallery_doc:
        return {
            "hero_banner": None,
            "founder": None,
            "before": None,
            "after": None,
            "gallery": []
        }
    
    return gallery_doc.get("data", {
        "hero_banner": None,
        "founder": None,
        "before": None,
        "after": None,
        "gallery": []
    })


@router.post("/gallery")
async def save_gallery(data: dict, current_user: dict = Depends(get_current_user)):
    """Save gallery data - hero banner, founder, before/after images"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = await database.get_database()
    
    await db.config.update_one(
        {"key": "gallery"},
        {"$set": {"key": "gallery", "data": data}},
        upsert=True
    )
    
    return {"message": "Gallery saved successfully"}


@router.post("/gallery/upload")
async def upload_gallery_image(
    category: str,
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a gallery image"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from utils.cloud_upload import upload_image
    
    image_url = await upload_image(image)
    
    db = await database.get_database()
    
    gallery_doc = await db.config.find_one({"key": "gallery"})
    gallery_data = gallery_doc.get("data", {}) if gallery_doc else {}
    
    if category in ["hero_banner", "founder", "before", "after"]:
        gallery_data[category] = {"image_url": image_url, "id": str(ObjectId())}
    else:
        gallery_list = gallery_data.get("gallery", [])
        gallery_list.append({
            "id": str(ObjectId()),
            "image_url": image_url,
            "title": "Gallery Item",
            "category": category
        })
        gallery_data["gallery"] = gallery_list
    
    await db.config.update_one(
        {"key": "gallery"},
        {"$set": {"key": "gallery", "data": gallery_data}},
        upsert=True
    )
    
    return {"image_url": image_url, "message": "Image uploaded successfully"}


@router.delete("/gallery/{item_id}")
async def delete_gallery_image(item_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a gallery image"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = await database.get_database()
    
    gallery_doc = await db.config.find_one({"key": "gallery"})
    if not gallery_doc:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    gallery_data = gallery_doc.get("data", {})
    gallery_list = gallery_data.get("gallery", [])
    
    gallery_list = [item for item in gallery_list if item.get("id") != item_id]
    gallery_data["gallery"] = gallery_list
    
    await db.config.update_one(
        {"key": "gallery"},
        {"$set": {"key": "gallery", "data": gallery_data}}
    )
    
    return {"message": "Image deleted successfully"}