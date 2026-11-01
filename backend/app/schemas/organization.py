from datetime import datetime
from enum import Enum
from typing import Any, Optional, Union
from uuid import UUID
from pydantic import BaseModel, Field


class OrganizationStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    incomplete = "incomplete"


class VN2000Point(BaseModel):
    x: float = Field(..., description="Tọa độ X (Hướng Bắc / Northing, đơn vị mét)")
    y: float = Field(..., description="Tọa độ Y (Hướng Đông / Easting, đơn vị mét)")


class VN2000BoundaryInput(BaseModel):
    points: list[VN2000Point] = Field(..., min_length=3, description="Danh sách tối thiểu 3 đỉnh đa giác theo hệ VN-2000")
    central_meridian: Union[float, str] = Field("105°00'", description="Kinh tuyến trục (VD: 105.0, '105°00\\'', '107°45\\'', '108°30\\'')")
    zone_width: int = Field(3, description="Múi chiếu 3 độ (mặc định địa chính) hoặc 6 độ")


class VN2000ConvertOut(BaseModel):
    boundary_geojson: dict[str, Any]
    wgs84_vertices: list[list[float]]
    central_meridian: float
    zone_width: int


class OrganizationBase(BaseModel):
    name: str = Field(..., max_length=200, description="Tên nông trại / vườn / nhà kính")
    address: Optional[str] = Field(None, description="Địa chỉ hành chính")
    boundary_geojson: Optional[dict] = Field(None, description="Ranh giới nông trại dạng Polygon GeoJSON")


class OrganizationCreate(BaseModel):
    name: str = Field(..., max_length=200, description="Tên nông trại")
    address: Optional[str] = None
    boundary_geojson: Optional[dict] = None
    boundary_vn2000: Optional[VN2000BoundaryInput] = Field(
        None,
        description="Tọa độ ranh giới hệ VN-2000 (sẽ tự động quy đổi sang boundary_geojson WGS84)",
    )
    owner_id: Optional[UUID] = Field(None, description="Chỉ Admin được truyền; Owner tự động lấy ID bản thân")


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    boundary_geojson: Optional[dict] = None
    boundary_vn2000: Optional[VN2000BoundaryInput] = Field(
        None,
        description="Tọa độ ranh giới hệ VN-2000 (sẽ tự động quy đổi sang boundary_geojson WGS84)",
    )
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