# backend/app/schemas/error_reports.py
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ErrorReportStatus(str, Enum):
    new = "new"
    processing = "processing"
    resolved = "resolved"
    rejected = "rejected"


class ErrorReportCategory(str, Enum):
    interface = "interface"
    data = "data"
    performance = "performance"
    bug = "bug"
    other = "other"


class ErrorReportBase(BaseModel):
    error_type: Optional[str] = Field("bug", max_length=50, description="Loại lỗi (interface, data, performance, bug, other)")
    description: str = Field(..., min_length=5, description="Mô tả chi tiết sự cố gặp phải")
    screenshot_url: Optional[str] = Field(None, max_length=500, description="URL ảnh chụp màn hình minh hoạ lỗi")


class ErrorReportCreate(ErrorReportBase):
    """Schema nhận từ client khi người dùng báo lỗi (user_id và org_id tự động gán từ token)"""
    pass


class ErrorReportUpdate(BaseModel):
    """Schema dành cho Admin cập nhật tiến độ xử lý và phản hồi (UC-A03.2)"""
    status: Optional[ErrorReportStatus] = Field(None, description="Trạng thái xử lý: new, processing, resolved, rejected")
    admin_response: Optional[str] = Field(None, description="Phản hồi/hướng dẫn từ quản trị viên")


class ErrorReportOut(ErrorReportBase):
    report_id: UUID
    user_id: UUID
    user_full_name: Optional[str] = None
    user_phone: Optional[str] = None
    org_id: UUID
    org_name: Optional[str] = None
    status: ErrorReportStatus
    admin_response: Optional[str] = None
    submitted_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)