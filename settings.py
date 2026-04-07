from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


def parse_admin_ids(value: str) -> List[str]:
    if not value:
        return []
    return [id.strip() for id in value.split(",") if id.strip()]


class Settings(BaseSettings):
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True
        extra = "ignore"

    bot_token: str = ""
    webhook_url: str = ""

    mongodb_uri: str = "mongodb+srv://localhost"
    mongodb_name: str = "CourseBots"

    mistral_api_key: str = ""

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    admin_chat_id: str = ""

    upload_dir: str = "../uploads"

    @property
    def admin_chat_ids(self) -> List[str]:
        return parse_admin_ids(self.admin_chat_id)

    admin_webhook_secret: str = "trinity_guards_secret_key_minimum_32_bytes_required_for_hs256_algorithm_security"

    port: int = 8000

    rejection_reasons: List[str] = [
        "Payment not verified",
        "Invalid screenshot",
        "Duplicate registration",
        "Course full",
        "Other",
    ]

    upi_id: str = "yourname@upi"

    class BotCommands:
        start: str = "Start the bot"
        help: str = "Show available commands"
        courses: str = "View all courses with details"
        register: str = "Register for a course"
        myregistrations: str = "View your registrations"
        end: str = "Exit query mode"

    bot_commands: BotCommands = BotCommands()


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
