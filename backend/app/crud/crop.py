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


# crop_catalog chưa có ràng buộc duy nhất cho name; kiểm tra trùng tại ứng dụng.
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


# Danh mục cây trồng dùng chung toàn hệ thống, không phân quyền theo nông trại hoặc tổ.
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


# Các trường cập nhật đã được CropUpdate kiểm tra trước khi tạo SET.
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


# Không thể xóa giống cây đang được mùa vụ tham chiếu; rollback trước khi ném lỗi.
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


# Dùng khi tạo mùa vụ để khởi tạo lịch nhắc từ các mốc chăm sóc.
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


# Không có bảng nào tham chiếu mốc chăm sóc, nên có thể xóa trực tiếp.
def delete_milestone(db: Session, milestone_id: UUID) -> None:
    db.execute(text("DELETE FROM crop_care_milestones WHERE milestone_id = :milestone_id"), {"milestone_id": milestone_id})
    db.commit()