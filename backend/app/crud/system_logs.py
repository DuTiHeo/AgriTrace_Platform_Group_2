# backend/app/crud/system_logs.py
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_system_log(
    db: Session,
    *,
    actor_id: Optional[UUID] = None,
    target_type: Optional[str] = None,
    target_id: Optional[UUID] = None,
    action: str,
    result: str = "success",
) -> dict:
    """
    Ghi một bản ghi nhật ký hệ thống (Audit Trail).
    Có thể được gọi trực tiếp từ router hoặc từ các service khác khi có sự kiện quan trọng.
    """
    row = db.execute(
        text("""
            INSERT INTO system_logs (actor_id, target_type, target_id, action, result)
            VALUES (:actor_id, :target_type, :target_id, :action, :result)
            RETURNING log_id, actor_id, target_type, target_id, action, performed_at, result
        """),
        {
            "actor_id": actor_id,
            "target_type": target_type,
            "target_id": target_id,
            "action": action,
            "result": result,
        },
    ).mappings().first()
    db.commit()

    return get_system_log(db, row["log_id"]) if row else {}


def get_system_log(db: Session, log_id: UUID) -> Optional[dict]:
    """Lấy chi tiết 1 bản ghi log kèm thông tin người thực hiện (nếu có)."""
    row = db.execute(
        text("""
            SELECT 
                s.log_id,
                s.actor_id,
                u.full_name AS actor_name,
                u.phone AS actor_phone,
                u.role AS actor_role,
                s.target_type,
                s.target_id,
                s.action,
                s.performed_at,
                s.result
            FROM system_logs s
            LEFT JOIN users u ON s.actor_id = u.user_id
            WHERE s.log_id = :log_id
        """),
        {"log_id": log_id},
    ).mappings().first()

    return dict(row) if row else None


def list_system_logs(
    db: Session,
    *,
    actor_id: Optional[UUID] = None,
    target_type: Optional[str] = None,
    action: Optional[str] = None,
    result: Optional[str] = None,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Lấy danh sách nhật ký hệ thống kèm bộ lọc đa tiêu chí và phân trang."""
    conditions = ["1=1"]
    params: dict[str, Any] = {"limit": limit, "offset": offset}

    if actor_id:
        conditions.append("s.actor_id = :actor_id")
        params["actor_id"] = actor_id
    if target_type:
        conditions.append("s.target_type = :target_type")
        params["target_type"] = target_type
    if action:
        conditions.append("s.action ILIKE :action")
        params["action"] = f"%{action}%"
    if result:
        conditions.append("s.result = :result")
        params["result"] = result
    if from_time:
        conditions.append("s.performed_at >= :from_time")
        params["from_time"] = from_time
    if to_time:
        conditions.append("s.performed_at <= :to_time")
        params["to_time"] = to_time

    where_clause = " AND ".join(conditions)

    rows = db.execute(
        text(f"""
            SELECT 
                s.log_id,
                s.actor_id,
                u.full_name AS actor_name,
                u.phone AS actor_phone,
                u.role AS actor_role,
                s.target_type,
                s.target_id,
                s.action,
                s.performed_at,
                s.result
            FROM system_logs s
            LEFT JOIN users u ON s.actor_id = u.user_id
            WHERE {where_clause}
            ORDER BY s.performed_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()

    return [dict(r) for r in rows]


def count_system_logs(
    db: Session,
    *,
    actor_id: Optional[UUID] = None,
    target_type: Optional[str] = None,
    action: Optional[str] = None,
    result: Optional[str] = None,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
) -> int:
    """Đếm tổng số bản ghi logs theo bộ lọc phục vụ phân trang."""
    conditions = ["1=1"]
    params: dict[str, Any] = {}

    if actor_id:
        conditions.append("s.actor_id = :actor_id")
        params["actor_id"] = actor_id
    if target_type:
        conditions.append("s.target_type = :target_type")
        params["target_type"] = target_type
    if action:
        conditions.append("s.action ILIKE :action")
        params["action"] = f"%{action}%"
    if result:
        conditions.append("s.result = :result")
        params["result"] = result
    if from_time:
        conditions.append("s.performed_at >= :from_time")
        params["from_time"] = from_time
    if to_time:
        conditions.append("s.performed_at <= :to_time")
        params["to_time"] = to_time

    where_clause = " AND ".join(conditions)

    val = db.execute(
        text(f"SELECT COUNT(*) FROM system_logs s WHERE {where_clause}"),
        params,
    ).scalar()

    return val or 0