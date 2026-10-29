# backend/app/schemas/reminder_schedules.py
from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ReminderStatus(str, Enum):
    scheduled = "scheduled"
    sent = "sent"
    seen = "seen"


class ReminderChannel(str, Enum):
    push = "push"
    sms = "sms"
    email = "email"


class ReminderScheduleBase(BaseModel):
    milestone_type: str = Field(..., max_length=50, description="Loại mốc nhắc nhở (harvest, fertilize, spray...)")
    remind_date: date = Field(..., description="Ngày cần kích hoạt nhắc nhở")
    channel: ReminderChannel = Field(default=ReminderChannel.push, description="Kênh gửi nhắc nhở")
    status: ReminderStatus = Field(default=ReminderStatus.scheduled, description="Trạng thái nhắc nhở")


class ReminderScheduleCreate(ReminderScheduleBase):
    season_id: UUID = Field(..., description="ID mùa vụ liên quan")


class ReminderScheduleUpdate(BaseModel):
    milestone_type: Optional[str] = Field(None, max_length=50)
    remind_date: Optional[date] = None
    channel: Optional[ReminderChannel] = None
    status: Optional[ReminderStatus] = None


class ReminderScheduleStatusUpdate(BaseModel):
    status: ReminderStatus = Field(..., description="Trạng thái mới: scheduled, sent hoặc seen")


class ReminderScheduleOut(ReminderScheduleBase):
    reminder_id: UUID
    season_id: UUID
    plot_code: Optional[str] = None
    crop_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReminderDispatchOut(BaseModel):
    dispatched_count: int = Field(..., ge=0, description="Số lượng lịch nhắc nhở đã được chuyển sang trạng thái sent")
    reminder_ids: list[UUID] = Field(default_factory=list, description="Danh sách ID các lịch nhắc nhở đã phát hành")
    message: str = Field(..., description="Thông báo kết quả")