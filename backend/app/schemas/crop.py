# Schemas cho module CropCatalog - dot 1 (gop chung CropCareMilestones
# vi milestones la bang con cua 1 giong cay, khong dung doc lap).
#   CropCreate            -> UC-A02.1 (Admin them giong moi vao danh muc)
#   CropUpdate             -> UC-A02.1 (Admin sua thong tin giong)
#   CropSummary            -> UC-SH04.1 (GET /crops - danh sach, tat ca role)
#   CropDetail              -> UC-SH04.1 (GET /crops/{id} - kem milestones)
#   MilestoneCreate/Update -> UC-A02.1, du lieu nay UC-O03.3 (module Season)
#                             se doc de tu dong sinh reminder_schedules

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---- CROP_CATALOG ----

class CropBase(BaseModel):
    name: str
    growth_days: int = Field(gt=0, description="So ngay sinh truong, phai > 0")
    planting_guide: Optional[str] = None


class CropCreate(CropBase):
    pass


class CropUpdate(BaseModel):
    """Partial update - client chi gui field nao muon sua, giong UserUpdate
    ben module User."""
    name: Optional[str] = None
    growth_days: Optional[int] = Field(default=None, gt=0)
    planting_guide: Optional[str] = None


class CropSummary(BaseModel):
    """Dung cho GET /crops (danh sach) - ban rut gon."""
    crop_id: UUID
    name: str
    growth_days: int


# ---- CROP_CARE_MILESTONES (bang con, gop chung file theo ke hoach dot 1) ----

class MilestoneOut(BaseModel):
    milestone_id: UUID
    crop_id: UUID
    days_after_planting: int
    task_type: str
    description: Optional[str] = None
    created_at: datetime


class MilestoneCreate(BaseModel):
    days_after_planting: int = Field(ge=0)
    task_type: str
    description: Optional[str] = None


class MilestoneUpdate(BaseModel):
    days_after_planting: Optional[int] = Field(default=None, ge=0)
    task_type: Optional[str] = None
    description: Optional[str] = None


# ---- Response day du (GET /crops/{id}) ----

class CropDetail(CropSummary):
    planting_guide: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    milestones: list[MilestoneOut] = []