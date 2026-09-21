import json
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session


def plot_code_exists(
    db: Session,
    org_id: UUID,
    code: str,
    exclude_plot_id: UUID | None = None,
) -> bool:
    """Kiem tra ma/ten lo dat da ton tai trong nong trai chua (tranh loi duplicate 500)."""
    sql = "SELECT 1 FROM plots WHERE org_id = :org_id AND code = :code"
    params = {"org_id": org_id, "code": code}
    if exclude_plot_id:
        sql += " AND plot_id != :exclude_plot_id"
        params["exclude_plot_id"] = exclude_plot_id
    row = db.execute(text(sql), params).first()
    return row is not None


def has_active_season(db: Session, plot_id: UUID) -> bool:
    """Kiem tra lo dat co mua vu nao dang hoat dong (growing hoac ready_to_harvest) khong."""
    row = db.execute(
        text("""
            SELECT 1 FROM seasons
            WHERE plot_id = :plot_id AND status IN ('growing', 'ready_to_harvest')
        """),
        {"plot_id": plot_id},
    ).first()
    return row is not None


def get_plot(db: Session, plot_id: UUID) -> dict | None:
    """Lay chi tiet lo dat kem ranh gioi GeoJSON va mua vu dang canh tac (neu co)."""
    row = db.execute(
        text("""
            SELECT p.plot_id, p.org_id, p.code, p.area, p.status,
                   ST_AsGeoJSON(p.boundary_geojson) AS boundary_geojson,
                   p.created_at, p.updated_at,
                   s.season_id AS current_season_id,
                   c.name AS current_crop_name
            FROM plots p
            LEFT JOIN seasons s ON p.plot_id = s.plot_id AND s.status IN ('growing', 'ready_to_harvest')
            LEFT JOIN crop_catalog c ON s.crop_id = c.crop_id
            WHERE p.plot_id = :plot_id
        """),
        {"plot_id": plot_id},
    ).mappings().first()
    if not row:
        return None
    res = dict(row)
    if res.get("boundary_geojson"):
        res["boundary_geojson"] = json.loads(res["boundary_geojson"])
    return res


def list_plots(
    db: Session,
    *,
    org_id: UUID | None = None,
    status: str | None = None,
    keyword: str | None = None,
    owner_id: UUID | None = None,
) -> list[dict]:
    """Danh sach cac lo dat, co the loc theo org_id, status, keyword hoac owner_id."""
    conditions = ["1=1"]
    params: dict = {}

    join_org = ""
    if owner_id:
        join_org = "JOIN organizations o ON p.org_id = o.org_id"
        conditions.append("o.owner_id = :owner_id")
        params["owner_id"] = owner_id

    if org_id:
        conditions.append("p.org_id = :org_id")
        params["org_id"] = org_id

    if status:
        conditions.append("p.status = :status")
        params["status"] = status

    if keyword:
        conditions.append("p.code ILIKE :kw")
        params["kw"] = f"%{keyword}%"

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT p.plot_id, p.org_id, p.code, p.area, p.status, p.created_at,
               s.season_id AS current_season_id,
               c.name AS current_crop_name
        FROM plots p
        {join_org}
        LEFT JOIN seasons s ON p.plot_id = s.plot_id AND s.status IN ('growing', 'ready_to_harvest')
        LEFT JOIN crop_catalog c ON s.crop_id = c.crop_id
        WHERE {where_clause}
        ORDER BY p.code ASC
    """
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


def create_plot(
    db: Session,
    *,
    org_id: UUID,
    code: str,
    area: float | None = None,
    boundary_geojson: dict | None = None,
) -> dict:
    """Tao moi lo dat. Neu khong truyen dien tich ma co GeoJSON, PostGIS se tu dong tinh dien tich (m2)."""
    boundary_str = json.dumps(boundary_geojson) if boundary_geojson else None

    if boundary_str:
        if area is not None:
            sql = """
                INSERT INTO plots (org_id, code, area, boundary_geojson)
                VALUES (:org_id, :code, :area, ST_SetSRID(ST_GeomFromGeoJSON(:boundary), 4326))
                RETURNING plot_id, org_id, code, area, status,
                          ST_AsGeoJSON(boundary_geojson) AS boundary_geojson,
                          created_at, updated_at
            """
            params = {
                "org_id": org_id,
                "code": code,
                "area": area,
                "boundary": boundary_str,
            }
        else:
            # Tu dong tinh dien tich bang geography
            sql = """
                INSERT INTO plots (org_id, code, area, boundary_geojson)
                VALUES (:org_id, :code,
                        ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(:boundary), 4326)::geography),
                        ST_SetSRID(ST_GeomFromGeoJSON(:boundary), 4326))
                RETURNING plot_id, org_id, code, area, status,
                          ST_AsGeoJSON(boundary_geojson) AS boundary_geojson,
                          created_at, updated_at
            """
            params = {
                "org_id": org_id,
                "code": code,
                "boundary": boundary_str,
            }
    else:
        sql = """
            INSERT INTO plots (org_id, code, area, boundary_geojson)
            VALUES (:org_id, :code, :area, NULL)
            RETURNING plot_id, org_id, code, area, status,
                      NULL AS boundary_geojson,
                      created_at, updated_at
        """
        params = {
            "org_id": org_id,
            "code": code,
            "area": area,
        }

    row = db.execute(text(sql), params).mappings().first()
    db.commit()
    res = dict(row)
    if res.get("boundary_geojson"):
        res["boundary_geojson"] = json.loads(res["boundary_geojson"])
    res["current_season_id"] = None
    res["current_crop_name"] = None
    return res


def update_plot(db: Session, plot_id: UUID, data: dict) -> dict:
    """Cap nhat lo dat: code, area, status, boundary_geojson."""
    set_clauses = []
    params: dict = {"plot_id": plot_id}

    if "code" in data:
        set_clauses.append("code = :code")
        params["code"] = data["code"]

    if "area" in data:
        set_clauses.append("area = :area")
        params["area"] = data["area"]

    if "status" in data:
        status_val = data["status"].value if hasattr(data["status"], "value") else data["status"]
        set_clauses.append("status = :status")
        params["status"] = status_val

    if "boundary_geojson" in data:
        bg = data["boundary_geojson"]
        if bg is not None:
            set_clauses.append("boundary_geojson = ST_SetSRID(ST_GeomFromGeoJSON(:boundary), 4326)")
            params["boundary"] = json.dumps(bg)
            # Neu khong truyen area rieng ma co boundary moi, cap nhat luon dien tich
            if "area" not in data:
                set_clauses.append("area = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(:boundary), 4326)::geography)")
        else:
            set_clauses.append("boundary_geojson = NULL")

    if not set_clauses:
        return get_plot(db, plot_id)

    sql = f"""
        UPDATE plots
        SET {', '.join(set_clauses)}
        WHERE plot_id = :plot_id
        RETURNING plot_id, org_id, code, area, status,
                  ST_AsGeoJSON(boundary_geojson) AS boundary_geojson,
                  created_at, updated_at
    """
    row = db.execute(text(sql), params).mappings().first()
    db.commit()
    res = dict(row)
    if res.get("boundary_geojson"):
        res["boundary_geojson"] = json.loads(res["boundary_geojson"])

    # Lay them thong tin mua vu hien tai
    current = db.execute(
        text("""
            SELECT s.season_id AS current_season_id, c.name AS current_crop_name
            FROM seasons s
            JOIN crop_catalog c ON s.crop_id = c.crop_id
            WHERE s.plot_id = :plot_id AND s.status IN ('growing', 'ready_to_harvest')
        """),
        {"plot_id": plot_id},
    ).mappings().first()
    if current:
        res.update(dict(current))
    else:
        res["current_season_id"] = None
        res["current_crop_name"] = None
    return res


def delete_plot(db: Session, plot_id: UUID, soft: bool = True) -> None:
    """Xoa lo dat (mac dinh xoa mem status='inactive')."""
    if soft:
        db.execute(
            text("UPDATE plots SET status = 'inactive' WHERE plot_id = :plot_id"),
            {"plot_id": plot_id},
        )
    else:
        db.execute(
            text("DELETE FROM plots WHERE plot_id = :plot_id"),
            {"plot_id": plot_id},
        )
    db.commit()
