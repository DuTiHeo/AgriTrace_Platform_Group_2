from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID


def add_to_blacklist(db: Session, jti: str, user_id: UUID, expires_at: datetime) -> None:
    db.execute(
        text("""
            INSERT INTO token_blacklist (jti, user_id, expires_at)
            VALUES (:jti, :user_id, :expires_at)
            ON CONFLICT (jti) DO NOTHING
        """),
        {"jti": jti, "user_id": user_id, "expires_at": expires_at},
    )
    db.commit()


def is_blacklisted(db: Session, jti: str) -> bool:
    row = db.execute(
        text("SELECT 1 FROM token_blacklist WHERE jti = :jti"),
        {"jti": jti},
    ).first()
    return row is not None


def cleanup_expired(db: Session) -> int:
    #Xoa cac ban ghi da het han tu nhien - goi dinh ky (cron) hoac o dau moi lan logout
    result = db.execute(
        text("DELETE FROM token_blacklist WHERE expires_at < :now"),
        {"now": datetime.now(timezone.utc)},
    )
    db.commit()
    return result.rowcount