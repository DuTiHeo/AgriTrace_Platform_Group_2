# Schemas cho module User - dot 1.
# Gan UC de sau nay doi chieu lai voi UseCase_PhanRa_ChiTiet.docx cho de:
#   UserCreateOwner   -> UC-A01.1
#   UserCreateStaff   -> UC-O05.1
#   UserUpdate        -> UC-O05.2
#   UserRoleUpdate    -> UC-O05.3 + UC-A01.3 + UC-O06.3 (gan team khi phong leader)
#   UserStatusUpdate  -> UC-O05.4 + UC-A01.2 (da toi gian, bo lock_reason/lock_duration)
#   UserSummary       -> UC-SH04.1 (GET /users - ban rut gon)
#   UserDetail        -> UC-SH04.1 (GET /users/{id} - ban day du)

from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# ---- Enum, khop voi CHECK constraint trong init_db.sql ----

class UserRole(str, Enum):
    """Dung cho response (hien thi role hien tai cua user)."""
    owner = "owner"
    leader = "leader"
    worker = "worker"
    admin = "admin"


class UserStatus(str, Enum):
    active = "active"
    locked = "locked"


class AssignableRole(str, Enum):
    """
    Dung rieng cho UserRoleUpdate (route PATCH /users/{id}/role).
    Owner/Admin chi duoc doi qua lai giua leader/worker,
    KHONG duoc gan role owner/admin qua route nay.
    """
    leader = "leader"
    worker = "worker"


# ---- Base dung chung cho 2 schema tao moi (tranh lap field) ----

class UserBase(BaseModel):
    full_name: str
    phone: str
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None


# ---- Tao moi ----
# 2 class tach rieng theo route (POST /users/owners vs POST /users)
# vi role + org_id bi route tu gan cung, client khong duoc truyen.
# Ve mat field thi giong het nhau - neu sau nay phat sinh khac biet
# (vd chi Owner moi duoc nhap them field X) thi sua rieng tung class.

class UserCreateOwner(UserBase):
    # Chi check do dai toi thieu 8 ky tu - KHONG ap dung full rule
    # nhu /auth/change-password (khong bat buoc chu+so, cho phep 8 ky tu
    # giong nhau). Ly do: nguoi tao (Admin) thuong chi nhap nhanh mot mat
    # khau tam, nguoi duoc tao tai khoan se tu doi lai sau khi dang nhap.
    password: str = Field(min_length=8)


class UserCreateStaff(UserBase):
    # Tuong tu UserCreateOwner (Owner tao nhanh mat khau tam cho worker/leader)
    org_id: UUID
    password: str = Field(min_length=8)


# ---- Cap nhat thong tin cot loi (UC-O05.2) ----
# Toan bo field la optional vi day la partial update:
# client chi gui field nao muon sua.

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None


# ---- Doi vai tro (UC-O05.3 / UC-A01.3 / UC-O06.3) ----

class UserRoleUpdate(BaseModel):
    role: AssignableRole
    team_id: Optional[UUID] = None

    @model_validator(mode="after")
    def _check_team_id(self):
        # UC-O06.3: phong leader BAT BUOC phai chi ro team nao
        if self.role == AssignableRole.leader and self.team_id is None:
            raise ValueError(
                "team_id la bat buoc khi phong role leader (UC-O06.3)"
            )
        # Ha xuong worker thi khong con gan voi team_leader_id cua team nao nua,
        # nen khong cho client truyen team_id kem theo cho khoi nham lan.
        if self.role == AssignableRole.worker and self.team_id is not None:
            raise ValueError(
                "khong duoc truyen team_id khi ha vai tro ve worker"
            )
        return self


# ---- Khoa / mo khoa (UC-O05.4 / UC-A01.2, da toi gian) ----

class UserStatusUpdate(BaseModel):
    status: UserStatus


# ---- Response ----

class UserSummary(BaseModel):
    """
    Dung cho GET /users (danh sach) - ban rut gon.
    Khong dung ORM trong project nay (CRUD dung raw SQL qua text(),
    tra ve dict/RowMapping) nen khong can model_config(from_attributes=True) -
    Pydantic parse thang tu dict la du.
    """
    user_id: UUID
    full_name: str
    phone: str
    role: UserRole
    status: UserStatus


class UserDetail(UserSummary):
    """Dung cho GET /users/{id} - ban day du."""
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    org_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    created_at: datetime