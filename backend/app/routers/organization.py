from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.crud import organization as crud_org
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationSummary,
    OrganizationDetail,
    OrganizationStatus,
)
from app.routers.user import require_role, ensure_owns_org

router = APIRouter()


@router.get("/mine", response_model=list[OrganizationSummary])
def list_my_organizations(
    current_user: dict = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Danh sach nong trai ma Owner dang so huu (de FE hien thi dropdown chon)."""
    return crud_org.get_orgs_owned_by(db, current_user["user_id"])


@router.get("", response_model=list[OrganizationSummary])
def list_organizations(
    keyword: str | None = Query(None, description="Tim theo ten hoac dia chi"),
    status: OrganizationStatus | None = Query(None),
    owner_id: UUID | None = Query(None, description="Chi Admin duoc loc theo owner_id"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Danh sach nong trai co phan quyen theo Role:
    - Admin: xem toan bo hoac loc theo owner_id
    - Owner: chi xem cac nong trai minh so huu
    - Leader/Worker: chi xem nong trai ma minh truc thuoc (org_id trong profile)
    """
    role = current_user["role"]

    if role == "admin":
        scope_owner_id = owner_id
        scope_org_id = None
    elif role == "owner":
        if owner_id and owner_id != current_user["user_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner chi duoc xem nong trai cua chinh minh")
        scope_owner_id = current_user["user_id"]
        scope_org_id = None
    else:  # leader, worker
        user_org_id = current_user.get("org_id")
        if not user_org_id:
            return []
        scope_owner_id = None
        scope_org_id = user_org_id

    return crud_org.list_organizations(
        db,
        keyword=keyword,
        status=status.value if status else None,
        owner_id=scope_owner_id,
        org_id=scope_org_id,
    )


@router.get("/{org_id}", response_model=OrganizationDetail)
def get_organization_detail(
    org_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Xem chi tiet 1 nong trai (kem ranh gioi GeoJSON va thong ke)."""
    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, org_id)
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != org_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong thuoc nong trai nay")

    org = crud_org.get_organization(db, org_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nong trai")

    stats = crud_org.get_org_stats(db, org_id)
    org.update(stats)
    return org


@router.post("", response_model=OrganizationDetail, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """
    Tao moi nong trai:
    - Owner: tu tao nong trai cho minh (owner_id lay tu token)
    - Admin: co the tao nong trai chi dinh owner_id
    """
    if current_user["role"] == "admin":
        if not payload.owner_id:
            target_owner_id = current_user["user_id"]
        else:
            target_owner_id = payload.owner_id
    else:
        target_owner_id = current_user["user_id"]

    org = crud_org.create_organization(
        db,
        name=payload.name,
        address=payload.address,
        owner_id=target_owner_id,
        boundary_geojson=payload.boundary_geojson,
    )
    stats = crud_org.get_org_stats(db, org["org_id"])
    org.update(stats)
    return org


@router.patch("/{org_id}", response_model=OrganizationDetail)
def update_organization(
    org_id: UUID,
    payload: OrganizationUpdate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Cap nhat thong tin, ranh gioi hoac trang thai nong trai."""
    ensure_owns_org(db, current_user, org_id)

    org = crud_org.get_organization(db, org_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nong trai")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Khong co du lieu cap nhat")

    updated = crud_org.update_organization(db, org_id, data)
    stats = crud_org.get_org_stats(db, org_id)
    updated.update(stats)
    return updated


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: UUID,
    soft: bool = Query(True, description="Mac dinh xoa mem (chuyen status=suspended)"),
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Xoa nong trai (mac dinh soft delete sang trang thai suspended)."""
    ensure_owns_org(db, current_user, org_id)

    org = crud_org.get_organization(db, org_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nong trai")

    crud_org.delete_organization(db, org_id, soft=soft)
    return None