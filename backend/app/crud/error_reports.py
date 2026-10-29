# backend/app/crud/error_reports.py
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_error_report(db: Session, report_id: UUID) -> Optional[dict]:
    """Lấy chi tiết 1 báo cáo sự cố kèm thông tin người gửi và nông trại liên quan."""
    row = db.execute(
        text("""
            SELECT 
                e.report_id,
                e.user_id,
                u.full_name AS user_full_name,
                u.phone AS user_phone,
                e.org_id,
                o.name AS org_name,
                o.owner_id,
                e.error_type,
                e.description,
                e.screenshot_url,
                e.status,
                e.admin_response,
                e.submitted_at,
                e.updated_at
            FROM error_reports e
            JOIN users u ON e.user_id = u.user_id
            JOIN organizations o ON e.org_id = o.org_id
            WHERE e.report_id = :report_id
        """),
        {"report_id": report_id},
    ).mappings().first()

    return dict(row) if row else None


def list_error_reports(
    db: Session,
    *,
    status: Optional[str] = None,
    error_type: Optional[str] = None,
    scope_org_id: Optional[UUID] = None,
    scope_owner_id: Optional[UUID] = None,
    scope_user_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """
    Lấy danh sách báo cáo lỗi kèm Data Isolation theo vai trò:
    - Admin: xem toàn bộ hoặc lọc theo scope_org_id
    - Owner: xem trong phạm vi các nông trại thuộc sở hữu (scope_owner_id / scope_org_id)
    - Worker/Leader: chỉ xem báo cáo do chính mình gửi (scope_user_id)
    """
    conditions = ["1=1"]
    params: dict[str, Any] = {"limit": limit, "offset": offset}

    if status:
        conditions.append("e.status = :status")
        params["status"] = status
    if error_type:
        conditions.append("e.error_type = :error_type")
        params["error_type"] = error_type

    # Data Isolation
    if scope_user_id:
        conditions.append("e.user_id = :scope_user_id")
        params["scope_user_id"] = scope_user_id
    elif scope_org_id:
        conditions.append("e.org_id = :scope_org_id")
        params["scope_org_id"] = scope_org_id
    elif scope_owner_id:
        conditions.append("o.owner_id = :scope_owner_id")
        params["scope_owner_id"] = scope_owner_id

    where_clause = " AND ".join(conditions)

    rows = db.execute(
        text(f"""
            SELECT 
                e.report_id,
                e.user_id,
                u.full_name AS user_full_name,
                u.phone AS user_phone,
                e.org_id,
                o.name AS org_name,
                o.owner_id,
                e.error_type,
                e.description,
                e.screenshot_url,
                e.status,
                e.admin_response,
                e.submitted_at,
                e.updated_at
            FROM error_reports e
            JOIN users u ON e.user_id = u.user_id
            JOIN organizations o ON e.org_id = o.org_id
            WHERE {where_clause}
            ORDER BY e.submitted_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()

    return [dict(r) for r in rows]


def create_error_report(
    db: Session,
    *,
    user_id: UUID,
    org_id: UUID,
    error_type: Optional[str] = "bug",
    description: str,
    screenshot_url: Optional[str] = None,
) -> dict:
    """Tạo báo cáo lỗi mới từ người dùng."""
    row = db.execute(
        text("""
            INSERT INTO error_reports (user_id, org_id, error_type, description, screenshot_url, status)
            VALUES (:user_id, :org_id, :error_type, :description, :screenshot_url, 'new')
            RETURNING report_id, user_id, org_id, error_type, description, screenshot_url, status, admin_response, submitted_at, updated_at
        """),
        {
            "user_id": user_id,
            "org_id": org_id,
            "error_type": error_type,
            "description": description,
            "screenshot_url": screenshot_url,
        },
    ).mappings().first()
    db.commit()

    # Truy vấn đầy đủ để có user_full_name, user_phone, org_name
    return get_error_report(db, row["report_id"]) if row else {}


def update_error_report(
    db: Session,
    report_id: UUID,
    *,
    status: Optional[str] = None,
    admin_response: Optional[str] = None,
) -> Optional[dict]:
    """Cập nhật trạng thái xử lý và phản hồi của quản trị viên (UC-A03.2)."""
    updates = []
    params: dict[str, Any] = {"report_id": report_id}

    if status is not None:
        updates.append("status = :status")
        params["status"] = status
    if admin_response is not None:
        updates.append("admin_response = :admin_response")
        params["admin_response"] = admin_response

    if not updates:
        return get_error_report(db, report_id)

    updates.append("updated_at = CURRENT_TIMESTAMP")

    db.execute(
        text(f"""
            UPDATE error_reports
            SET {', '.join(updates)}
            WHERE report_id = :report_id
        """),
        params,
    )
    db.commit()
    return get_error_report(db, report_id)


def delete_error_report(db: Session, report_id: UUID) -> bool:
    """Xóa báo cáo sự cố."""
    res = db.execute(
        text("DELETE FROM error_reports WHERE report_id = :report_id"),
        {"report_id": report_id},
    )
    db.commit()
    return (res.rowcount or 0) > 0