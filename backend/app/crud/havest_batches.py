# backend/app/crud/havest_batches.py
from datetime import date
from typing import Optional
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.utils.batch_code import generate_batch_code
from app.utils.qr_generator import generate_qr_url


def batch_code_exists(db: Session, batch_code: str, exclude_batch_id: Optional[UUID] = None) -> bool:

    sql = "SELECT 1 FROM harvest_batches WHERE batch_code = :batch_code"
    params = {"batch_code": batch_code}
    if exclude_batch_id:
        sql += " AND batch_id != :exclude_batch_id"
        params["exclude_batch_id"] = exclude_batch_id
    row = db.execute(text(sql), params).first()
    return row is not None


def list_seasons_of_batch(db: Session, batch_id: UUID, include_cancelled: bool = False) -> list[dict]:

    try:
        # Thử truy vấn có cột status của batch_seasons
        status_filter = "" if include_cancelled else "AND (bs.status IS NULL OR bs.status != 'cancelled')"
        query = text(f"""
            SELECT bs.season_id, s.crop_id, c.name AS crop_name,
                   s.plot_id, p.code AS plot_code,
                   bs.contributed_quantity, s.planting_date, s.actual_harvest_date,
                   s.status AS season_status,
                   COALESCE(bs.status, 'active') AS status
            FROM batch_seasons bs
            JOIN seasons s ON bs.season_id = s.season_id
            JOIN plots p ON s.plot_id = p.plot_id
            JOIN crop_catalog c ON s.crop_id = c.crop_id
            WHERE bs.batch_id = :batch_id {status_filter}
            ORDER BY s.planting_date ASC;
        """)
        rows = db.execute(query, {"batch_id": batch_id}).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        db.rollback()
        # Fallback nếu bảng chưa có cột status
        query = text("""
            SELECT bs.season_id, s.crop_id, c.name AS crop_name,
                   s.plot_id, p.code AS plot_code,
                   bs.contributed_quantity, s.planting_date, s.actual_harvest_date,
                   s.status AS season_status,
                   'active' AS status
            FROM batch_seasons bs
            JOIN seasons s ON bs.season_id = s.season_id
            JOIN plots p ON s.plot_id = p.plot_id
            JOIN crop_catalog c ON s.crop_id = c.crop_id
            WHERE bs.batch_id = :batch_id
            ORDER BY s.planting_date ASC;
        """)
        rows = db.execute(query, {"batch_id": batch_id}).mappings().all()
        return [dict(r) for r in rows]


def get_harvest_batch(db: Session, batch_id: UUID, include_seasons: bool = True) -> Optional[dict]:

    query = text("""
        SELECT hb.batch_id, hb.batch_code, hb.org_id, o.name AS org_name,
               hb.quantity, hb.harvest_date, hb.status, hb.qr_url,
               hb.created_at, hb.updated_at
        FROM harvest_batches hb
        JOIN organizations o ON hb.org_id = o.org_id
        WHERE hb.batch_id = :batch_id;
    """)
    result = db.execute(query, {"batch_id": batch_id}).mappings().first()
    if not result:
        return None

    data = dict(result)
    seasons = list_seasons_of_batch(db, batch_id) if include_seasons else []
    data["seasons"] = seasons
    data["seasons_count"] = len(seasons)
    return data


def list_harvest_batches(
    db: Session,
    *,
    org_id: Optional[UUID] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    owner_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    include_cancelled: bool = False,
) -> list[dict]:

    conditions = ["1=1"]
    params: dict = {}

    if owner_id:
        conditions.append("o.owner_id = :owner_id")
        params["owner_id"] = owner_id

    if org_id:
        conditions.append("hb.org_id = :org_id")
        params["org_id"] = org_id

    if status:
        conditions.append("hb.status = :status")
        params["status"] = status
    elif not include_cancelled:
        conditions.append("hb.status != 'cancelled'")

    if date_from:
        conditions.append("hb.harvest_date >= :date_from")
        params["date_from"] = date_from

    if date_to:
        conditions.append("hb.harvest_date <= :date_to")
        params["date_to"] = date_to

    if keyword:
        conditions.append("hb.batch_code ILIKE :kw")
        params["kw"] = f"%{keyword}%"

    where_clause = " AND ".join(conditions)
    query = text(f"""
        SELECT hb.batch_id, hb.batch_code, hb.org_id, o.name AS org_name,
               hb.quantity, hb.harvest_date, hb.status, hb.qr_url,
               hb.created_at, hb.updated_at,
               (SELECT COUNT(*) FROM batch_seasons bs WHERE bs.batch_id = hb.batch_id) AS seasons_count
        FROM harvest_batches hb
        JOIN organizations o ON hb.org_id = o.org_id
        WHERE {where_clause}
        ORDER BY hb.created_at DESC;
    """)

    results = db.execute(query, params).mappings().all()
    return [dict(row) for row in results]


def create_harvest_batch(
    db: Session,
    *,
    org_id: UUID,
    batch_code: Optional[str] = None,
    quantity: Optional[float] = None,
    harvest_date: Optional[date] = None,
    status: str = "pending",
    qr_url: Optional[str] = None,
) -> dict:

    if not batch_code:
        batch_code = generate_batch_code(str(org_id), harvest_date)
        while batch_code_exists(db, batch_code):
            batch_code = generate_batch_code(str(org_id), harvest_date)

    if not qr_url and status == "ready":
        qr_url = generate_qr_url(batch_code)

    query = text("""
        INSERT INTO harvest_batches (org_id, batch_code, quantity, harvest_date, status, qr_url)
        VALUES (:org_id, :batch_code, :quantity, :harvest_date, :status, :qr_url)
        RETURNING batch_id;
    """)
    params = {
        "org_id": org_id,
        "batch_code": batch_code,
        "quantity": quantity,
        "harvest_date": harvest_date,
        "status": status,
        "qr_url": qr_url,
    }
    result = db.execute(query, params).mappings().first()
    db.commit()

    batch_id = result["batch_id"]
    return get_harvest_batch(db, batch_id)


def update_harvest_batch(db: Session, batch_id: UUID, update_data: dict) -> Optional[dict]:
    """Cập nhật thông tin lô thu hoạch."""
    if not update_data:
        return get_harvest_batch(db, batch_id)

    set_clauses = [f"{k} = :{k}" for k in update_data.keys()]
    params = {"batch_id": batch_id, **update_data}

    query = text(f"""
        UPDATE harvest_batches 
        SET {', '.join(set_clauses)}
        WHERE batch_id = :batch_id 
        RETURNING batch_id;
    """)
    res = db.execute(query, params).mappings().first()
    db.commit()
    return get_harvest_batch(db, batch_id) if res else None


def soft_delete_harvest_batch(db: Session, batch_id: UUID) -> Optional[dict]:

    query = text("""
        UPDATE harvest_batches 
        SET status = 'cancelled'
        WHERE batch_id = :batch_id 
        RETURNING batch_id;
    """)
    res = db.execute(query, {"batch_id": batch_id}).mappings().first()
    db.commit()
    return get_harvest_batch(db, batch_id) if res else None