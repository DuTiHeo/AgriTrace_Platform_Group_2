from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import UUID


# ============== CROP_CATALOG ==============

def get_crop(db: Session, crop_id: UUID) -> dict | None:
    row = db.execute(
        text("SELECT * FROM crop_catalog WHERE crop_id = :crop_id"),
        {"crop_id": crop_id},
    ).mappings().first()
    return dict(row) if row else None


# HELPER KIEM TRA TRUNG TEN - de router bao loi than thien (400) thay vi
# rot xuong loi tho cua Postgres. Bang crop_catalog KHONG co UNIQUE
# constraint tren name (tranh phai ALTER file init_db.sql dung chung voi
# ca nhom), nen viec chong trung duoc xu ly hoan toan o tang app, giong
# huong phone_exists()/national_id_exists() ben crud/user.py.
def name_exists(db: Session, name: str, exclude_crop_id: UUID | None = None) -> bool:
    name = name.strip()          
    if not name:                 
        return False

    params: dict = {"name": name}
    condition = "LOWER(TRIM(name)) = LOWER(:name)"
    if exclude_crop_id is not None:
        condition += " AND crop_id <> :exclude_crop_id"
        params["exclude_crop_id"] = exclude_crop_id

    row = db.execute(
        text(f"SELECT 1 FROM crop_catalog WHERE {condition}"),
        params
    ).first()
    return row is not None


# DANH SACH + TIM KIEM - UC-SH04.1. Khong co org_id/team_id vi day la
# du lieu dung chung toan he thong (khong multi-tenant), nen khong can
# logic scope quyen nhu list_users() ben module User.
def list_crops(db: Session, *, keyword: str | None = None) -> list[dict]:
    conditions = []
    params: dict = {}
    if keyword:
        conditions.append("name ILIKE :keyword")
        params["keyword"] = f"%{keyword}%"
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = db.execute(
        text(f"""
            SELECT crop_id, name, growth_days, planting_guide, created_at, updated_at
            FROM crop_catalog
            {where_clause}
            ORDER BY name
        """),
        params,
    ).mappings().all()
    return [dict(r) for r in rows]


# TAO MOI - UC-A02.1
def create_crop(db: Session, *, name: str, growth_days: int, planting_guide: str | None) -> dict:
    row = db.execute(
        text("""
            INSERT INTO crop_catalog (name, growth_days, planting_guide)
            VALUES (:name, :growth_days, :planting_guide)
            RETURNING *
        """),
        {"name": name, "growth_days": growth_days, "planting_guide": planting_guide},
    ).mappings().first()
    db.commit()
    return dict(row)


# CAP NHAT - UC-A02.1. data: dict field muon sua, lay tu
# CropUpdate.model_dump(exclude_unset=True) o router - key luon nam
# trong tap field da duoc Pydantic whitelist san, an toan de dung f-string
# build SET clause (giong update_user() ben crud/user.py).
def update_crop(db: Session, crop_id: UUID, data: dict) -> dict | None:
    if not data:
        return get_crop(db, crop_id)

    set_clause = ", ".join(f"{key} = :{key}" for key in data.keys())
    params = {**data, "crop_id": crop_id}

    row = db.execute(
        text(f"UPDATE crop_catalog SET {set_clause} WHERE crop_id = :crop_id RETURNING *"),
        params,
    ).mappings().first()
    db.commit()
    return dict(row) if row else None


# XOA - UC-A02.1. Bang crop_catalog CHUA co cot status (khac plots/
# organizations) nen khong the soft-delete; xoa cung luon va bat
# IntegrityError khi FK seasons.crop_id (khong co ON DELETE) chan lai vi
# giong cay dang duoc mot mua vu nao do tham chieu. Rollback truoc khi
# nem loi len de session khong bi ket o trang thai "failed transaction".
def delete_crop(db: Session, crop_id: UUID) -> None:
    try:
        db.execute(text("DELETE FROM crop_catalog WHERE crop_id = :crop_id"), {"crop_id": crop_id})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise


# ============== CROP_CARE_MILESTONES (bang con, gop chung file) ==============

def get_milestone(db: Session, milestone_id: UUID) -> dict | None:
    row = db.execute(
        text("SELECT * FROM crop_care_milestones WHERE milestone_id = :milestone_id"),
        {"milestone_id": milestone_id},
    ).mappings().first()
    return dict(row) if row else None


# UC-O03.3 (module Season) se import ham nay de doc danh sach moc cham
# soc chuan cua 1 giong, tu do tu dong sinh reminder_schedules khi khoi
# tao mua vu - KHONG viet lai truy van nay ben season.py.
def list_milestones_of_crop(db: Session, crop_id: UUID) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT * FROM crop_care_milestones
            WHERE crop_id = :crop_id
            ORDER BY days_after_planting
        """),
        {"crop_id": crop_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def create_milestone(
    db: Session,
    crop_id: UUID,
    *,
    days_after_planting: int,
    task_type: str,
    description: str | None,
) -> dict:
    row = db.execute(
        text("""
            INSERT INTO crop_care_milestones (crop_id, days_after_planting, task_type, description)
            VALUES (:crop_id, :days_after_planting, :task_type, :description)
            RETURNING *
        """),
        {
            "crop_id": crop_id,
            "days_after_planting": days_after_planting,
            "task_type": task_type,
            "description": description,
        },
    ).mappings().first()
    db.commit()
    return dict(row)


def update_milestone(db: Session, milestone_id: UUID, data: dict) -> dict | None:
    if not data:
        return get_milestone(db, milestone_id)

    set_clause = ", ".join(f"{key} = :{key}" for key in data.keys())
    params = {**data, "milestone_id": milestone_id}

    row = db.execute(
        text(f"UPDATE crop_care_milestones SET {set_clause} WHERE milestone_id = :milestone_id RETURNING *"),
        params,
    ).mappings().first()
    db.commit()
    return dict(row) if row else None


# Khong bang nao FK toi crop_care_milestones nen xoa cung an toan tuyet
# doi, khong can bat IntegrityError nhu delete_crop() o tren.
def delete_milestone(db: Session, milestone_id: UUID) -> None:
    db.execute(text("DELETE FROM crop_care_milestones WHERE milestone_id = :milestone_id"), {"milestone_id": milestone_id})
    db.commit()