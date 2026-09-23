# backend/app/routers/user.py
#
# 6 route theo dung bang route inventory trong /docs/
#   GET    /users              UC-SH04.1  (Admin/Owner/Leader)
#   GET    /users/{user_id}    UC-SH04.1  (Admin/Owner/Leader)
#   POST   /users/owners       UC-A01.1   (Admin)
#   POST   /users              UC-O05.1   (Owner)
#   PATCH  /users/{user_id}         UC-O05.2                    (Owner/Admin)
#   PATCH  /users/{user_id}/role    UC-O05.3+UC-A01.3+UC-O06.3  (Owner/Admin)
#   PATCH  /users/{user_id}/status  UC-O05.4+UC-A01.2           (Owner/Admin)


from typing import Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, hash_password
from app.crud import user as crud_user
from app.schemas.user import *
from app.crud import organization as crud_org
router = APIRouter()

# Dependency phan quyen dung chung cho ca module
def require_role(*allowed_roles: str) -> Callable[..., dict]:
    """
    Factory tra ve 1 dependency: chi cho request di tiep neu
    current_user["role"] nam trong allowed_roles, nguoc lai 403.
    Dung Depends(require_role("owner", "admin")) ngay trong signature
    cua route, thay vi lap if/else o dau moi ham.
    """
    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Ban khong co quyen thuc hien thao tac nay",
            )
        return current_user

    return checker

def ensure_owns_org(db: Session, current_user: dict, org_id: UUID | None) -> None:
    """Chặn Owner thao tac tren nong trai khong thuoc so huu cua minh.
    Admin duoc bo qua (ho tro khan cap - UC-A01.2/A01.3)."""
    if current_user["role"] != "owner":
        return
    if org_id is None or not crud_org.user_owns_org(db, current_user["user_id"], org_id):
        raise HTTPException(403, "Ban khong so huu nong trai nay")

# UC-SH04.1 - GET /users (danh sach + tim kiem)
@router.get("", response_model=list[UserSummary])
def list_users(
    keyword: str | None = Query(None, description="Tim theo ten hoac SDT"),
    role: UserRole | None = Query(None),
    status: UserStatus | None = Query(None),
    org_id: UUID | None = Query(None, description="Chi Admin duoc truyen"),
    team_id: UUID | None = Query(None, description="Chi Owner duoc truyen"),
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):
    caller_role = current_user["role"]

    if caller_role == "admin":
        if team_id is not None:
            raise HTTPException(400, "Admin khong loc theo team_id, chi dung org_id")
        scope_org_id = org_id
        scope_team_id = None

    elif caller_role == "owner":
        if org_id is None:
            raise HTTPException(400, "Owner phai truyen org_id (nong trai muon xem) - xem GET /organizations/mine")
        if not crud_org.user_owns_org(db, current_user["user_id"], org_id):
            raise HTTPException(403, "Ban khong so huu nong trai nay")
        scope_org_id = org_id
        scope_team_id = team_id

    else:  # leader
        if org_id is not None or team_id is not None:
            raise HTTPException(400, "Leader khong duoc truyen org_id/team_id, he thong tu gioi han theo to cua ban")
        if not current_user.get("team_id"):
            # Leader chua/khong con gan voi to nao -> khong co du lieu de xem.
            return []
        scope_org_id = None
        scope_team_id = current_user["team_id"]

    return crud_user.list_users(
        db,
        org_id=scope_org_id,
        team_id=scope_team_id,
        keyword=keyword,
        role=role.value if role else None,
        status=status.value if status else None,
    )
# UC-A01.1 - POST /users/owners (Admin tao tai khoan Owner)
@router.post("/owners", response_model=UserDetail, status_code=201)
def create_owner(
    payload: UserCreateOwner,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if crud_user.phone_exists(db, payload.phone):
        raise HTTPException(400, "So dien thoai da duoc su dung")
    if payload.national_id and crud_user.national_id_exists(db, payload.national_id):
        raise HTTPException(400, "CCCD da duoc su dung")

    return crud_user.create_owner(
        db,
        full_name=payload.full_name,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        national_id=payload.national_id,
        date_of_birth=payload.date_of_birth,
        address=payload.address,
    )

# UC-SH04.1 - GET /users/{user_id} (xem chi tiet)
@router.get("/{user_id}", response_model=UserDetail)
def get_user_detail(
    user_id: UUID,
    current_user: dict = Depends(require_role("admin", "owner", "leader")),
    db: Session = Depends(get_db),
):
    target = crud_user.get_user(db, user_id)
    if target is None:
        raise HTTPException(404, "Khong tim thay nguoi dung")

    caller_role = current_user["role"]
    is_self = target["user_id"] == current_user["user_id"]

    if caller_role == "owner":
        same_org = target["org_id"] is not None and crud_org.user_owns_org(db, current_user["user_id"], target["org_id"])
        if not (same_org or is_self):
            raise HTTPException(403, "Ban chi duoc xem nhan su thuoc nong trai cua minh")
    elif caller_role == "leader":
        same_team = target["team_id"] is not None and target["team_id"] == current_user["team_id"]
        if not (same_team or is_self):
            raise HTTPException(403, "Ban chi duoc xem thanh vien trong to cua minh")
    # admin: xem duoc tat ca, khong can check them

    return target





# UC-O05.1 - POST /users (Owner tao nhan su moi, mac dinh worker)

@router.post("", response_model=UserDetail, status_code=201)
def create_staff(
    payload: UserCreateStaff,
    current_user: dict = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    ensure_owns_org(db, current_user, payload.org_id)

    if crud_user.phone_exists(db, payload.phone):
        raise HTTPException(400, "So dien thoai da duoc su dung")
    if payload.national_id and crud_user.national_id_exists(db, payload.national_id):
        raise HTTPException(400, "CCCD da duoc su dung")

    return crud_user.create_staff(
        db,
        org_id=payload.org_id,
        full_name=payload.full_name,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        national_id=payload.national_id,
        date_of_birth=payload.date_of_birth,
        address=payload.address,
    )


# UC-O05.2 - PATCH /users/{user_id} (sua thong tin cot loi)
@router.patch("/{user_id}", response_model=UserDetail)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    current_user: dict = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
):
    target = crud_user.get_user(db, user_id)
    if target is None:
        raise HTTPException(404, "Khong tim thay nguoi dung")

    ensure_owns_org(db, current_user, target["org_id"])

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "Khong co truong nao de cap nhat")

    if "phone" in data and data["phone"] != target["phone"] and crud_user.phone_exists(db, data["phone"]):
        raise HTTPException(400, "So dien thoai da duoc su dung")
    if data.get("national_id") and data["national_id"] != target["national_id"] and crud_user.national_id_exists(db, data["national_id"]):
        raise HTTPException(400, "CCCD da duoc su dung")

    return crud_user.update_user(db, user_id, data)


# UC-O05.3 + UC-A01.3 + UC-O06.3 - PATCH /users/{user_id}/role
@router.patch("/{user_id}/role", response_model=UserDetail)
def update_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    current_user: dict = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
):
    target = crud_user.get_user(db, user_id)
    if target is None:
        raise HTTPException(404, "Khong tim thay nguoi dung")

    if target["role"] not in ("worker", "leader"):
        raise HTTPException(400, "Route nay chi doi vai tro giua worker/leader, khong ap dung cho owner/admin")

    ensure_owns_org(db, current_user, target["org_id"])

    if payload.role == AssignableRole.leader:
        team = crud_user.get_team(db, payload.team_id)
        if team is None:
            raise HTTPException(404, "Khong tim thay to (team) nay")
        if team["org_id"] != target["org_id"]:
            raise HTTPException(400, "To nay khong thuoc nong trai cua nhan su duoc phong")
        if team["team_leader_id"] is not None and team["team_leader_id"] != target["user_id"]:
            raise HTTPException(400, "To nay da co To truong, vui long doi To truong khac truoc")

    return crud_user.update_role(db, user_id, payload.role.value, payload.team_id)


# UC-O05.4 + UC-A01.2 - PATCH /users/{user_id}/status
@router.patch("/{user_id}/status", response_model=UserDetail)
def update_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    current_user: dict = Depends(require_role("owner", "admin")),
    db: Session = Depends(get_db),
):
    target = crud_user.get_user(db, user_id)
    if target is None:
        raise HTTPException(404, "Khong tim thay nguoi dung")

    ensure_owns_org(db, current_user, target["org_id"])

    if target["user_id"] == current_user["user_id"] and payload.status == UserStatus.locked:
        raise HTTPException(400, "Khong the tu khoa tai khoan cua chinh minh")

    return crud_user.update_status(db, user_id, payload.status.value)