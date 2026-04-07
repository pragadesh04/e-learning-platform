import cloudinary
import cloudinary.uploader
from datetime import datetime
from settings import settings

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
)


def upload_screenshot(file, folder="screenshots"):
    """Upload image to Cloudinary with optimization and timestamp"""
    if not settings.cloudinary_cloud_name:
        raise Exception(
            "Cloudinary is not configured. Please set cloudinary credentials in .env"
        )

    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image",
        transformation=[
            {"quality": "auto", "fetch_format": "auto"},
            {"width": 800, "height": 800, "crop": "limit"},
        ],
    )

    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "uploaded_at": datetime.utcnow().isoformat(),
    }


def delete_screenshot(public_id: str):
    """Delete image from Cloudinary"""
    if not settings.cloudinary_cloud_name:
        return

    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print(f"Failed to delete screenshot {public_id}: {e}")


def upload_course_image(file, folder="courses"):
    """Upload course image to Cloudinary without restrictions"""
    if not settings.cloudinary_cloud_name:
        raise Exception(
            "Cloudinary is not configured. Please set cloudinary credentials in .env"
        )

    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image",
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
    )

    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "uploaded_at": datetime.utcnow().isoformat(),
    }


def upload_image(file, folder="general"):
    """Generic image upload to Cloudinary without restrictions"""
    if not settings.cloudinary_cloud_name:
        raise Exception(
            "Cloudinary is not configured. Please set cloudinary credentials in .env"
        )

    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image",
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
    )

    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "uploaded_at": datetime.utcnow().isoformat(),
    }
