# backend/app/routers/crop.py
#
# 8 route:
#   GET    /crops                                       UC-SH04.1  (Tat ca role da dang nhap)
#   GET    /crops/{crop_id}                              UC-SH04.1  (Tat ca role da dang nhap)
#   POST   /crops                                        UC-A02.1   (Admin)
#   PATCH  /crops/{crop_id}                               UC-A02.1   (Admin)
#   DELETE /crops/{crop_id}                               UC-A02.1   (Admin)
#   POST   /crops/{crop_id}/milestones                    UC-A02.1   (Admin) - du lieu nen cho UC-O03.3 (Season)
#   PATCH  /crops/{crop_id}/milestones/{milestone_id}     UC-A02.1   (Admin)
#   DELETE /crops/{crop_id}/milestones/{milestone_id}     UC-A02.1   (Admin)

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.crud import crop as crud_crop
from app.schemas.crop import *
from app.routers.user import require_role

router = APIRouter()


# GET /crops - danh sach + tim kiem. Day la du lieu danh muc DUNG CHUNG
# toan he thong (khong org_id/team_id), nen KHONG dung require_role de
# gioi han - ca 4 role da dang nhap deu xem duoc: Owner/Leader can de
# chon giong khi khoi tao mua vu (UC-O03.1), Worker xem duoc huong dan
# cham soc khi lam viec ngoai dong.
@router.get("", response_model=list[CropSummary])
def list_crops(
    keyword: str | None = Query(None, description="Tim theo ten giong"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud_crop.list_crops(db, keyword=keyword)


# GET /crops/{crop_id} - chi tiet 1 giong, kem danh sach moc cham soc
@router.get("/{crop_id}", response_model=CropDetail)
def get_crop_detail(
    crop_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    crop = crud_crop.get_crop(db, crop_id)
    if crop is None:
        raise HTTPException(404, "Khong tim thay giong cay nay")

    crop["milestones"] = crud_crop.list_milestones_of_crop(db, crop_id)
    return crop


# POST /crops - Admin them giong moi (UC-A02.1)
@router.post("", response_model=CropDetail, status_code=201)
def create_crop(
    payload: CropCreate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if crud_crop.name_exists(db, payload.name):
        raise HTTPException(400, "Ten giong cay nay da co trong danh muc")

    crop = crud_crop.create_crop(
        db,
        name=payload.name,
        growth_days=payload.growth_days,
        planting_guide=payload.planting_guide,
    )
    crop["milestones"] = []
    return crop


# PATCH /crops/{crop_id} - Admin sua thong tin (UC-A02.1)
@router.patch("/{crop_id}", response_model=CropDetail)
def update_crop(
    crop_id: UUID,
    payload: CropUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    existing = crud_crop.get_crop(db, crop_id)
    if existing is None:
        raise HTTPException(404, "Khong tim thay giong cay nay")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "Khong co truong nao de cap nhat")

    if "name" in data and data["name"] != existing["name"] and crud_crop.name_exists(db, data["name"], exclude_crop_id=crop_id):
        raise HTTPException(400, "Ten giong cay nay da co trong danh muc")

    crop = crud_crop.update_crop(db, crop_id, data)
    crop["milestones"] = crud_crop.list_milestones_of_crop(db, crop_id)
    return crop


# DELETE /crops/{crop_id} - Admin xoa (UC-A02.1). Xoa cung + bat
# IntegrityError: bang chua co cot status nen khong the soft-delete;
# neu giong cay dang duoc mot mua vu nao tham chieu, FK se chan lai va
# route nay tra ve 400 than thien thay vi de lo 500 tho cua Postgres.
@router.delete("/{crop_id}", status_code=204)
def delete_crop(
    crop_id: UUID,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    existing = crud_crop.get_crop(db, crop_id)
    if existing is None:
        raise HTTPException(404, "Khong tim thay giong cay nay")

    try:
        crud_crop.delete_crop(db, crop_id)
    except IntegrityError:
        raise HTTPException(400, "Giong cay dang duoc su dung trong mua vu, khong the xoa")


# POST /crops/{crop_id}/milestones - Admin them moc cham soc (UC-A02.1)
@router.post("/{crop_id}/milestones", response_model=MilestoneOut, status_code=201)
def create_milestone(
    crop_id: UUID,
    payload: MilestoneCreate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if crud_crop.get_crop(db, crop_id) is None:
        raise HTTPException(404, "Khong tim thay giong cay nay")

    return crud_crop.create_milestone(
        db,
        crop_id,
        days_after_planting=payload.days_after_planting,
        task_type=payload.task_type,
        description=payload.description,
    )


# PATCH /crops/{crop_id}/milestones/{milestone_id} - Admin sua (UC-A02.1)
@router.patch("/{crop_id}/milestones/{milestone_id}", response_model=MilestoneOut)
def update_milestone(
    crop_id: UUID,
    milestone_id: UUID,
    payload: MilestoneUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    existing = crud_crop.get_milestone(db, milestone_id)
    if existing is None or existing["crop_id"] != crop_id:
        raise HTTPException(404, "Khong tim thay moc cham soc nay")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "Khong co truong nao de cap nhat")

    return crud_crop.update_milestone(db, milestone_id, data)


# DELETE /crops/{crop_id}/milestones/{milestone_id} - Admin xoa (UC-A02.1)
@router.delete("/{crop_id}/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    crop_id: UUID,
    milestone_id: UUID,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    existing = crud_crop.get_milestone(db, milestone_id)
    if existing is None or existing["crop_id"] != crop_id:
        raise HTTPException(404, "Khong tim thay moc cham soc nay")

    crud_crop.delete_milestone(db, milestone_id)