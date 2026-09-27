# backend/app/routers/batch_seasons.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.routers.user import require_role, ensure_owns_org
from app.crud import batch_seasons as crud_bs
from app.crud import havest_batches as crud_batches
from app.crud import season as crud_season
from app.schemas.batch_seasons import (
    BatchSeasonCreate,
    BatchSeasonUpdate,
    BatchSeasonDetail,
)

router = APIRouter()


@router.post("", response_model=BatchSeasonDetail, status_code=status.HTTP_201_CREATED)
def link_season_to_batch(
    payload: BatchSeasonCreate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):

    is_valid, err_msg, org_id = crud_bs.validate_batch_and_season(
        db,
        batch_id=payload.batch_id,
        season_id=payload.season_id,
    )
    if not is_valid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, err_msg)

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, org_id)

    try:
        bs_record = crud_bs.create_or_reactivate_batch_season(
            db,
            batch_id=payload.batch_id,
            season_id=payload.season_id,
            contributed_quantity=payload.contributed_quantity,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    return bs_record


@router.get("/by-batch/{batch_id}", response_model=list[BatchSeasonDetail])
def get_seasons_in_batch(
    batch_id: UUID,
    include_cancelled: bool = Query(False, description="Bao gồm các liên kết đã bị xóa mềm"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    batch = crud_batches.get_harvest_batch(db, batch_id, include_seasons=False)
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy lô thu hoạch")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, batch["org_id"])
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != batch["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn không thuộc nông trại này")

    return crud_bs.list_seasons_by_batch(db, batch_id, include_cancelled=include_cancelled)


@router.get("/by-season/{season_id}")
def get_batches_of_season(
    season_id: UUID,
    include_cancelled: bool = Query(False, description="Bao gồm các liên kết đã bị xóa mềm"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    season = crud_season.get_season(db, season_id)
    if not season:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy mùa vụ")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, season["org_id"])
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != season["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn không thuộc nông trại này")

    return crud_bs.list_batches_by_season(db, season_id, include_cancelled=include_cancelled)


@router.get("/{batch_id}/{season_id}", response_model=BatchSeasonDetail)
def get_batch_season_detail(
    batch_id: UUID,
    season_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    link = crud_bs.get_batch_season(db, batch_id, season_id)
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy liên kết giữa lô thu hoạch và mùa vụ này")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, link["org_id"])
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != link["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bạn không thuộc nông trại này")

    return link


@router.put("/{batch_id}/{season_id}", response_model=BatchSeasonDetail)
@router.patch("/{batch_id}/{season_id}", response_model=BatchSeasonDetail)
def update_contributed_quantity(
    batch_id: UUID,
    season_id: UUID,
    payload: BatchSeasonUpdate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):

    link = crud_bs.get_batch_season(db, batch_id, season_id)
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy liên kết giữa lô thu hoạch và mùa vụ")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, link["org_id"])

    updated = crud_bs.update_batch_season(
        db,
        batch_id=batch_id,
        season_id=season_id,
        contributed_quantity=payload.contributed_quantity,
    )
    return updated


@router.delete("/{batch_id}/{season_id}", response_model=BatchSeasonDetail)
def remove_season_from_batch(
    batch_id: UUID,
    season_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):

    link = crud_bs.get_batch_season(db, batch_id, season_id)
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Không tìm thấy liên kết giữa lô thu hoạch và mùa vụ")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, link["org_id"])

    soft_deleted = crud_bs.soft_delete_batch_season(db, batch_id, season_id)
    return soft_deleted