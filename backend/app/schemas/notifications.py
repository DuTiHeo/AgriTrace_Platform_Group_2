from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    task_assigned = "task_assigned"
    log_note = "log_note"
    reminder = "reminder"
    error_report = "error_report"
    error_report_response = "error_report_response"


class NotificationOut(BaseModel):
    notification_id: UUID = Field(..., description="ID định danh thông báo")
    user_id: UUID = Field(..., description="ID người dùng nhận thông báo")
    content: str = Field(..., description="Nội dung chi tiết thông báo")
    type: Optional[str] = Field(None, description="Loại thông báo (task_assigned, log_note, reminder, error_report, error_report_response)")
    is_read: bool = Field(False, description="Trạng thái đã đọc (true) hoặc chưa đọc (false)")
    created_at: datetime = Field(..., description="Thời điểm tạo thông báo")


class UnreadCountOut(BaseModel):
    unread_count: int = Field(..., ge=0, description="Số lượng thông báo chưa đọc của người dùng hiện tại")


class MarkAllReadOut(BaseModel):
    updated_count: int = Field(..., ge=0, description="Số lượng thông báo được cập nhật sang trạng thái đã đọc")
    message: str = Field(..., description="Thông điệp phản hồi")
