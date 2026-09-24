# backend/app/schemas/batch_seasons.py
from datetime import date
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class BatchSeasonStatus(str, Enum):
    active = "active"
    cancelled = "cancelled"  # Trạng thái xóa mềm liên kết


class BatchSeasonBase(BaseModel):
    batch_id: UUID = Field(..., description="Mã lô thu hoạch")
    season_id: UUID = Field(..., description="Mã mùa vụ canh tác")
    contributed_quantity: Optional[float] = Field(None, ge=0, description="Sản lượng đóng góp (kg hoặc tấn)")


class BatchSeasonCreate(BatchSeasonBase):
    pass


class BatchSeasonUpdate(BaseModel):
    contributed_quantity: float = Field(..., ge=0, description="Sản lượng đóng góp cập nhật")


class BatchSeasonDetail(BaseModel):
    batch_id: UUID
    batch_code: Optional[str] = None
    season_id: UUID
    crop_id: Optional[UUID] = None
    crop_name: Optional[str] = None
    plot_id: Optional[UUID] = None
    plot_code: Optional[str] = None
    contributed_quantity: Optional[float] = None
    season_status: Optional[str] = None
    planting_date: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    status: str = "active"