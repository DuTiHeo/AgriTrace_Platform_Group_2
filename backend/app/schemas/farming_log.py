from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class GPSPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class FarmingLogCreate(BaseModel):
    season_id: UUID
    activity_type: str = Field(..., min_length=1, max_length=50)
    gps: GPSPoint
    content: Optional[str] = None


class LogPhotoOut(BaseModel):
    photo_id: UUID
    log_id: UUID
    url: str
    created_at: datetime


class LogNoteInLogOut(BaseModel):
    note_id: UUID
    log_id: UUID
    leader_id: UUID
    leader_name: Optional[str] = None
    content: str
    resolved: bool = False
    created_at: datetime


class FarmingLogSummary(BaseModel):
    log_id: UUID
    season_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    team_id: Optional[UUID] = None
    org_id: UUID
    activity_type: str
    content: Optional[str] = None
    gps: GPSPoint
    logged_at: datetime


class FarmingLogDetail(FarmingLogSummary):
    photos: list[LogPhotoOut] = Field(default_factory=list)
    notes: list[LogNoteInLogOut] = Field(default_factory=list)
