from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class PlotStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class PlotBase(BaseModel):
    code: str = Field(..., max_length=50, description="Tên hoặc mã lô đất (VD: Lô A1), duy nhất trong nông trại")
    area: Optional[float] = Field(None, ge=0, description="Diện tích (m² hoặc ha). Nếu để trống và có ranh giới, hệ thống tự tính")
    boundary_geojson: Optional[dict] = Field(None, description="Ranh giới lô đất dạng Polygon GeoJSON")


class PlotCreate(PlotBase):
    org_id: UUID = Field(..., description="ID nông trại chứa lô đất này")


class PlotUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    area: Optional[float] = Field(None, ge=0)
    boundary_geojson: Optional[dict] = None
    status: Optional[PlotStatus] = None


class PlotSummary(BaseModel):
    """Dùng cho danh sách lô đất - GET /plots"""
    plot_id: UUID
    org_id: UUID
    code: str
    area: Optional[float] = None
    status: str
    current_season_id: Optional[UUID] = None
    current_crop_name: Optional[str] = None
    created_at: Optional[datetime] = None


class PlotDetail(PlotSummary):
    """Chi tiết lô đất kèm ranh giới GeoJSON"""
    boundary_geojson: Optional[dict] = None
    updated_at: Optional[datetime] = None


class PlotLocateResponse(BaseModel):
    """Kết quả tự động suy luận Lô đất và Mùa vụ từ tọa độ GPS - BR-14, UC-W03.4"""
    plot_id: UUID = Field(..., description="ID của lô đất chứa tọa độ GPS")
    org_id: UUID = Field(..., description="ID nông trại chứa lô đất")
    code: str = Field(..., description="Tên hoặc mã định danh của lô đất (VD: DL-01)")
    area: Optional[float] = Field(None, description="Diện tích lô đất (ha hoặc m²)")
    status: str = Field(..., description="Trạng thái lô đất (active)")
    current_season_id: Optional[UUID] = Field(None, description="ID mùa vụ đang canh tác (growing hoặc ready_to_harvest)")
    current_crop_name: Optional[str] = Field(None, description="Tên giống cây trồng của mùa vụ hiện tại")

