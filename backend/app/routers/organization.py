from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError


from app.db.session import get_db
from app.core.security import get_current_user
from app.crud import organization as crud_org
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationSummary,
    OrganizationDetail,
    OrganizationStatus,
    VN2000BoundaryInput,
    VN2000ConvertOut,
)
from app.routers.user import require_role, ensure_owns_org
from app.utils.vn2000 import parse_central_meridian, vn2000_polygon_to_geojson

router = APIRouter()


@router.get("/mine", response_model=list[OrganizationSummary])
def list_my_organizations(
    current_user: dict = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Danh sach nong trai ma Owner dang so huu (de FE hien thi dropdown chon)."""
    return crud_org.get_orgs_owned_by(db, current_user["user_id"])


@router.post("/convert-vn2000", response_model=VN2000ConvertOut)
def convert_organization_vn2000_boundary(
    payload: VN2000BoundaryInput,
    current_user: dict = Depends(get_current_user),
):
    """Chuyển đổi danh sách đỉnh ranh giới hệ tọa độ VN-2000 sang GeoJSON Polygon WGS84 (SRID 4326)."""
    try:
        lon_0 = parse_central_meridian(payload.central_meridian)
        geojson = vn2000_polygon_to_geojson(
            points=payload.points,
            central_meridian=lon_0,
            zone_width=payload.zone_width,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return VN2000ConvertOut(
        boundary_geojson=geojson,
        wgs84_vertices=geojson["coordinates"][0],
        central_meridian=lon_0,
        zone_width=payload.zone_width,
    )


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

    boundary_geojson = payload.boundary_geojson
    if boundary_geojson is None and payload.boundary_vn2000 is not None:
        try:
            boundary_geojson = vn2000_polygon_to_geojson(
                points=payload.boundary_vn2000.points,
                central_meridian=payload.boundary_vn2000.central_meridian,
                zone_width=payload.boundary_vn2000.zone_width,
            )
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))

    org = crud_org.create_organization(
        db,
        name=payload.name,
        address=payload.address,
        owner_id=target_owner_id,
        boundary_geojson=boundary_geojson,
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
    if "boundary_vn2000" in data:
        vn2000_input = payload.boundary_vn2000
        data.pop("boundary_vn2000", None)
        if data.get("boundary_geojson") is None and vn2000_input is not None:
            try:
                data["boundary_geojson"] = vn2000_polygon_to_geojson(
                    points=vn2000_input.points,
                    central_meridian=vn2000_input.central_meridian,
                    zone_width=vn2000_input.zone_width,
                )
            except ValueError as exc:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))

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

    try:
        crud_org.delete_organization(db, org_id, soft=soft)
    except IntegrityError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Nong trai da phat sinh du lieu lien quan (lo thu hoach, bao cao loi...), khong the xoa cung. Hay dung xoa mem (soft=true, mac dinh)",
        )
    return None