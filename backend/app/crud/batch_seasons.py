# backend/app/crud/batch_seasons.py
from typing import Optional
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session



def sync_batch_total_quantity(db: Session, batch_id: UUID) -> None:
    """Tự động tính lại tổng sản lượng của lô thu hoạch từ các mùa vụ active."""
    try:
        query = text("""
            UPDATE harvest_batches
            SET quantity = (
                SELECT COALESCE(SUM(contributed_quantity), 0)
                FROM batch_seasons
                WHERE batch_id = :batch_id AND (status IS NULL OR status != 'cancelled')
            )
            WHERE batch_id = :batch_id;
        """)
        db.execute(query, {"batch_id": batch_id})
        db.commit()
    except Exception:
        db.rollback()


def validate_batch_and_season(
    db: Session,
    batch_id: UUID,
    season_id: UUID,
) -> tuple[bool, str, Optional[UUID]]:

    batch = db.execute(
        text("SELECT batch_id, org_id, status FROM harvest_batches WHERE batch_id = :batch_id"),
        {"batch_id": batch_id},
    ).mappings().first()
    if not batch:
        return False, "Không tìm thấy lô thu hoạch", None
    if batch["status"] == "cancelled":
        return False, "Lô thu hoạch này đã bị hủy (cancelled)", None

    org_id = batch["org_id"]

    season = db.execute(
        text("""
            SELECT s.season_id, s.crop_id, s.status, p.org_id
            FROM seasons s
            JOIN plots p ON s.plot_id = p.plot_id
            WHERE s.season_id = :season_id
        """),
        {"season_id": season_id},
    ).mappings().first()
    if not season:
        return False, "Không tìm thấy mùa vụ", None
    if season["org_id"] != org_id:
        return False, "Mùa vụ và lô thu hoạch không thuộc cùng một nông trại", None

    # Kiểm tra trạng thái mùa vụ: phải đủ điều kiện thu hoạch
    if season["status"] not in ("ready_to_harvest", "completed"):
        return False, f"Mùa vụ đang ở trạng thái '{season['status']}', chưa đủ điều kiện thu hoạch (yêu cầu 'ready_to_harvest' hoặc 'completed')", None

    # Kiểm tra tính đồng nhất về giống cây trong cùng 1 lô thu hoạch
    existing_seasons = list_seasons_by_batch(db, batch_id, include_cancelled=False)
    for es in existing_seasons:
        if es["season_id"] != season_id and es.get("crop_id") and es["crop_id"] != season["crop_id"]:
            return False, "Tất cả các mùa vụ trong cùng một lô thu hoạch bắt buộc phải cùng giống cây trồng", None

    return True, "", org_id


def get_batch_season(db: Session, batch_id: UUID, season_id: UUID) -> Optional[dict]:
    """Lấy chi tiết liên kết giữa 1 lô thu hoạch và 1 mùa vụ."""
    query = text("""
        SELECT bs.batch_id, hb.batch_code, hb.org_id,
               bs.season_id, s.crop_id, c.name AS crop_name,
               s.plot_id, p.code AS plot_code,
               bs.contributed_quantity, s.status AS season_status,
               s.planting_date, s.actual_harvest_date,
               COALESCE(bs.status, 'active') AS status
        FROM batch_seasons bs
        JOIN harvest_batches hb ON bs.batch_id = hb.batch_id
        JOIN seasons s ON bs.season_id = s.season_id
        JOIN plots p ON s.plot_id = p.plot_id
        JOIN crop_catalog c ON s.crop_id = c.crop_id
        WHERE bs.batch_id = :batch_id AND bs.season_id = :season_id;
    """)
    result = db.execute(query, {"batch_id": batch_id, "season_id": season_id}).mappings().first()
    return dict(result) if result else None


def list_seasons_by_batch(db: Session, batch_id: UUID, include_cancelled: bool = False) -> list[dict]:
    """Lấy danh sách các mùa vụ góp sản lượng vào 1 lô thu hoạch."""
    filter_cancelled = "" if include_cancelled else "AND (bs.status IS NULL OR bs.status != 'cancelled')"
    query = text(f"""
        SELECT bs.batch_id, hb.batch_code, hb.org_id,
               bs.season_id, s.crop_id, c.name AS crop_name,
               s.plot_id, p.code AS plot_code,
               bs.contributed_quantity, s.status AS season_status,
               s.planting_date, s.actual_harvest_date,
               COALESCE(bs.status, 'active') AS status
        FROM batch_seasons bs
        JOIN harvest_batches hb ON bs.batch_id = hb.batch_id
        JOIN seasons s ON bs.season_id = s.season_id
        JOIN plots p ON s.plot_id = p.plot_id
        JOIN crop_catalog c ON s.crop_id = c.crop_id
        WHERE bs.batch_id = :batch_id {filter_cancelled}
        ORDER BY s.planting_date ASC;
    """)
    rows = db.execute(query, {"batch_id": batch_id}).mappings().all()
    return [dict(r) for r in rows]


def list_batches_by_season(db: Session, season_id: UUID, include_cancelled: bool = False) -> list[dict]:

    filter_cancelled = "" if include_cancelled else "AND (bs.status IS NULL OR bs.status != 'cancelled')"
    query = text(f"""
        SELECT bs.batch_id, hb.batch_code, hb.org_id, hb.harvest_date, hb.status AS batch_status,
               bs.season_id, bs.contributed_quantity,
               COALESCE(bs.status, 'active') AS status
        FROM batch_seasons bs
        JOIN harvest_batches hb ON bs.batch_id = hb.batch_id
        WHERE bs.season_id = :season_id {filter_cancelled}
        ORDER BY hb.harvest_date DESC;
    """)
    rows = db.execute(query, {"season_id": season_id}).mappings().all()
    return [dict(r) for r in rows]


def create_or_reactivate_batch_season(
    db: Session,
    batch_id: UUID,
    season_id: UUID,
    contributed_quantity: Optional[float] = None,
) -> dict:

    existing = get_batch_season(db, batch_id, season_id)

    if existing:
        if existing["status"] == "active":
            raise ValueError("Mùa vụ này đã được gán vào lô thu hoạch và đang active")
        # Kích hoạt lại liên kết đã bị xóa mềm
        query = text("""
            UPDATE batch_seasons 
            SET status = 'active', contributed_quantity = :contributed_quantity
            WHERE batch_id = :batch_id AND season_id = :season_id;
        """)
        db.execute(query, {
            "batch_id": batch_id,
            "season_id": season_id,
            "contributed_quantity": contributed_quantity,
        })
    else:
        query = text("""
            INSERT INTO batch_seasons (batch_id, season_id, contributed_quantity, status)
            VALUES (:batch_id, :season_id, :contributed_quantity, 'active');
        """)
        db.execute(query, {
            "batch_id": batch_id,
            "season_id": season_id,
            "contributed_quantity": contributed_quantity,
        })

    db.commit()
    sync_batch_total_quantity(db, batch_id)
    return get_batch_season(db, batch_id, season_id)


def update_batch_season(
    db: Session,
    batch_id: UUID,
    season_id: UUID,
    contributed_quantity: float,
) -> Optional[dict]:
    """Cập nhật sản lượng đóng góp của mùa vụ vào lô thu hoạch."""
    existing = get_batch_season(db, batch_id, season_id)
    if not existing:
        return None

    query = text("""
        UPDATE batch_seasons 
        SET contributed_quantity = :contributed_quantity
        WHERE batch_id = :batch_id AND season_id = :season_id;
    """)
    db.execute(query, {
        "batch_id": batch_id,
        "season_id": season_id,
        "contributed_quantity": contributed_quantity,
    })
    db.commit()
    sync_batch_total_quantity(db, batch_id)
    return get_batch_season(db, batch_id, season_id)


def soft_delete_batch_season(db: Session, batch_id: UUID, season_id: UUID) -> Optional[dict]:

    existing = get_batch_season(db, batch_id, season_id)
    if not existing:
        return None

    query = text("""
        UPDATE batch_seasons 
        SET status = 'cancelled'
        WHERE batch_id = :batch_id AND season_id = :season_id;
    """)
    db.execute(query, {"batch_id": batch_id, "season_id": season_id})
    db.commit()
    sync_batch_total_quantity(db, batch_id)
    return get_batch_season(db, batch_id, season_id)