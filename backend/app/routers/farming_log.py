from pathlib import Path
import os
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.crud import farming_log as crud_farming_log
from app.db.session import get_db
from app.routers.user import ensure_owns_org, require_role
from app.schemas.farming_log import FarmingLogCreate, FarmingLogDetail, FarmingLogSummary, LogPhotoOut


router = APIRouter()

UPLOAD_ROOT = Path(os.getenv("UPLOAD_DIR", "uploads"))
FARMING_LOG_UPLOAD_DIR = UPLOAD_ROOT / "farming-logs"
MAX_PHOTOS_PER_LOG = 5
MAX_PHOTO_BYTES = 5 * 1024 * 1024
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg"}


def _ensure_can_read_log(log: dict, current_user: dict, db: Session) -> None:
    role = current_user["role"]
    if role == "admin":
        return
    if role == "owner":
        ensure_owns_org(db, current_user, log["org_id"])
        return
    user_team_id = current_user.get("team_id")
    if role in ("leader", "worker") and user_team_id and log["team_id"] == user_team_id:
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong co quyen xem nhat ky nay")


def _with_children(db: Session, log: dict) -> dict:
    log["photos"] = crud_farming_log.list_photos(db, log["log_id"])
    log["notes"] = crud_farming_log.list_notes(db, log["log_id"])
    return log


@router.get("", response_model=list[FarmingLogSummary])
def list_farming_logs(
    org_id: UUID | None = Query(None, description="Admin/Owner loc theo nong trai"),
    season_id: UUID | None = Query(None, description="Loc theo mua vu"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user["role"]

    if role == "admin":
        scope_org_id = org_id
        scope_owner_id = None
        scope_team_id = None
    elif role == "owner":
        if org_id:
            ensure_owns_org(db, current_user, org_id)
            scope_org_id = org_id
            scope_owner_id = None
        else:
            scope_org_id = None
            scope_owner_id = current_user["user_id"]
        scope_team_id = None
    elif role in ("leader", "worker"):
        if org_id and org_id != current_user.get("org_id"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong co quyen xem nhat ky cua nong trai khac")
        if not current_user.get("team_id"):
            return []
        scope_org_id = current_user.get("org_id")
        scope_owner_id = None
        scope_team_id = current_user["team_id"]
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong co quyen xem nhat ky canh tac")

    return crud_farming_log.list_logs(
        db,
        org_id=scope_org_id,
        owner_id=scope_owner_id,
        team_id=scope_team_id,
        season_id=season_id,
    )


@router.get("/{log_id}", response_model=FarmingLogDetail)
def get_farming_log(
    log_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = crud_farming_log.get_log(db, log_id)
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nhat ky canh tac")
    _ensure_can_read_log(log, current_user, db)
    return _with_children(db, log)


@router.post("", response_model=FarmingLogDetail, status_code=status.HTTP_201_CREATED)
def create_farming_log(
    payload: FarmingLogCreate,
    current_user: dict = Depends(require_role("worker", "leader")),
    db: Session = Depends(get_db),
):
    season = crud_farming_log.get_season_scope(db, payload.season_id)
    if not season:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay mua vu")
    if season["org_id"] != current_user.get("org_id"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong thuoc nong trai chua mua vu nay")
    if season["status"] not in ("growing", "ready_to_harvest"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mua vu da hoan tat, khong the ghi them nhat ky")

    log = crud_farming_log.create_log(
        db,
        season_id=payload.season_id,
        user_id=current_user["user_id"],
        activity_type=payload.activity_type,
        content=payload.content,
        latitude=payload.gps.latitude,
        longitude=payload.gps.longitude,
    )
    return _with_children(db, log)


@router.post("/{log_id}/photos", response_model=list[LogPhotoOut], status_code=status.HTTP_201_CREATED)
async def upload_log_photos(
    log_id: UUID,
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(require_role("worker", "leader")),
    db: Session = Depends(get_db),
):
    log = crud_farming_log.get_log(db, log_id)
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nhat ky canh tac")
    if log["user_id"] != current_user["user_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Chi tac gia nhat ky moi duoc upload anh")
    if not files:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can gui it nhat mot anh")

    existing_count = crud_farming_log.count_photos(db, log_id)
    if existing_count + len(files) > MAX_PHOTOS_PER_LOG:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Moi nhat ky chi duoc toi da 5 anh")

    prepared_files: list[tuple[str, bytes]] = []
    for upload in files:
        extension = Path(upload.filename or "").suffix.lower()
        if extension not in ALLOWED_PHOTO_EXTENSIONS:
            # Backend khong tu convert HEIC -> JPEG; FE can convert anh iPhone sang .jpg/.jpeg truoc khi upload.
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Chi chap nhan anh dinh dang .jpg hoac .jpeg")

        content = await upload.read()
        if len(content) > MAX_PHOTO_BYTES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Moi anh khong duoc vuot qua 5MB")
        prepared_files.append((extension, content))

    destination = FARMING_LOG_UPLOAD_DIR / str(log_id)
    destination.mkdir(parents=True, exist_ok=True)

    urls: list[str] = []
    for extension, content in prepared_files:
        filename = f"{uuid4()}{extension}"
        path = destination / filename
        path.write_bytes(content)
        urls.append(f"/uploads/farming-logs/{log_id}/{filename}")

    return crud_farming_log.add_photos(db, log_id, urls)
