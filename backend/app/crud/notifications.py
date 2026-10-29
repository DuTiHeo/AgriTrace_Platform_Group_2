from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    content: str,
    notification_type: Optional[str] = None,
) -> dict:
    row = db.execute(
        text("""
            INSERT INTO notifications (user_id, content, type)
            VALUES (:user_id, :content, :type)
            RETURNING notification_id, user_id, content, type, is_read, created_at
        """),
        {
            "user_id": user_id,
            "content": content,
            "type": notification_type,
        },
    ).mappings().first()
    db.commit()
    return dict(row)


def get_notification(db: Session, notification_id: UUID) -> Optional[dict]:
    row = db.execute(
        text("""
            SELECT notification_id, user_id, content, type, is_read, created_at
            FROM notifications
            WHERE notification_id = :notification_id
        """),
        {"notification_id": notification_id},
    ).mappings().first()
    return dict(row) if row else None


def list_notifications(
    db: Session,
    *,
    user_id: UUID,
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    conditions = ["user_id = :user_id"]
    params: dict = {
        "user_id": user_id,
        "limit": limit,
        "offset": offset,
    }

    if is_read is not None:
        conditions.append("is_read = :is_read")
        params["is_read"] = is_read

    if notification_type is not None:
        conditions.append("type = :type")
        params["type"] = notification_type

    where_clause = " AND ".join(conditions)
    rows = db.execute(
        text(f"""
            SELECT notification_id, user_id, content, type, is_read, created_at
            FROM notifications
            WHERE {where_clause}
            ORDER BY created_at DESC, notification_id DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()
    return [dict(r) for r in rows]


def count_unread_notifications(db: Session, user_id: UUID) -> int:
    val = db.execute(
        text("""
            SELECT COUNT(*) AS unread_count
            FROM notifications
            WHERE user_id = :user_id AND is_read = FALSE
        """),
        {"user_id": user_id},
    ).scalar()
    return int(val or 0)


def mark_notification_read(db: Session, notification_id: UUID) -> Optional[dict]:
    row = db.execute(
        text("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE notification_id = :notification_id
            RETURNING notification_id, user_id, content, type, is_read, created_at
        """),
        {"notification_id": notification_id},
    ).mappings().first()
    db.commit()
    return dict(row) if row else None


def mark_all_notifications_read(db: Session, user_id: UUID) -> int:
    result = db.execute(
        text("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = :user_id AND is_read = FALSE
        """),
        {"user_id": user_id},
    )
    db.commit()
    return int(result.rowcount or 0)


def delete_notification(db: Session, notification_id: UUID) -> bool:
    row = db.execute(
        text("""
            DELETE FROM notifications
            WHERE notification_id = :notification_id
            RETURNING notification_id
        """),
        {"notification_id": notification_id},
    ).mappings().first()
    db.commit()
    return bool(row)
