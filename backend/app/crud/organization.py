import json
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_orgs_owned_by(db: Session, user_id: UUID) -> list[dict]:
    """Danh sach nong trai ma user nay dang lam Owner - de FE cho chon
    'dang thao tac nong trai nao' truoc khi goi cac API /users."""
    rows = db.execute(
        text("""
            SELECT org_id, name, address, status, owner_id, created_at
            FROM organizations
            WHERE owner_id = :user_id
            ORDER BY created_at
        """),
        {"user_id": user_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def user_owns_org(db: Session, user_id: UUID, org_id: UUID) -> bool:
    """Dung de scope quyen: Owner chi duoc thao tac tren nong trai minh so huu."""
    row = db.execute(
        text("SELECT 1 FROM organizations WHERE org_id = :org_id AND owner_id = :user_id"),
        {"org_id": org_id, "user_id": user_id},
    ).first()
    return row is not None


def get_org_stats(db: Session, org_id: UUID) -> dict:
    """Dem so luong plot, team, active season cua nong trai de tra ve cho trang chi tiet."""
    row = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM plots WHERE org_id = :org_id) AS plots_count,
                (SELECT COUNT(*) FROM teams WHERE org_id = :org_id) AS teams_count,
                (SELECT COUNT(*) 
                 FROM seasons s 
                 JOIN plots p ON s.plot_id = p.plot_id 
                 WHERE p.org_id = :org_id AND s.status IN ('growing', 'ready_to_harvest')) AS active_seasons_count
        """),
        {"org_id": org_id},
    ).mappings().first()
    return dict(row) if row else {"plots_count": 0, "teams_count": 0, "active_seasons_count": 0}


def get_organization(db: Session, org_id: UUID) -> dict | None:
    """Lay thong tin chi tiet 1 nong trai, parse PostGIS sang GeoJSON dict."""
    row = db.execute(
        text("""
            SELECT org_id, name, address, owner_id, status,
                   ST_AsGeoJSON(boundary_geojson) AS boundary_geojson,
                   created_at, updated_at
            FROM organizations
            WHERE org_id = :org_id
        """),
        {"org_id": org_id},
    ).mappings().first()
    if not row:
        return None
    res = dict(row)
    if res.get("boundary_geojson"):
        res["boundary_geojson"] = json.loads(res["boundary_geojson"])
    return res


def list_organizations(
    db: Session,
    *,
    keyword: str | None = None,
    status: str | None = None,
    owner_id: UUID | None = None,
    org_id: UUID | None = None,
) -> list[dict]:
    """Danh sach nong trai co bo loc tim kiem va phan quyen theo role."""
    conditions = ["1=1"]
    params: dict = {}

    if org_id:
        conditions.append("org_id = :org_id")
        params["org_id"] = org_id

    if owner_id:
        conditions.append("owner_id = :owner_id")
        params["owner_id"] = owner_id

    if status:
        conditions.append("status = :status")
        params["status"] = status

    if keyword:
        conditions.append("(name ILIKE :kw OR address ILIKE :kw)")
        params["kw"] = f"%{keyword}%"

    where_clause = " AND ".join(conditions)
    rows = db.execute(
        text(f"""
            SELECT org_id, name, address, owner_id, status, created_at
            FROM organizations
            WHERE {where_clause}
            ORDER BY created_at DESC
        """),
        params,
    ).mappings().all()
    return [dict(r) for r in rows]


def create_organization(
    db: Session,
    *,
    name: str,
    address: str | None = None,
    owner_id: UUID,
    boundary_geojson: dict | None = None,
) -> dict:
    """Tao moi nong trai. Neu co ranh gioi thi status la active, chua co thi incomplete."""
    status = "active" if boundary_geojson else "incomplete"
    boundary_str = json.dumps(boundary_geojson) if boundary_geojson else None

    if boundary_str:
        sql = """
            INSERT INTO organizations (name, address, owner_id, status, boundary_geojson)
            VALUES (:name, :address, :owner_id, :status, ST_SetSRID(ST_GeomFromGeoJSON(:boundary), 4326))
            RETURNING org_id, name, address, owner_id, status,
                      ST_AsGeoJSON(boundary_geojson) AS boundary_geojson,
                      created_at, updated_at
        """
        params = {
            "name": name,
            "address": address,
            "owner_id": owner_id,
            "status": status,
            "boundary": boundary_str,
        }
    else:
        sql = """
            INSERT INTO organizations (name, address, owner_id, status, boundary_geojson)
            VALUES (:name, :address, :owner_id, :status, NULL)
            RETURNING org_id, name, address, owner_id, status,
                      NULL AS boundary_geojson,
                      created_at, updated_at
        """
        params = {
            "name": name,
            "address": address,
            "owner_id": owner_id,
            "status": status,
        }

    row = db.execute(text(sql), params).mappings().first()
    db.commit()
    res = dict(row)
    if res.get("boundary_geojson"):
        res["boundary_geojson"] = json.loads(res["boundary_geojson"])
    return res


def update_organization(db: Session, org_id: UUID, data: dict) -> dict:
    """Cap nhat nong trai, xu ly dynamic boundary_geojson va cac truong text/status."""
    set_clauses = []
    params: dict = {"org_id": org_id}

    if "name" in data:
        set_clauses.append("name = :name")
        params["name"] = data["name"]

    if "address" in data:
        set_clauses.append("address = :address")
        params["address"] = data["address"]

    if "status" in data:
        status_val = data["status"].value if hasattr(data["status"], "value") else data["status"]
        set_clauses.append("status = :status")
        params["status"] = status_val

    if "boundary_geojson" in data:
        bg = data["boundary_geojson"]
        if bg is not None:
            set_clauses.append("boundary_geojson = ST_SetSRID(ST_GeomFromGeoJSON(:boundary), 4326)")
            params["boundary"] = json.dumps(bg)
            # Neu dang o trang thai incomplete ma cap nhat ranh gioi thi tu dong chuyen sang active (neu khong bi set status khac)
            if "status" not in data:
                set_clauses.append("status = CASE WHEN status = 'incomplete' THEN 'active' ELSE status END")
        else:
            set_clauses.append("boundary_geojson = NULL")

    if not set_clauses:
        return get_organization(db, org_id)

    sql = f"""
        UPDATE organizations
        SET {', '.join(set_clauses)}
        WHERE org_id = :org_id
        RETURNING org_id, name, address, owner_id, status,
                  ST_AsGeoJSON(boundary_geojson) AS boundary_geojson,
                  created_at, updated_at
    """
    row = db.execute(text(sql), params).mappings().first()
    db.commit()
    res = dict(row)
    if res.get("boundary_geojson"):
        res["boundary_geojson"] = json.loads(res["boundary_geojson"])
    return res


def delete_organization(db: Session, org_id: UUID, soft: bool = True) -> None:
    """Xoa nong trai (mac dinh la xoa mem bang cach doi status sang suspended)."""
    if soft:
        db.execute(
            text("UPDATE organizations SET status = 'suspended' WHERE org_id = :org_id"),
            {"org_id": org_id},
        )
    else:
        db.execute(
            text("DELETE FROM organizations WHERE org_id = :org_id"),
            {"org_id": org_id},
        )
    db.commit()