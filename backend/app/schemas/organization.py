from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class OrganizationStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    incomplete = "incomplete"


class OrganizationBase(BaseModel):
    name: str = Field(..., max_length=200, description="Tên nông trại / vườn / nhà kính")
    address: Optional[str] = Field(None, description="Địa chỉ hành chính")
    boundary_geojson: Optional[dict] = Field(None, description="Ranh giới nông trại dạng Polygon GeoJSON")


class OrganizationCreate(BaseModel):
    name: str = Field(..., max_length=200, description="Tên nông trại")
    address: Optional[str] = None
    boundary_geojson: Optional[dict] = None
    owner_id: Optional[UUID] = Field(None, description="Chỉ Admin được truyền; Owner tự động lấy ID bản thân")


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    boundary_geojson: Optional[dict] = None
    status: Optional[OrganizationStatus] = None


class OrganizationSummary(BaseModel):
    """Dùng cho danh sách nông trại - GET /organizations và GET /organizations/mine"""
    org_id: UUID
    name: str
    address: Optional[str] = None
    status: str
    owner_id: Optional[UUID] = None
    created_at: Optional[datetime] = None


class OrganizationDetail(OrganizationSummary):
    """Chi tiết nông trại kèm ranh giới và số liệu thống kê nhanh"""
    boundary_geojson: Optional[dict] = None
    plots_count: int = 0
    teams_count: int = 0
    active_seasons_count: int = 0
    updated_at: Optional[datetime] = None