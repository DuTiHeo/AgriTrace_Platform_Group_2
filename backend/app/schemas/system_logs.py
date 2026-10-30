# backend/app/schemas/system_logs.py
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class SystemLogResult(str, Enum):
    success = "success"
    failed = "failed"


class SystemLogBase(BaseModel):
    target_type: Optional[str] = Field(None, max_length=50, description="Loại đối tượng (users, seasons, tasks, plots...)")
    target_id: Optional[UUID] = Field(None, description="ID của đối tượng bị tác động")
    action: str = Field(..., max_length=50, description="Hành động: create, update, delete, login, password_reset...")
    result: SystemLogResult = Field(default=SystemLogResult.success, description="Kết quả: success hoặc failed")


class SystemLogCreate(SystemLogBase):
    actor_id: Optional[UUID] = Field(None, description="ID người thực hiện (nếu None sẽ lấy từ token current_user)")


class SystemLogOut(SystemLogBase):
    log_id: UUID
    actor_id: Optional[UUID] = None
    actor_name: Optional[str] = None
    actor_phone: Optional[str] = None
    actor_role: Optional[str] = None
    performed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemLogPagination(BaseModel):
    total: int
    items: list[SystemLogOut]
    limit: int
    offset: int

    model_config = ConfigDict(from_attributes=True)