from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.core.security import get_current_user
from app.crud import team as crud_team
from app.crud import user as crud_user
from app.schemas.team import (
    TeamCreate,
    TeamUpdate,
    TeamSummary,
    TeamDetail,
    TeamMemberAssign,
)
from app.routers.user import require_role, ensure_owns_org

router = APIRouter()


@router.get("", response_model=list[TeamSummary])
def list_teams(
    org_id: UUID | None = Query(None, description="Loc theo nong trai"),
    keyword: str | None = Query(None, description="Tim theo ten to"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Danh sach to cong nhan theo phan quyen:
    - Admin: xem theo org_id hoac toan bo
    - Owner: xem theo org_id so huu hoac tat ca to thuoc cac farm cua minh
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
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong co quyen xem to cua nong trai khac")
        scope_org_id = user_org_id
        scope_owner_id = None

    return crud_team.list_teams(
        db,
        org_id=scope_org_id,
        keyword=keyword,
        owner_id=scope_owner_id,
    )


@router.get("/{team_id}", response_model=TeamDetail)
def get_team_detail(
    team_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Xem chi tiet to kem danh sach thanh vien."""
    team = crud_team.get_team(db, team_id)
    if not team:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay to cong nhan")

    role = current_user["role"]
    if role == "owner":
        ensure_owns_org(db, current_user, team["org_id"])
    elif role in ("leader", "worker"):
        if current_user.get("org_id") != team["org_id"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ban khong thuoc nong trai nay")

    team["members"] = crud_team.get_team_members(db, team_id)
    return team


@router.post("", response_model=TeamDetail, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """
    Tao to cong nhan moi:
    - Kiem tra quyen so huu nong trai
    - Kiem tra tranh trung ten to trong farm
    - Neu co gan To truong: kiem tra user thuoc farm va chua lam to truong to khac
    """
    ensure_owns_org(db, current_user, payload.org_id)

    if crud_team.team_name_exists(db, payload.org_id, payload.name):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Ten to '{payload.name}' da ton tai trong nong trai nay",
        )

    if payload.team_leader_id:
        leader = crud_user.get_user(db, payload.team_leader_id)
        if not leader:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nguoi dung duoc chi dinh lam To truong")
        if leader["org_id"] != payload.org_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "To truong phai thuoc cung nong trai")
        if crud_team.is_leader_of_another_team(db, payload.team_leader_id):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Nguoi dung nay da la To truong cua mot to khac",
            )

    team = crud_team.create_team(
        db,
        org_id=payload.org_id,
        name=payload.name,
        team_leader_id=payload.team_leader_id,
    )
    team["members"] = crud_team.get_team_members(db, team["team_id"])
    return team


@router.patch("/{team_id}", response_model=TeamDetail)
def update_team(
    team_id: UUID,
    payload: TeamUpdate,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Cap nhat ten to hoac thay doi To truong."""
    team = crud_team.get_team(db, team_id)
    if not team:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay to cong nhan")

    ensure_owns_org(db, current_user, team["org_id"])

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Khong co du lieu cap nhat")

    if "name" in data and data["name"] != team["name"]:
        if crud_team.team_name_exists(db, team["org_id"], data["name"], exclude_team_id=team_id):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Ten to '{data['name']}' da ton tai trong nong trai nay",
            )

    if "team_leader_id" in data and data["team_leader_id"] is not None:
        new_leader_id = data["team_leader_id"]
        if new_leader_id != team["team_leader_id"]:
            leader = crud_user.get_user(db, new_leader_id)
            if not leader:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay nguoi dung duoc chi dinh")
            if leader["org_id"] != team["org_id"]:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "To truong phai thuoc cung nong trai")
            if crud_team.is_leader_of_another_team(db, new_leader_id, exclude_team_id=team_id):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Nguoi dung nay da la To truong cua mot to khac",
                )

    updated = crud_team.update_team(db, team_id, data, old_team=team)
    updated["members"] = crud_team.get_team_members(db, team_id)
    return updated


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """
    Xoa to cong nhan:
    - Chan neu to dang co cong viec chua hoan thanh (status=in_progress)
    """
    team = crud_team.get_team(db, team_id)
    if not team:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay to cong nhan")

    ensure_owns_org(db, current_user, team["org_id"])

    if crud_team.has_active_tasks(db, team_id):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Khong the xoa to dang co cong viec dang thuc hien",
        )

    try:
        crud_team.delete_team(db, team_id)
    except IntegrityError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "To da tung duoc giao viec hoac ho tro mua vu (du la da xong), khong the xoa cung theo yeu cau toan ven du lieu truy xuat nguon goc",
        )
    return None


@router.post("/{team_id}/members", response_model=TeamDetail)
def add_team_members(
    team_id: UUID,
    payload: TeamMemberAssign,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Them danh sach cong nhan vao to."""
    team = crud_team.get_team(db, team_id)
    if not team:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay to cong nhan")

    ensure_owns_org(db, current_user, team["org_id"])

    crud_team.add_members_to_team(db, team_id, payload.worker_ids, team["org_id"])
    res = crud_team.get_team(db, team_id)
    res["members"] = crud_team.get_team_members(db, team_id)
    return res


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner")),
    db: Session = Depends(get_db),
):
    """Go cong nhan khoi to."""
    team = crud_team.get_team(db, team_id)
    if not team:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Khong tim thay to cong nhan")

    ensure_owns_org(db, current_user, team["org_id"])

    crud_team.remove_member_from_team(db, team_id, user_id)
    return None
