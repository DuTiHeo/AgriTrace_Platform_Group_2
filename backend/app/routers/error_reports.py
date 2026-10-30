# backend/app/routers/error_reports.py
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.crud import error_reports as crud_errors
from app.db.session import get_db
from app.routers.user import ensure_owns_org, require_role
from app.schemas.error_reports import (
    ErrorReportCreate,
    ErrorReportOut,
    ErrorReportStatus,
    ErrorReportUpdate,
)

router = APIRouter()


def _ensure_can_access_report(report: dict, current_user: dict, db: Session) -> None:
    """Kiểm tra quyền xem báo cáo lỗi: Admin xem hết, Owner xem farm mình, Worker/Leader xem báo cáo do mình gửi."""
    role = current_user["role"]
    if role == "admin":
        return
    if role == "owner":
        if report.get("owner_id") == current_user["user_id"]:
            return
        ensure_owns_org(db, current_user, report["org_id"])
        return
    if role in ("leader", "worker"):
        if report["user_id"] == current_user["user_id"]:
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập báo cáo này")


@router.get("", response_model=list[ErrorReportOut])
def list_error_reports(
    status_filter: Optional[ErrorReportStatus] = Query(None, alias="status", description="Lọc theo trạng thái"),
    error_type: Optional[str] = Query(None, description="Lọc theo loại lỗi"),
    org_id: Optional[UUID] = Query(None, description="Admin/Owner lọc theo nông trại"),
    user_id: Optional[UUID] = Query(None, description="Admin lọc theo người gửi báo cáo"),
    limit: int = Query(50, ge=1, le=100, description="Số lượng bản ghi tối đa"),
    offset: int = Query(0, ge=0, description="Độ lệch phân trang"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Xem danh sách báo cáo lỗi (UC-SH03 & UC-A03.1):
    - Admin: xem tất cả các báo cáo trong hệ thống hoặc lọc theo org_id / user_id
    - Owner: xem các báo cáo sự cố phát sinh tại nông trại thuộc sở hữu
    - Leader/Worker: chỉ xem các báo cáo do chính mình gửi
    """
    role = current_user["role"]

    if role == "admin":
        scope_org_id = org_id
        scope_owner_id = None
        scope_user_id = user_id
    elif role == "owner":
        if org_id:
            ensure_owns_org(db, current_user, org_id)
            scope_org_id = org_id
            scope_owner_id = None
        else:
            scope_org_id = None
            scope_owner_id = current_user["user_id"]
        scope_user_id = None
    else:  # leader, worker
        scope_org_id = None
        scope_owner_id = None
        scope_user_id = current_user["user_id"]

    return crud_errors.list_error_reports(
        db,
        status=status_filter.value if status_filter else None,
        error_type=error_type,
        scope_org_id=scope_org_id,
        scope_owner_id=scope_owner_id,
        scope_user_id=scope_user_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{report_id}", response_model=ErrorReportOut)
def get_error_report(
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Xem chi tiết 1 báo cáo sự cố (UC-A03.1 / UC-SH03)."""
    report = crud_errors.get_error_report(db, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy báo cáo sự cố")

    _ensure_can_access_report(report, current_user, db)
    return report


@router.post("", response_model=ErrorReportOut, status_code=status.HTTP_201_CREATED)
def create_error_report(
    payload: ErrorReportCreate,
    org_id: Optional[UUID] = Query(None, description="ID nông trại liên quan (bắt buộc với Admin/Owner nếu tài khoản không gắn cứng org_id)"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Gửi báo cáo lỗi phần mềm kỹ thuật (UC-SH03).
    Hệ thống tự động liên kết user_id và org_id của người dùng.
    """
    user_id = current_user["user_id"]
    target_org_id = current_user.get("org_id")

    # Nếu tài khoản chưa có org_id trực tiếp (Owner hoặc Admin)
    if not target_org_id:
        if org_id:
            if current_user["role"] == "owner":
                ensure_owns_org(db, current_user, org_id)
            target_org_id = org_id
        elif current_user["role"] == "owner":
            # Lấy nông trại đầu tiên của Owner
            first_org = db.execute(
                text("SELECT org_id FROM organizations WHERE owner_id = :owner_id AND status != 'suspended' ORDER BY created_at ASC LIMIT 1"),
                {"owner_id": user_id},
            ).mappings().first()
            if first_org:
                target_org_id = first_org["org_id"]
        elif current_user["role"] == "admin":
            # Admin nếu không truyền org_id thì lấy tạm org đầu tiên đang hoạt động
            first_org = db.execute(
                text("SELECT org_id FROM organizations WHERE status != 'suspended' ORDER BY created_at ASC LIMIT 1")
            ).mappings().first()
            if first_org:
                target_org_id = first_org["org_id"]

    if not target_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy thông tin nông trại liên quan để ghi nhận báo cáo",
        )

    return crud_errors.create_error_report(
        db,
        user_id=user_id,
        org_id=target_org_id,
        error_type=payload.error_type,
        description=payload.description,
        screenshot_url=payload.screenshot_url,
    )


@router.patch("/{report_id}", response_model=ErrorReportOut)
def update_error_report(
    report_id: UUID,
    payload: ErrorReportUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Quản trị viên cập nhật tiến độ và phản hồi hướng dẫn xử lý (UC-A03.2)."""
    report = crud_errors.get_error_report(db, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy báo cáo sự cố")

    status_str = payload.status.value if payload.status else None
    updated = crud_errors.update_error_report(
        db,
        report_id,
        status=status_str,
        admin_response=payload.admin_response,
    )
    return updated


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_error_report(
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Xóa báo cáo sự cố:
    - Admin có quyền xóa bất kỳ báo cáo nào.
    - Người gửi có quyền xóa báo cáo của mình nếu trạng thái vẫn là 'new'.
    """
    report = crud_errors.get_error_report(db, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy báo cáo sự cố")

    role = current_user["role"]
    if role != "admin":
        if report["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa báo cáo này")
        if report["status"] != "new":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa báo cáo đã được tiếp nhận xử lý",
            )

    crud_errors.delete_error_report(db, report_id)
    return None