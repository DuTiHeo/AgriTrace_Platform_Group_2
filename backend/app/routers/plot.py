from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.core.security import get_current_user
from app.crud import plot as crud_plot
from app.schemas.plot import (
    PlotCreate,
    PlotUpdate,
    PlotSummary,
    PlotDetail,
    PlotStatus,
)
from app.routers.user import require_role, ensure_owns_org

router = APIRouter()


@router.get("", response_model=list[PlotSummary])
def list_plots(
    org_id: UUID | None = Query(None, description="Loc theo nong trai"),
    status_filter: PlotStatus | None = Query(None, alias="status"),
    keyword: str | None = Query(None, description="Tim theo ma/ten lo"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Danh sach lo dat voi phan quyen theo role:
    - Admin: xem theo org_id hoac toan bo
    - Owner: xem theo org_id so huu hoac tat ca lo thuoc cac farm cua minh
    - Leader/Worker: tu dong gioi han theo nong trai truc thuoc
    """
    role = current_user["role"]

    if role == "admin":
        scope_org_id = org_id
        scope_owner_id = None
    elif role == "owner":
        if org_id:
            ensure_owns_org(db, current_user, org_id)
            scope_org_id = org_id
            scope_owner_id = None
        else:
            scope_org_id = None
            scope_owner_id = current_user["user_id"]
    else:  # leader, worker
        user_org_id = current_user.get("org_id")
        if not user_org_id:
            return []
        if org_id and org_id != user_org_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong co quyen xem lo dat cua nong trai khac")
        scope_org_id = user_org_id
        scope_owner_id = None

    return crud_plot.list_plots(
        db,
        org_id=scope_org_id,
        status=status_filter.value if status_filter else None,
        keyword=keyword,
        owner_id=scope_owner_id,
    )


@router.get("/{plot_id}", response_model=PlotDetail)
def get_plot_detail(
    plot_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Xem chi tiet 1 lo dat kem GeoJSON ranh gioi va thong tin mua vu hien tai."""
    plot = crud_plot.get_plot(db, plot_id)
    if not plot:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay lo dat")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, plot["org_id"])
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != plot["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong thuoc nong trai chua lo dat nay")

    return plot


@router.post("", response_model=PlotDetail, status_code=status.HTTP_201_CREATED)
def create_plot(
    payload: PlotCreate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """
    Tao moi lo dat thuoc nong trai:
    - Kiem tra quyen so huu nong trai
    - Kiem tra tranh trung ma lo trong cung nong trai
    - Tu dong tinh dien tich neu co GeoJSON ma khong nhap dien tich
    """
    ensure_owns_org(db, current_user, payload.org_id)

    if crud_plot.plot_code_exists(db, payload.org_id, payload.code):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Ma lo '{payload.code}' da ton tai trong nong trai nay",
        )

    if payload.boundary_geojson is not None:
        within = crud_plot.is_within_org_boundary(db, payload.org_id, payload.boundary_geojson)
        # within = None nghia la nong trai cha chua co ranh gioi (status='incomplete') ->
        # khong co gi de doi chieu nen cho qua, chi chan khi biet chac (within = False)
        if within is False:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Ranh gioi lo dat vuot ra ngoai ranh gioi nong trai cha",
            )

    return crud_plot.create_plot(
        db,
        org_id=payload.org_id,
        code=payload.code,
        area=payload.area,
        boundary_geojson=payload.boundary_geojson,
    )


@router.patch("/{plot_id}", response_model=PlotDetail)
def update_plot(
    plot_id: UUID,
    payload: PlotUpdate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Cap nhat thong tin lo dat (ma lo, dien tich, ranh gioi, trang thai)."""
    plot = crud_plot.get_plot(db, plot_id)
    if not plot:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay lo dat")

    ensure_owns_org(db, current_user, plot["org_id"])

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Khong co du lieu cap nhat")

    if "code" in data and data["code"] != plot["code"]:
        if crud_plot.plot_code_exists(db, plot["org_id"], data["code"], exclude_plot_id=plot_id):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Ma lo '{data['code']}' da ton tai trong nong trai nay",
            )

    if "boundary_geojson" in data:
        # UC-O02.2: khong cho sua (hoac xoa) ranh gioi neu lo dang gan mua vu con hieu luc,
        # tranh sai lech du lieu dang canh tac. Ap dung ca khi client gui boundary_geojson=null.
        if crud_plot.has_active_season(db, plot_id):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Khong the sua ranh gioi lo dat dang co mua vu canh tac hoat dong",
            )

        if data["boundary_geojson"] is not None:
            within = crud_plot.is_within_org_boundary(db, plot["org_id"], data["boundary_geojson"])
            if within is False:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Ranh gioi lo dat vuot ra ngoai ranh gioi nong trai cha",
                )

    return crud_plot.update_plot(db, plot_id, data)


@router.delete("/{plot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plot(
    plot_id: UUID,
    soft: bool = Query(True, description="Mac dinh xoa mem (status=inactive)"),
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """
    Xoa lo dat:
    - Chan khong cho xoa neu lo dat dang co mua vu canh tac (growing / ready_to_harvest)
    """
    plot = crud_plot.get_plot(db, plot_id)
    if not plot:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay lo dat")

    ensure_owns_org(db, current_user, plot["org_id"])

    if crud_plot.has_active_season(db, plot_id):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Khong the xoa lo dat dang co mua vu canh tac hoat dong",
        )

    try:
        crud_plot.delete_plot(db, plot_id, soft=soft)
    except IntegrityError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Lo dat da co lich su mua vu/nhiem vu, khong the xoa cung. Hay dung xoa mem (soft=true, mac dinh)",
        )
    return None
