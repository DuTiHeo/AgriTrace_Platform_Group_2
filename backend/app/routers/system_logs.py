# backend/app/routers/system_logs.py
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud import system_logs as crud_logs
from app.db.session import get_db
from app.routers.user import require_role
from app.schemas.system_logs import (
    SystemLogCreate,
    SystemLogOut,
    SystemLogPagination,
    SystemLogResult,
)

router = APIRouter()


@router.get(
    "",
    response_model=SystemLogPagination,
    dependencies=[Depends(require_role("admin"))],
)
def list_system_logs(
    actor_id: Optional[UUID] = Query(None, description="Lọc theo ID người thực hiện"),
    target_type: Optional[str] = Query(None, description="Lọc theo loại đối tượng (users, seasons, tasks...)"),
    action: Optional[str] = Query(None, description="Tìm theo hành động (chứa từ khóa)"),
    result: Optional[SystemLogResult] = Query(None, description="Lọc theo kết quả: success hoặc failed"),
    from_time: Optional[datetime] = Query(None, description="Từ thời điểm"),
    to_time: Optional[datetime] = Query(None, description="Đến thời điểm"),
    limit: int = Query(50, ge=1, le=200, description="Số lượng bản ghi tối đa"),
    offset: int = Query(0, ge=0, description="Độ lệch phân trang"),
    db: Session = Depends(get_db),
):
    """
    Giám sát nhật ký hoạt động hệ thống (Audit Trail) - UC-A02.2.
    Chỉ dành riêng cho Quản trị viên hệ thống (Admin).
    """
    result_val = result.value if result else None
    items = crud_logs.list_system_logs(
        db,
        actor_id=actor_id,
        target_type=target_type,
        action=action,
        result=result_val,
        from_time=from_time,
        to_time=to_time,
        limit=limit,
        offset=offset,
    )
    total = crud_logs.count_system_logs(
        db,
        actor_id=actor_id,
        target_type=target_type,
        action=action,
        result=result_val,
        from_time=from_time,
        to_time=to_time,
    )
    return {
        "total": total,
        "items": items,
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/{log_id}",
    response_model=SystemLogOut,
    dependencies=[Depends(require_role("admin"))],
)
def get_system_log(
    log_id: UUID,
    db: Session = Depends(get_db),
):
    """Xem chi tiết 1 bản ghi nhật ký hệ thống (Admin)."""
    log = crud_logs.get_system_log(db, log_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi nhật ký")
    return log


@router.post(
    "",
    response_model=SystemLogOut,
    status_code=status.HTTP_201_CREATED,
)
def create_system_log(
    payload: SystemLogCreate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Ghi một sự kiện kiểm toán hệ thống (Admin hoặc hệ thống nội bộ).
    Nếu không cung cấp actor_id, sẽ tự gán từ token người dùng hiện tại.
    """
    actor_id = payload.actor_id or current_user["user_id"]
    return crud_logs.create_system_log(
        db,
        actor_id=actor_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        action=payload.action,
        result=payload.result.value,
    )