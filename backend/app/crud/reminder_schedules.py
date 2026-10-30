# backend/app/crud/reminder_schedules.py
from datetime import date
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_reminder(db: Session, reminder_id: UUID) -> Optional[dict]:
    """Lấy chi tiết 1 lịch nhắc nhở kèm thông tin nông trại, thửa đất và giống cây."""
    row = db.execute(
        text("""
            SELECT 
                r.reminder_id,
                r.season_id,
                r.milestone_type,
                r.remind_date,
                r.channel,
                r.status,
                r.created_at,
                p.code AS plot_code,
                p.org_id,
                o.owner_id,
                c.name AS crop_name
            FROM reminder_schedules r
            JOIN seasons s ON r.season_id = s.season_id
            JOIN plots p ON s.plot_id = p.plot_id
            JOIN organizations o ON p.org_id = o.org_id
            JOIN crop_catalog c ON s.crop_id = c.crop_id
            WHERE r.reminder_id = :reminder_id
        """),
        {"reminder_id": reminder_id},
    ).mappings().first()

    return dict(row) if row else None


def list_reminders(
    db: Session,
    *,
    season_id: Optional[UUID] = None,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    scope_org_id: Optional[UUID] = None,
    scope_owner_id: Optional[UUID] = None,
) -> list[dict]:
    """
    Lấy danh sách nhắc nhở kèm Data Isolation theo org_id hoặc owner_id.
    """
    conditions = ["1=1"]
    params: dict[str, Any] = {}

    if season_id:
        conditions.append("r.season_id = :season_id")
        params["season_id"] = season_id
    if status:
        conditions.append("r.status = :status")
        params["status"] = status
    if channel:
        conditions.append("r.channel = :channel")
        params["channel"] = channel
    if from_date:
        conditions.append("r.remind_date >= :from_date")
        params["from_date"] = from_date
    if to_date:
        conditions.append("r.remind_date <= :to_date")
        params["to_date"] = to_date

    # Data Isolation
    if scope_org_id:
        conditions.append("p.org_id = :scope_org_id")
        params["scope_org_id"] = scope_org_id
    elif scope_owner_id:
        conditions.append("o.owner_id = :scope_owner_id")
        params["scope_owner_id"] = scope_owner_id

    where_clause = " AND ".join(conditions)

    rows = db.execute(
        text(f"""
            SELECT 
                r.reminder_id,
                r.season_id,
                r.milestone_type,
                r.remind_date,
                r.channel,
                r.status,
                r.created_at,
                p.code AS plot_code,
                c.name AS crop_name
            FROM reminder_schedules r
            JOIN seasons s ON r.season_id = s.season_id
            JOIN plots p ON s.plot_id = p.plot_id
            JOIN organizations o ON p.org_id = o.org_id
            JOIN crop_catalog c ON s.crop_id = c.crop_id
            WHERE {where_clause}
            ORDER BY r.remind_date ASC, r.created_at ASC
        """),
        params,
    ).mappings().all()

    return [dict(r) for r in rows]


def create_reminder(
    db: Session,
    *,
    season_id: UUID,
    milestone_type: str,
    remind_date: date,
    channel: str = "push",
    status: str = "scheduled",
) -> dict:
    """Tạo lịch nhắc nhở mới và lưu vào cơ sở dữ liệu."""
    row = db.execute(
        text("""
            INSERT INTO reminder_schedules (season_id, milestone_type, remind_date, channel, status) 
            VALUES (:season_id, :milestone_type, :remind_date, :channel, :status)
            RETURNING reminder_id, season_id, milestone_type, remind_date, channel, status, created_at
        """),
        {
            "season_id": season_id,
            "milestone_type": milestone_type,
            "remind_date": remind_date,
            "channel": channel,
            "status": status,
        },
    ).mappings().first()
    db.commit()
    return dict(row) if row else {}


def update_reminder(db: Session, reminder_id: UUID, **fields) -> Optional[dict]:
    """Cập nhật các trường thông tin của bản ghi nhắc nhở."""
    allowed_fields = {"milestone_type", "remind_date", "channel", "status"}
    update_data = {k: v for k, v in fields.items() if k in allowed_fields and v is not None}
    if not update_data:
        return get_reminder(db, reminder_id)

    set_clauses = [f"{col} = :{col}" for col in update_data.keys()]
    params = dict(update_data)
    params["reminder_id"] = reminder_id

    row = db.execute(
        text(f"""
            UPDATE reminder_schedules
            SET {', '.join(set_clauses)}
            WHERE reminder_id = :reminder_id
            RETURNING reminder_id, season_id, milestone_type, remind_date, channel, status, created_at
        """),
        params,
    ).mappings().first()
    db.commit()
    return dict(row) if row else None


def delete_reminder(db: Session, reminder_id: UUID) -> bool:
    """Xóa lịch nhắc nhở khỏi cơ sở dữ liệu."""
    res = db.execute(
        text("DELETE FROM reminder_schedules WHERE reminder_id = :reminder_id"),
        {"reminder_id": reminder_id},
    )
    db.commit()
    return (res.rowcount or 0) > 0


def dispatch_due_reminders(
    db: Session,
    target_date: Optional[date] = None,
    scope_org_id: Optional[UUID] = None,
    scope_owner_id: Optional[UUID] = None,
    season_id: Optional[UUID] = None,
) -> list[UUID]:
    """
    Quét và cập nhật các lịch nhắc nhở có remind_date <= target_date (mặc định CURRENT_DATE) và status = 'scheduled'
    sang status = 'sent'.
    Nhờ Trigger trg_notify_on_reminder_sent trong DB, thông báo notifications sẽ tự động được sinh ra!
    Trả về danh sách reminder_id đã phát hành.
    """
    conditions = [
        "r.status = 'scheduled'",
    ]
    params: dict[str, Any] = {}

    if target_date:
        conditions.append("r.remind_date <= :target_date")
        params["target_date"] = target_date
    else:
        conditions.append("r.remind_date <= CURRENT_DATE")

    if season_id:
        conditions.append("r.season_id = :season_id")
        params["season_id"] = season_id

    if scope_org_id:
        conditions.append("p.org_id = :scope_org_id")
        params["scope_org_id"] = scope_org_id
    elif scope_owner_id:
        conditions.append("o.owner_id = :scope_owner_id")
        params["scope_owner_id"] = scope_owner_id

    where_clause = " AND ".join(conditions)

    rows = db.execute(
        text(f"""
            UPDATE reminder_schedules r
            SET status = 'sent'
            FROM seasons s
            JOIN plots p ON s.plot_id = p.plot_id
            JOIN organizations o ON p.org_id = o.org_id
            WHERE r.season_id = s.season_id
              AND {where_clause}
            RETURNING r.reminder_id
        """),
        params,
    ).mappings().all()

    db.commit()
    return [r["reminder_id"] for r in rows]