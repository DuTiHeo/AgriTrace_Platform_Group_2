from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID


def get_user_by_phone(db: Session, phone: str) -> dict | None:
    row = db.execute(text("SELECT * FROM users WHERE phone = :phone"), {"phone": phone}).mappings().first()
    return dict(row) if row else None


def get_user(db: Session, user_id: UUID) -> dict | None:
    row = db.execute(text("SELECT * FROM users WHERE user_id = :user_id"), {"user_id": user_id}).mappings().first()
    return dict(row) if row else None

def update_password(db: Session, user_id: UUID, new_password_hash: str) -> None:
    db.execute(
        text("UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id"),
        {"password_hash": new_password_hash, "user_id": user_id},
    )
    db.commit()