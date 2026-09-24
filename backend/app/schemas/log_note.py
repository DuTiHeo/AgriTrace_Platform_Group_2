from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class LogNoteCreate(BaseModel):
    log_id: UUID
    content: str = Field(..., min_length=1)


class LogNoteUpdate(BaseModel):
    resolved: bool


class LogNoteOut(BaseModel):
    note_id: UUID
    log_id: UUID
    leader_id: UUID
    leader_name: Optional[str] = None
    content: str
    resolved: bool = False
    created_at: datetime
