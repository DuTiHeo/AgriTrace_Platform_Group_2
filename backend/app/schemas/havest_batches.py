# backend/app/schemas/havest_batches.py
from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class HarvestBatchStatus(str, Enum):
    pending = "pending"
    ready = "ready"
    cancelled = "cancelled"


class BatchSeasonContributionInput(BaseModel):
    season_id: UUID = Field(..., description="ID mùa vụ đóng góp sản lượng")
    contributed_quantity: Optional[float] = Field(None, ge=0, description="Sản lượng mùa vụ đóng góp (kg hoặc tấn)")


class HarvestBatchBase(BaseModel):
    org_id: UUID = Field(..., description="Thuộc nông trại nào")
    batch_code: Optional[str] = Field(None, description="Mã định danh duy nhất (nếu bỏ trống, backend tự sinh chuẩn AGT-...)")
    quantity: Optional[float] = Field(None, ge=0, description="Tổng sản lượng của lô thu hoạch")
    harvest_date: Optional[date] = Field(None, description="Ngày thu hoạch")
    status: Optional[HarvestBatchStatus] = Field(default=HarvestBatchStatus.pending, description="Trạng thái lô")
    qr_url: Optional[str] = Field(None, description="Đường dẫn tra cứu QR")


class HarvestBatchCreate(HarvestBatchBase):
    initial_seasons: Optional[list[BatchSeasonContributionInput]] = Field(
        default=[],
        description="Danh sách mùa vụ đóng góp sản lượng ngay khi tạo lô",
    )


class HarvestBatchUpdate(BaseModel):
    quantity: Optional[float] = Field(None, ge=0)
    harvest_date: Optional[date] = None
    status: Optional[HarvestBatchStatus] = None
    qr_url: Optional[str] = None


class BatchSeasonItemOut(BaseModel):
    season_id: UUID
    crop_id: Optional[UUID] = None
    crop_name: Optional[str] = None
    plot_id: Optional[UUID] = None
    plot_code: Optional[str] = None
    contributed_quantity: Optional[float] = None
    planting_date: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    season_status: Optional[str] = None
    status: Optional[str] = "active"


class HarvestBatchSummary(BaseModel):
    batch_id: UUID
    batch_code: Optional[str] = None
    org_id: UUID
    org_name: Optional[str] = None
    quantity: Optional[float] = None
    harvest_date: Optional[date] = None
    status: str
    qr_url: Optional[str] = None
    seasons_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class HarvestBatchDetail(HarvestBatchSummary):
    seasons: list[BatchSeasonItemOut] = []