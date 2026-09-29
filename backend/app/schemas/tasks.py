# backend/app/schemas/tasks.py
from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator

class TaskStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class TaskBase(BaseModel):
    team_id: UUID = Field(..., description="ID tổ công nhân phụ trách")
    worker_id: UUID = Field(..., description="ID công nhân được giao nhiệm vụ")
    plot_id: UUID = Field(..., description="ID lô đất thực hiện nhiệm vụ")
    content: str = Field(..., min_length=1, description="Nội dung chi tiết nhiệm vụ")
    start_at: datetime = Field(..., description="Thời điểm bắt đầu (kèm múi giờ)")
    due_at: datetime = Field(..., description="Thời điểm hết hạn (kèm múi giờ)")

    @field_validator("start_at", "due_at")
    @classmethod
    def _must_have_tz(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("Cần gửi kèm múi giờ, ví dụ 2026-09-28T08:00:00+07:00")
        return v

    @model_validator(mode="after")
    def _check_range(self):
        if self.due_at <= self.start_at:
            raise ValueError("due_at phải sau start_at")
        return self

class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    team_id: Optional[UUID] = None
    worker_id: Optional[UUID] = None
    plot_id: Optional[UUID] = None
    content: Optional[str] = Field(None, min_length=1)
    start_at: Optional[date] = None
    due_at: Optional[date] = None
    status: Optional[TaskStatus] = None
    
    @field_validator("start_at", "due_at")
    @classmethod
    def _must_have_tz(cls, v):
        if v is not None and v.tzinfo is None:
            raise ValueError("Cần gửi kèm múi giờ, ví dụ 2026-09-28T08:00:00+07:00")
        return v
    # Không validate due_at > start_at ở đây — vì client có thể chỉ gửi 1 trong 2 field.
    # Việc so sánh phải làm ở router, sau khi merge với giá trị cũ trong DB (xem mục 4).

class TaskStatusUpdate(BaseModel):
    status: TaskStatus = Field(..., description="Trạng thái mới: in_progress hoặc completed")


class TaskSummary(BaseModel):
    task_id: UUID
    team_id: UUID
    team_name: Optional[str] = None
    worker_id: UUID
    worker_name: Optional[str] = None
    worker_phone: Optional[str] = None
    plot_id: UUID
    plot_code: Optional[str] = None
    org_id: Optional[UUID] = None
    org_name: Optional[str] = None
    content: str
    start_at: Optional[date] = None
    due_at: Optional[date] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TaskDetail(TaskSummary):
    pass