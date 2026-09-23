from uuid import UUID
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def team_name_exists(
    db: Session,
    org_id: UUID,
    name: str,
    exclude_team_id: UUID | None = None,
) -> bool:
    """Kiem tra ten to da ton tai trong nong trai chua (tranh uq_teams_org_name 500)."""
    sql = "SELECT 1 FROM teams WHERE org_id = :org_id AND name = :name"
    params = {"org_id": org_id, "name": name}
    if exclude_team_id:
        sql += " AND team_id != :exclude_team_id"
        params["exclude_team_id"] = exclude_team_id
    row = db.execute(text(sql), params).first()
    return row is not None


def is_leader_of_another_team(
    db: Session,
    user_id: UUID,
    exclude_team_id: UUID | None = None,
) -> bool:
    """Kiem tra user co dang lam to truong cua to nao khac khong (uq_teams_leader)."""
    sql = "SELECT 1 FROM teams WHERE team_leader_id = :user_id"
    params = {"user_id": user_id}
    if exclude_team_id:
        sql += " AND team_id != :exclude_team_id"
        params["exclude_team_id"] = exclude_team_id
    row = db.execute(text(sql), params).first()
    return row is not None


def has_active_tasks(db: Session, team_id: UUID) -> bool:
    """Kiem tra to co cong viec dang thuc hien chua hoan thanh khong."""
    row = db.execute(
        text("SELECT 1 FROM tasks WHERE team_id = :team_id AND status = 'in_progress'"),
        {"team_id": team_id},
    ).first()
    return row is not None


def get_team(db: Session, team_id: UUID) -> dict | None:
    """Lay chi tiet to, kem thong tin To truong va so luong thanh vien."""
    row = db.execute(
        text("""
            SELECT t.team_id, t.org_id, t.name, t.team_leader_id,
                   u.full_name AS leader_name, u.phone AS leader_phone,
                   t.created_at, t.updated_at,
                   (SELECT COUNT(*) FROM users WHERE team_id = t.team_id) AS member_count
            FROM teams t
            LEFT JOIN users u ON t.team_leader_id = u.user_id
            WHERE t.team_id = :team_id
        """),
        {"team_id": team_id},
    ).mappings().first()
    return dict(row) if row else None


def get_team_members(db: Session, team_id: UUID) -> list[dict]:
    """Lay danh sach thanh vien (cong nhan, to truong) thuoc to."""
    rows = db.execute(
        text("""
            SELECT user_id, full_name, phone, role, status
            FROM users
            WHERE team_id = :team_id
            ORDER BY CASE WHEN role = 'leader' THEN 1 ELSE 2 END, full_name ASC
        """),
        {"team_id": team_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def list_teams(
    db: Session,
    *,
    org_id: UUID | None = None,
    keyword: str | None = None,
    owner_id: UUID | None = None,
) -> list[dict]:
    """Danh sach cac to cong nhan co loc theo org_id, keyword, owner_id."""
    conditions = ["1=1"]
    params: dict = {}

    join_org = ""
    if owner_id:
        join_org = "JOIN organizations o ON t.org_id = o.org_id"
        conditions.append("o.owner_id = :owner_id")
        params["owner_id"] = owner_id

    if org_id:
        conditions.append("t.org_id = :org_id")
        params["org_id"] = org_id

    if keyword:
        conditions.append("t.name ILIKE :kw")
        params["kw"] = f"%{keyword}%"

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT t.team_id, t.org_id, t.name, t.team_leader_id,
               u.full_name AS leader_name, u.phone AS leader_phone,
               t.created_at,
               (SELECT COUNT(*) FROM users WHERE team_id = t.team_id) AS member_count
        FROM teams t
        {join_org}
        LEFT JOIN users u ON t.team_leader_id = u.user_id
        WHERE {where_clause}
        ORDER BY t.name ASC
    """
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


def create_team(
    db: Session,
    *,
    org_id: UUID,
    name: str,
    team_leader_id: UUID | None = None,
) -> dict:
    """Tao to moi. Neu co chi dinh team_leader_id, tu dong gan team_id va cap nhat role leader cho user."""
    row = db.execute(
        text("""
            INSERT INTO teams (org_id, name, team_leader_id)
            VALUES (:org_id, :name, :team_leader_id)
            RETURNING team_id, org_id, name, team_leader_id, created_at, updated_at
        """),
        {"org_id": org_id, "name": name, "team_leader_id": team_leader_id},
    ).mappings().first()
    created = dict(row)

    if team_leader_id:
        # Gan user vao to nay va doi vai tro thanh leader
        db.execute(
            text("UPDATE users SET team_id = :team_id, role = 'leader' WHERE user_id = :user_id"),
            {"team_id": created["team_id"], "user_id": team_leader_id},
        )

    db.commit()
    return get_team(db, created["team_id"])


def update_team(db: Session, team_id: UUID, data: dict, old_team: dict) -> dict:
    """Cap nhat ten to hoac thay doi To truong."""
    set_clauses = []
    params: dict = {"team_id": team_id}

    if "name" in data:
        set_clauses.append("name = :name")
        params["name"] = data["name"]

    if "team_leader_id" in data:
        new_leader_id = data["team_leader_id"]
        old_leader_id = old_team.get("team_leader_id")

        set_clauses.append("team_leader_id = :team_leader_id")
        params["team_leader_id"] = new_leader_id

        # Neu leader moi khac leader cu
        if new_leader_id != old_leader_id:
            # Ha role nguoi cu ve worker TRUOC. Ho chac chan khong con la leader
            # cua to nao khac nua vi uq_teams_leader dam bao 1 nguoi chi lam
            # leader DUNG 1 to tai 1 thoi diem -> to nay la to duy nhat ho tung dan dat.
            if old_leader_id:
                db.execute(
                    text("UPDATE users SET role = 'worker' WHERE user_id = :uid AND role = 'leader'"),
                    {"uid": old_leader_id},
                )
            # Gan leader moi
            if new_leader_id:
                db.execute(
                    text("UPDATE users SET team_id = :team_id, role = 'leader' WHERE user_id = :uid"),
                    {"team_id": team_id, "uid": new_leader_id},
                )

    if set_clauses:
        sql = f"""
            UPDATE teams
            SET {', '.join(set_clauses)}
            WHERE team_id = :team_id
        """
        db.execute(text(sql), params)
        db.commit()

    return get_team(db, team_id)


def delete_team(db: Session, team_id: UUID) -> None:
    """Xoa to. Bang users co FK on delete set null nen cac thanh vien se tu dong ve team_id = null.
    Rieng tasks.team_id va season_team_assignments.team_id KHONG co ON DELETE -> se
    chan hard delete neu to nay tung duoc giao viec hoac ho tro mua vu (ke ca da xong)."""
    try:
        db.execute(
            text("DELETE FROM teams WHERE team_id = :team_id"),
            {"team_id": team_id},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise


def add_members_to_team(
    db: Session,
    team_id: UUID,
    worker_ids: list[UUID],
    org_id: UUID,
) -> int:
    """Them cac cong nhan thuoc nong trai vao to."""
    if not worker_ids:
        return 0
    res = db.execute(
        text("""
            UPDATE users
            SET team_id = :team_id
            WHERE user_id = ANY(:worker_ids) AND org_id = :org_id
        """),
        {"team_id": team_id, "worker_ids": worker_ids, "org_id": org_id},
    )
    db.commit()
    return res.rowcount


def remove_member_from_team(db: Session, team_id: UUID, user_id: UUID) -> None:
    """Go cong nhan khoi to. Neu nguoi nay dang la To truong thi go ca team_leader_id o to
    va ha role ve worker (tranh 'leader mo coi': role=leader nhung khong con quan ly to nao."""

    # Phai check + ha role TRUOC khi UPDATE teams ben duoi, vi EXISTS can doc
    # dung team_leader_id hien tai (con la user_id nay) truoc khi bi xoa.
    db.execute(
        text("""
            UPDATE users SET role = 'worker'
            WHERE user_id = :user_id AND role = 'leader'
              AND EXISTS (
                  SELECT 1 FROM teams
                  WHERE team_id = :team_id AND team_leader_id = :user_id
              )
        """),
        {"team_id": team_id, "user_id": user_id},
    )
    db.execute(
        text("UPDATE teams SET team_leader_id = NULL WHERE team_id = :team_id AND team_leader_id = :user_id"),
        {"team_id": team_id, "user_id": user_id},
    )
    db.execute(
        text("UPDATE users SET team_id = NULL WHERE user_id = :user_id AND team_id = :team_id"),
        {"user_id": user_id, "team_id": team_id},
    )
    db.commit()
