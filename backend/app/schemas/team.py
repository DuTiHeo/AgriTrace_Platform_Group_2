from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class TeamBase(BaseModel):
    name: str = Field(..., max_length=100, description="Tên tổ công nhân (duy nhất trong nông trại)")
    team_leader_id: Optional[UUID] = Field(None, description="user_id của Tổ trưởng (có thể để trống khi mới tạo)")


class TeamCreate(TeamBase):
    org_id: UUID = Field(..., description="ID nông trại chứa tổ này")


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    team_leader_id: Optional[UUID] = None


class TeamMemberOut(BaseModel):
    user_id: UUID
    full_name: str
    phone: str
    role: str
    status: str


class TeamSummary(BaseModel):
    """Dùng cho danh sách tổ - GET /teams"""
    team_id: UUID
    org_id: UUID
    name: str
    team_leader_id: Optional[UUID] = None
    leader_name: Optional[str] = None
    leader_phone: Optional[str] = None
    member_count: int = 0
    created_at: Optional[datetime] = None


class TeamDetail(TeamSummary):
    """Chi tiết tổ kèm danh sách thành viên"""
    members: list[TeamMemberOut] = []
    updated_at: Optional[datetime] = None


class TeamMemberAssign(BaseModel):
    """Gán công nhân vào tổ - POST /teams/{team_id}/members"""
    worker_ids: list[UUID] = Field(..., min_length=1, description="Danh sách ID các công nhân cần thêm vào tổ")
