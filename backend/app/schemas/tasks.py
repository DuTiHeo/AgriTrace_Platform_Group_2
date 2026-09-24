# backend/app/schemas/tasks.py
from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class TaskBase(BaseModel):
    team_id: UUID = Field(..., description="ID tổ công nhân phụ trách")
    worker_id: UUID = Field(..., description="ID công nhân được giao nhiệm vụ")
    plot_id: UUID = Field(..., description="ID lô đất thực hiện nhiệm vụ")
    content: str = Field(..., min_length=1, description="Nội dung chi tiết nhiệm vụ")
    due_date: Optional[date] = Field(None, description="Hạn chót hoàn thành")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    team_id: Optional[UUID] = None
    worker_id: Optional[UUID] = None
    plot_id: Optional[UUID] = None
    content: Optional[str] = Field(None, min_length=1)
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None


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
    due_date: Optional[date] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TaskDetail(TaskSummary):
    pass