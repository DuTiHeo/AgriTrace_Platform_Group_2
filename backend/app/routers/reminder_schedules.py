# backend/app/routers/reminder_schedules.py
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.crud import reminder_schedules as crud_reminders
from app.crud import season as crud_season
from app.db.session import get_db
from app.routers.user import ensure_owns_org, require_role
from app.schemas.reminder_schedules import (
    ReminderChannel,
    ReminderScheduleCreate,
    ReminderScheduleOut,
    ReminderScheduleStatusUpdate,
    ReminderScheduleUpdate,
    ReminderStatus,
)

router = APIRouter()


def _ensure_can_access_reminder(reminder: dict, current_user: dict, db: Session) -> None:
    """Kiểm tra quyền truy cập lịch nhắc nhở theo Data Isolation."""
    role = current_user["role"]
    if role == "admin":
        return
    if role == "owner":
        ensure_owns_org(db, current_user, reminder["org_id"])
        return
    if role in ("leader", "worker"):
        if reminder["org_id"] != current_user.get("org_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập lịch nhắc nhở của nông trại khác",
            )
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")


@router.get("", response_model=list[ReminderScheduleOut])
def list_reminders(
    season_id: Optional[UUID] = Query(None, description="Lọc theo mùa vụ"),
    status_filter: Optional[ReminderStatus] = Query(None, alias="status", description="Lọc theo trạng thái"),
    channel: Optional[ReminderChannel] = Query(None, description="Lọc theo kênh gửi"),
    from_date: Optional[date] = Query(None, description="Từ ngày nhắc nhở"),
    to_date: Optional[date] = Query(None, description="Đến ngày nhắc nhở"),
    org_id: Optional[UUID] = Query(None, description="Admin/Owner lọc theo nông trại"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách lịch nhắc nhở kèm Data Isolation:
    - Admin: xem toàn bộ hoặc lọc theo org_id
    - Owner: xem lịch nhắc của các nông trại mình sở hữu
    - Leader/Worker: tự động giới hạn trong nông trại trực thuộc
    """
    role = current_user["role"]

    if role == "admin":
        scope_org_id = org_id
        scope_owner_id = None
    elif role == "owner":
        if org_id:
            ensure_owns_org(db, current_user, org_id)
            scope_org_id = org_id
            scope_owner_id = None
        else:
            scope_org_id = None
            scope_owner_id = current_user["user_id"]
    else:  # leader, worker
        user_org_id = current_user.get("org_id")
        if not user_org_id:
            return []
        if org_id and org_id != user_org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem lịch nhắc nhở của nông trại khác",
            )
        scope_org_id = user_org_id
        scope_owner_id = None

    return crud_reminders.list_reminders(
        db,
        season_id=season_id,
        status=status_filter.value if status_filter else None,
        channel=channel.value if channel else None,
        from_date=from_date,
        to_date=to_date,
        scope_org_id=scope_org_id,
        scope_owner_id=scope_owner_id,
    )


@router.get("/{reminder_id}", response_model=ReminderScheduleOut)
def get_reminder(
    reminder_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Xem chi tiết 1 bản ghi lịch nhắc nhở."""
    reminder = crud_reminders.get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lịch nhắc nhở")

    _ensure_can_access_reminder(reminder, current_user, db)
    return reminder


@router.post("", response_model=ReminderScheduleOut, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderScheduleCreate,
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):
    """
    Tạo lịch nhắc nhở thủ công cho mùa vụ (Admin / Owner / Leader).
    Kiểm tra mùa vụ tồn tại và thuộc nông trại được phép quản lý.
    """
    season = crud_season.get_season(db, payload.season_id)
    if not season:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mùa vụ không tồn tại")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, season["org_id"])
    elif role == "leader":
        if season["org_id"] != current_user.get("org_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không thể tạo lịch nhắc nhở cho mùa vụ của nông trại khác",
            )

    created = crud_reminders.create_reminder(
        db,
        season_id=payload.season_id,
        milestone_type=payload.milestone_type,
        remind_date=payload.remind_date,
        channel=payload.channel.value,
        status=payload.status.value,
    )
    return created


@router.patch("/{reminder_id}", response_model=ReminderScheduleOut)
def update_reminder(
    reminder_id: UUID,
    payload: ReminderScheduleUpdate,
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin mốc nhắc nhở / ngày nhắc / kênh gửi (Admin / Owner / Leader)."""
    reminder = crud_reminders.get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lịch nhắc nhở")

    _ensure_can_access_reminder(reminder, current_user, db)

    fields = payload.model_dump(exclude_unset=True)
    if "channel" in fields and fields["channel"] is not None:
        fields["channel"] = fields["channel"].value
    if "status" in fields and fields["status"] is not None:
        fields["status"] = fields["status"].value

    updated = crud_reminders.update_reminder(db, reminder_id, **fields)
    return updated


@router.patch("/{reminder_id}/status", response_model=ReminderScheduleOut)
def update_reminder_status(
    reminder_id: UUID,
    payload: ReminderScheduleStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cập nhật trạng thái lịch nhắc nhở (scheduled -> sent -> seen)."""
    reminder = crud_reminders.get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lịch nhắc nhở")

    _ensure_can_access_reminder(reminder, current_user, db)

    updated = crud_reminders.update_reminder(db, reminder_id, status=payload.status.value)
    return updated


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Xóa lịch nhắc nhở (Admin / Owner)."""
    reminder = crud_reminders.get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lịch nhắc nhở")

    _ensure_can_access_reminder(reminder, current_user, db)

    crud_reminders.delete_reminder(db, reminder_id)
    return None