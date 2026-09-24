from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import farming_log as crud_farming_log
from app.crud import log_note as crud_log_note
from app.db.session import get_db
from app.routers.user import ensure_owns_org, require_role
from app.schemas.log_note import LogNoteCreate, LogNoteOut, LogNoteUpdate


router = APIRouter()


def _ensure_can_write_note(log: dict, current_user: dict, db: Session) -> None:
    role = current_user["role"]
    if role == "leader":
        user_team_id = current_user.get("team_id")
        if user_team_id and log["team_id"] == user_team_id:
            return
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban chi duoc ghi chu nhat ky cua to minh")
    if role == "owner":
        ensure_owns_org(db, current_user, log["org_id"])
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong co quyen ghi chu nhat ky")


@router.post("", response_model=LogNoteOut, status_code=status.HTTP_201_CREATED)
def create_log_note(
    payload: LogNoteCreate,
    current_user: dict = Depends(require_role("leader", "owner")),
    db: Session = Depends(get_db),
):
    log = crud_farming_log.get_log(db, payload.log_id)
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nhat ky canh tac")
    _ensure_can_write_note(log, current_user, db)

    # Dot 2 bo qua notifications: khong insert vao bang notifications o day.
    return crud_log_note.create_note(
        db,
        log_id=payload.log_id,
        leader_id=current_user["user_id"],
        content=payload.content,
    )


@router.patch("/{note_id}", response_model=LogNoteOut)
def update_log_note_resolved(
    note_id: UUID,
    payload: LogNoteUpdate,
    current_user: dict = Depends(require_role("leader", "owner")),
    db: Session = Depends(get_db),
):
    note = crud_log_note.get_note(db, note_id)
    if not note:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay ghi chu")

    log = crud_farming_log.get_log(db, note["log_id"])
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nhat ky canh tac")
    _ensure_can_write_note(log, current_user, db)

    return crud_log_note.set_resolved(db, note_id, payload.resolved)
