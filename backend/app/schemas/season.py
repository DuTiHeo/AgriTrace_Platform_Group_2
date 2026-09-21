from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class SeasonStatus(str, Enum):
    growing = "growing"
    ready_to_harvest = "ready_to_harvest"
    completed = "completed"


class SeasonCreate(BaseModel):
    plot_id: UUID = Field(..., description="Canh tác trên lô nào")
    crop_id: UUID = Field(..., description="Trồng giống cây nào")
    planting_date: date = Field(..., description="Ngày gieo trồng")
    expected_harvest_date: Optional[date] = Field(
        None,
        description="Ngày thu hoạch dự kiến (nếu không nhập, backend tự động tính theo số ngày sinh trưởng của giống)",
    )
    assigned_team_ids: Optional[list[UUID]] = Field(
        default=[],
        description="Danh sách ID các tổ công nhân được phân công phụ trách ngay khi tạo mùa vụ",
    )


class SeasonUpdate(BaseModel):
    expected_harvest_date: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    status: Optional[SeasonStatus] = None


class ReminderScheduleOut(BaseModel):
    reminder_id: UUID
    milestone_type: str
    remind_date: date
    channel: str = "push"
    status: str = "scheduled"


class SeasonTeamOut(BaseModel):
    team_id: UUID
    team_name: str
    leader_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class SeasonSummary(BaseModel):
    """Dùng cho danh sách mùa vụ - GET /seasons"""
    season_id: UUID
    plot_id: UUID
    plot_code: str
    crop_id: UUID
    crop_name: str
    planting_date: date
    expected_harvest_date: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    status: str
    org_id: UUID
    assigned_team_names: list[str] = []
    created_at: Optional[datetime] = None


class SeasonDetail(SeasonSummary):
    """Chi tiết mùa vụ kèm hướng dẫn giống, lịch nhắc tự sinh và các tổ hỗ trợ"""
    planting_guide: Optional[str] = None
    growth_days: int = 0
    reminders: list[ReminderScheduleOut] = []
    teams: list[SeasonTeamOut] = []
    farming_logs_count: int = 0
    updated_at: Optional[datetime] = None


class SeasonTeamAssign(BaseModel):
    """Gán thêm tổ hỗ trợ mùa vụ - POST /seasons/{season_id}/teams"""
    team_id: UUID = Field(..., description="ID tổ công nhân cần gán hỗ trợ")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
