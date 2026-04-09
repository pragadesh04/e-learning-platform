from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class VideoItem(BaseModel):
    video_url: str
    title: str
    thumbnail_url: str


class SessionSchedule(BaseModel):
    session_number: int
    date: Optional[str] = None
    time: Optional[str] = None
    meeting_link: Optional[str] = None


class AccessDurations(BaseModel):
    three_months: Optional[float] = 0
    six_months: Optional[float] = 0
    lifetime: Optional[float] = 0


class CourseBase(BaseModel):
    title: str
    description: str
    fee: float
    image_url: Optional[str] = None
    course_type: str = "recorded"
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    sessions: Optional[int] = None
    duration: Optional[float] = None
    registration_open: bool = True
    video_type: str = "none"
    videos: List[VideoItem] = []
    tags: List[str] = []
    session_schedules: Optional[List[SessionSchedule]] = []
    access_durations: Optional[AccessDurations] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    fee: Optional[float] = None
    image_url: Optional[str] = None
    course_type: Optional[str] = None
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    sessions: Optional[int] = None
    duration: Optional[float] = None
    registration_open: Optional[bool] = None
    video_type: Optional[str] = None
    videos: Optional[List[VideoItem]] = None
    tags: Optional[List[str]] = None
    session_schedules: Optional[List[SessionSchedule]] = None
    access_durations: Optional[AccessDurations] = None


class CourseResponse(CourseBase):
    id: str
    _id: str
    registration_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RegistrationResponse(BaseModel):
    id: str
    telegram_id: Optional[int] = None
    name: str
    address: Optional[str] = None
    mobile: Optional[str] = None
    course_id: Optional[str] = None
    course_title: str
    amount: float
    screenshot_url: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    source: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int


class ConfigUpdate(BaseModel):
    value: str


class UserCreate(BaseModel):
    mobile: str
    password: str
    name: str
    city: Optional[str] = None
    is_admin: bool = False


class UserResponse(BaseModel):
    id: str
    mobile: str
    name: str
    city: Optional[str] = None
    is_admin: bool
    accessible_courses: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    mobile: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
