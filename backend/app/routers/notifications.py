from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.crud import notifications as crud_notifications
from app.db.session import get_db
from app.schemas.notifications import MarkAllReadOut, NotificationOut, UnreadCountOut

router = APIRouter()


def _get_own_notification_or_raise(
    db: Session,
    notification_id: UUID,
    current_user: dict,
) -> dict:
    notification = crud_notifications.get_notification(db, notification_id)
    if not notification:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy thông báo")
    if notification["user_id"] != current_user["user_id"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Bạn không có quyền truy cập thông báo của người dùng khác",
        )
    return notification


@router.get("", response_model=list[NotificationOut])
def list_my_notifications(
    is_read: Optional[bool] = Query(None, description="Lọc theo trạng thái đã đọc (true) hoặc chưa đọc (false)"),
    type: Optional[str] = Query(None, description="Lọc theo loại thông báo (task_assigned, log_note, reminder, error_report, error_report_response)"),
    limit: int = Query(50, ge=1, le=200, description="Số lượng bản ghi tối đa (1..200)"),
    offset: int = Query(0, ge=0, description="Vị trí bắt đầu phân trang (>= 0)"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud_notifications.list_notifications(
        db,
        user_id=current_user["user_id"],
        is_read=is_read,
        notification_type=type,
        limit=limit,
        offset=offset,
    )


@router.get("/unread-count", response_model=UnreadCountOut)
def get_unread_notification_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = crud_notifications.count_unread_notifications(db, current_user["user_id"])
    return {"unread_count": count}


@router.patch("/read-all", response_model=MarkAllReadOut)
def mark_all_notifications_as_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated_count = crud_notifications.mark_all_notifications_read(db, current_user["user_id"])
    return {
        "updated_count": updated_count,
        "message": "Đã đánh dấu tất cả thông báo là đã đọc",
    }


@router.get("/{notification_id}", response_model=NotificationOut)
def get_notification_detail(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_own_notification_or_raise(db, notification_id, current_user)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_single_notification_as_read(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_own_notification_or_raise(db, notification_id, current_user)
    updated = crud_notifications.mark_notification_read(db, notification_id)
    return updated


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_single_notification(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_own_notification_or_raise(db, notification_id, current_user)
    crud_notifications.delete_notification(db, notification_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
