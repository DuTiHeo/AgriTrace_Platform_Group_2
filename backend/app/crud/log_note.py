from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_note(db: Session, *, log_id: UUID, leader_id: UUID, content: str) -> dict:
    row = db.execute(
        text("""
            INSERT INTO log_notes (log_id, leader_id, content)
            VALUES (:log_id, :leader_id, :content)
            RETURNING note_id
        """),
        {"log_id": log_id, "leader_id": leader_id, "content": content},
    ).mappings().first()
    db.commit()
    return get_note(db, row["note_id"])


def get_note(db: Session, note_id: UUID) -> dict | None:
    row = db.execute(
        text("""
            SELECT ln.note_id, ln.log_id, ln.leader_id, u.full_name AS leader_name,
                   ln.content, ln.resolved, ln.created_at
            FROM log_notes ln
            JOIN users u ON ln.leader_id = u.user_id
            WHERE ln.note_id = :note_id
        """),
        {"note_id": note_id},
    ).mappings().first()
    return dict(row) if row else None


def set_resolved(db: Session, note_id: UUID, resolved: bool) -> dict:
    row = db.execute(
        text("""
            UPDATE log_notes
            SET resolved = :resolved
            WHERE note_id = :note_id
            RETURNING note_id
        """),
        {"note_id": note_id, "resolved": resolved},
    ).mappings().first()
    db.commit()
    return get_note(db, row["note_id"])
