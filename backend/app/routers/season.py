from datetime import timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.crud import season as crud_season
from app.crud import plot as crud_plot
from app.crud import crop as crud_crop
from app.crud import team as crud_team
from app.schemas.season import (
    SeasonCreate,
    SeasonUpdate,
    SeasonSummary,
    SeasonDetail,
    SeasonStatus,
    SeasonTeamAssign,
)
from app.routers.user import require_role, ensure_owns_org

router = APIRouter()


@router.get("", response_model=list[SeasonSummary])
def list_seasons(
    org_id: UUID | None = Query(None, description="Loc theo nong trai"),
    plot_id: UUID | None = Query(None, description="Loc theo lo dat"),
    crop_id: UUID | None = Query(None, description="Loc theo giong cay"),
    status_filter: SeasonStatus | None = Query(None, alias="status"),
    team_id: UUID | None = Query(None, description="Loc theo to phu trach"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Danh sach mua vu theo phan quyen:
    - Admin: xem toan bo hoac theo org_id/plot_id/crop_id/status/team_id
    - Owner: xem mua vu thuoc cac nong trai minh so huu
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
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong co quyen xem mua vu cua nong trai khac")
        scope_org_id = user_org_id
        scope_owner_id = None

    return crud_season.list_seasons(
        db,
        org_id=scope_org_id,
        plot_id=plot_id,
        crop_id=crop_id,
        status=status_filter.value if status_filter else None,
        team_id=team_id,
        owner_id=scope_owner_id,
    )


@router.get("/{season_id}", response_model=SeasonDetail)
def get_season_detail(
    season_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chi tiet mua vu kem danh sach lich nhac nho va cac to ho tro."""
    season = crud_season.get_season(db, season_id)
    if not season:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay mua vu")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, season["org_id"])
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != season["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong thuoc nong trai chua mua vu nay")

    season["reminders"] = crud_season.list_reminders_of_season(db, season_id)
    season["teams"] = crud_season.list_teams_of_season(db, season_id)
    season["assigned_team_names"] = [t["team_name"] for t in season["teams"]]
    return season


@router.post("", response_model=SeasonDetail, status_code=status.HTTP_201_CREATED)
def create_season(
    payload: SeasonCreate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """
    Khoi tao mua vu (UC-O03.1):
    - Kiem tra lo dat hop le, dang active va thuoc nong trai cua owner
    - Kiem tra lo dat chua co mua vu dang hoat dong (tranh 2 mua vu trung nhau)
    - Kiem tra giong cay co trong danh muc
    - Tu dong tinh ngay thu hoach du kien neu chua nhap
    - Tu dong sinh lich nhac nho reminder_schedules tu crop milestones (UC-O03.3)
    """
    plot = crud_plot.get_plot(db, payload.plot_id)
    if not plot:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay lo dat")

    ensure_owns_org(db, current_user, plot["org_id"])

    if plot["status"] != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lo dat dang o trang thai ngung hoat dong (inactive)")

    if crud_plot.has_active_season(db, payload.plot_id):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Lo dat nay hien dang co mot mua vu dang canh tac hoat dong",
        )

    crop = crud_crop.get_crop(db, payload.crop_id)
    if not crop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay giong cay trong danh muc")

    expected_harvest = payload.expected_harvest_date
    if not expected_harvest:
        expected_harvest = payload.planting_date + timedelta(days=crop["growth_days"])

    if payload.assigned_team_ids:
        for tid in payload.assigned_team_ids:
            team = crud_team.get_team(db, tid)
            if not team:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"Khong tim thay to ID '{tid}'")
            if team["org_id"] != plot["org_id"]:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"To '{team['name']}' khong thuoc cung nong trai")

    season = crud_season.create_season(
        db,
        plot_id=payload.plot_id,
        crop_id=payload.crop_id,
        planting_date=payload.planting_date,
        expected_harvest_date=expected_harvest,
        assigned_team_ids=payload.assigned_team_ids,
    )
    season["reminders"] = crud_season.list_reminders_of_season(db, season["season_id"])
    season["teams"] = crud_season.list_teams_of_season(db, season["season_id"])
    season["assigned_team_names"] = [t["team_name"] for t in season["teams"]]
    return season


@router.patch("/{season_id}", response_model=SeasonDetail)
def update_season(
    season_id: UUID,
    payload: SeasonUpdate,
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):
    """
    Cap nhat thong tin mua vu (ngay thu hoach, trang thai):
    - Owner/Admin co toan quyen
    - Leader chi duoc cap nhat neu mua vu thuoc farm cua minh
    """
    season = crud_season.get_season(db, season_id)
    if not season:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay mua vu")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, season["org_id"])
    elif role == "leader":
        if current_user.get("org_id") != season["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong thuoc nong trai chua mua vu nay")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Khong co du lieu cap nhat")

    updated = crud_season.update_season(db, season_id, data)
    updated["reminders"] = crud_season.list_reminders_of_season(db, season_id)
    updated["teams"] = crud_season.list_teams_of_season(db, season_id)
    updated["assigned_team_names"] = [t["team_name"] for t in updated["teams"]]
    return updated


@router.delete("/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_season(
    season_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """
    Xoa mua vu:
    - Chan xoa neu mua vu da co nhat ky canh tac hoac da gom vao lo thu hoach
    """
    season = crud_season.get_season(db, season_id)
    if not season:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay mua vu")

    ensure_owns_org(db, current_user, season["org_id"])

    has_data, reason = crud_season.has_farming_logs_or_batches(db, season_id)
    if has_data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, reason)

    crud_season.delete_season(db, season_id)
    return None


@router.post("/{season_id}/teams", response_model=SeasonDetail)
def assign_team_to_season(
    season_id: UUID,
    payload: SeasonTeamAssign,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Gan to ho tro vao mua vu."""
    season = crud_season.get_season(db, season_id)
    if not season:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay mua vu")

    ensure_owns_org(db, current_user, season["org_id"])

    team = crud_team.get_team(db, payload.team_id)
    if not team:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay to cong nhan")
    if team["org_id"] != season["org_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "To cong nhan khong thuoc cung nong trai voi mua vu")

    crud_season.assign_team(
        db,
        season_id=season_id,
        team_id=payload.team_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    res = crud_season.get_season(db, season_id)
    res["reminders"] = crud_season.list_reminders_of_season(db, season_id)
    res["teams"] = crud_season.list_teams_of_season(db, season_id)
    res["assigned_team_names"] = [t["team_name"] for t in res["teams"]]
    return res


@router.delete("/{season_id}/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_from_season(
    season_id: UUID,
    team_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Huy gan to khoi mua vu."""
    season = crud_season.get_season(db, season_id)
    if not season:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay mua vu")

    ensure_owns_org(db, current_user, season["org_id"])

    crud_season.remove_team(db, season_id, team_id)
    return None
