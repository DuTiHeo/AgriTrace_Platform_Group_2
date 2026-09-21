from datetime import date, timedelta
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.crud import crop as crud_crop


def get_season(db: Session, season_id: UUID) -> dict | None:
    """Lay chi tiet mua vu kem thong tin lo, giong cay va so nhat ky da ghi."""
    row = db.execute(
        text("""
            SELECT s.season_id, s.plot_id, p.code AS plot_code, p.org_id,
                   s.crop_id, c.name AS crop_name, c.growth_days, c.planting_guide,
                   s.planting_date, s.expected_harvest_date, s.actual_harvest_date,
                   s.status, s.created_at, s.updated_at,
                   (SELECT COUNT(*) FROM farming_logs WHERE season_id = s.season_id) AS farming_logs_count
            FROM seasons s
            JOIN plots p ON s.plot_id = p.plot_id
            JOIN crop_catalog c ON s.crop_id = c.crop_id
            WHERE s.season_id = :season_id
        """),
        {"season_id": season_id},
    ).mappings().first()
    return dict(row) if row else None


def list_reminders_of_season(db: Session, season_id: UUID) -> list[dict]:
    """Lay danh sach lich nhac nho cua mua vu."""
    rows = db.execute(
        text("""
            SELECT reminder_id, milestone_type, remind_date, channel, status
            FROM reminder_schedules
            WHERE season_id = :season_id
            ORDER BY remind_date ASC
        """),
        {"season_id": season_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def list_teams_of_season(db: Session, season_id: UUID) -> list[dict]:
    """Lay danh sach cac to cong nhan ho tro mua vu."""
    rows = db.execute(
        text("""
            SELECT sta.team_id, t.name AS team_name, u.full_name AS leader_name,
                   sta.start_date, sta.end_date
            FROM season_team_assignments sta
            JOIN teams t ON sta.team_id = t.team_id
            LEFT JOIN users u ON t.team_leader_id = u.user_id
            WHERE sta.season_id = :season_id
            ORDER BY t.name ASC
        """),
        {"season_id": season_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def list_seasons(
    db: Session,
    *,
    org_id: UUID | None = None,
    plot_id: UUID | None = None,
    crop_id: UUID | None = None,
    status: str | None = None,
    team_id: UUID | None = None,
    owner_id: UUID | None = None,
) -> list[dict]:
    """Danh sach mua vu voi nhieu bo loc linh hoat va scope theo role."""
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

    if plot_id:
        conditions.append("s.plot_id = :plot_id")
        params["plot_id"] = plot_id

    if crop_id:
        conditions.append("s.crop_id = :crop_id")
        params["crop_id"] = crop_id

    if status:
        conditions.append("s.status = :status")
        params["status"] = status

    join_team = ""
    if team_id:
        join_team = "JOIN season_team_assignments sta ON s.season_id = sta.season_id"
        conditions.append("sta.team_id = :team_id")
        params["team_id"] = team_id

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT s.season_id, s.plot_id, p.code AS plot_code, p.org_id,
               s.crop_id, c.name AS crop_name,
               s.planting_date, s.expected_harvest_date, s.actual_harvest_date,
               s.status, s.created_at,
               COALESCE(
                   (SELECT ARRAY_AGG(t.name)
                    FROM season_team_assignments sta2
                    JOIN teams t ON sta2.team_id = t.team_id
                    WHERE sta2.season_id = s.season_id),
                   ARRAY[]::VARCHAR[]
               ) AS assigned_team_names
        FROM seasons s
        JOIN plots p ON s.plot_id = p.plot_id
        JOIN crop_catalog c ON s.crop_id = c.crop_id
        {join_org}
        {join_team}
        WHERE {where_clause}
        ORDER BY s.planting_date DESC
    """
    rows = db.execute(text(sql), params).mappings().all()
    results = []
    for r in rows:
        d = dict(r)
        d["assigned_team_names"] = list(d["assigned_team_names"]) if d["assigned_team_names"] else []
        results.append(d)
    return results


def create_season(
    db: Session,
    *,
    plot_id: UUID,
    crop_id: UUID,
    planting_date: date,
    expected_harvest_date: date,
    assigned_team_ids: list[UUID] | None = None,
) -> dict:
    """
    Tao moi mua vu:
    1. INSERT ban ghi seasons
    2. Doc danh sach moc cham soc tu crop_catalog qua crud_crop.list_milestones_of_crop
    3. Tu dong sinh cac ban ghi reminder_schedules tuong ung
    4. Gan cac to ho tro vao season_team_assignments neu co
    """
    row = db.execute(
        text("""
            INSERT INTO seasons (plot_id, crop_id, planting_date, expected_harvest_date, status)
            VALUES (:plot_id, :crop_id, :planting_date, :expected_harvest_date, 'growing')
            RETURNING season_id
        """),
        {
            "plot_id": plot_id,
            "crop_id": crop_id,
            "planting_date": planting_date,
            "expected_harvest_date": expected_harvest_date,
        },
    ).mappings().first()
    season_id = row["season_id"]

    # Tu dong sinh reminder_schedules theo crop milestones (UC-O03.3)
    milestones = crud_crop.list_milestones_of_crop(db, crop_id)
    for ms in milestones:
        remind_dt = planting_date + timedelta(days=ms["days_after_planting"])
        db.execute(
            text("""
                INSERT INTO reminder_schedules (season_id, milestone_type, remind_date, channel, status)
                VALUES (:season_id, :milestone_type, :remind_date, 'push', 'scheduled')
            """),
            {
                "season_id": season_id,
                "milestone_type": ms["task_type"],
                "remind_date": remind_dt,
            },
        )

    # Them lich nhac thu hoach
    db.execute(
        text("""
            INSERT INTO reminder_schedules (season_id, milestone_type, remind_date, channel, status)
            VALUES (:season_id, 'harvest', :remind_date, 'push', 'scheduled')
        """),
        {
            "season_id": season_id,
            "remind_date": expected_harvest_date,
        },
    )

    # Gan cac to ho tro ban dau
    if assigned_team_ids:
        for tid in assigned_team_ids:
            db.execute(
                text("""
                    INSERT INTO season_team_assignments (season_id, team_id, start_date)
                    VALUES (:season_id, :team_id, :start_date)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "season_id": season_id,
                    "team_id": tid,
                    "start_date": planting_date,
                },
            )

    db.commit()
    return get_season(db, season_id)


def update_season(db: Session, season_id: UUID, data: dict) -> dict:
    """Cap nhat thong tin mua vu (ngay thu hoach, trang thai)."""
    set_clauses = []
    params: dict = {"season_id": season_id}

    if "expected_harvest_date" in data:
        set_clauses.append("expected_harvest_date = :expected_harvest_date")
        params["expected_harvest_date"] = data["expected_harvest_date"]

    if "actual_harvest_date" in data:
        set_clauses.append("actual_harvest_date = :actual_harvest_date")
        params["actual_harvest_date"] = data["actual_harvest_date"]

    if "status" in data:
        status_val = data["status"].value if hasattr(data["status"], "value") else data["status"]
        set_clauses.append("status = :status")
        params["status"] = status_val

        # Neu status la completed va chua co actual_harvest_date, tu dong lay ngay hom nay
        if status_val == "completed" and "actual_harvest_date" not in data:
            set_clauses.append("actual_harvest_date = COALESCE(actual_harvest_date, CURRENT_DATE)")

    if set_clauses:
        sql = f"""
            UPDATE seasons
            SET {', '.join(set_clauses)}
            WHERE season_id = :season_id
        """
        db.execute(text(sql), params)
        db.commit()

    return get_season(db, season_id)


def has_farming_logs_or_batches(db: Session, season_id: UUID) -> tuple[bool, str]:
    """Kiem tra xem mua vu da phat sinh nhat ky canh tac hoac lo thu hoach chua."""
    log_exists = db.execute(
        text("SELECT 1 FROM farming_logs WHERE season_id = :season_id LIMIT 1"),
        {"season_id": season_id},
    ).first()
    if log_exists:
        return True, "Mua vu da co nhat ky canh tac, khong the xoa de dam bao tinh toan ven"

    batch_exists = db.execute(
        text("SELECT 1 FROM batch_seasons WHERE season_id = :season_id LIMIT 1"),
        {"season_id": season_id},
    ).first()
    if batch_exists:
        return True, "Mua vu da duoc gom vao lo thu hoach, khong the xoa"

    return False, ""


def delete_season(db: Session, season_id: UUID) -> None:
    """Xoa mua vu (DB tu dong cascade xoa reminder_schedules va season_team_assignments)."""
    db.execute(
        text("DELETE FROM seasons WHERE season_id = :season_id"),
        {"season_id": season_id},
    )
    db.commit()


def assign_team(
    db: Session,
    season_id: UUID,
    team_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> None:
    """Gan to ho tro vao mua vu."""
    db.execute(
        text("""
            INSERT INTO season_team_assignments (season_id, team_id, start_date, end_date)
            VALUES (:season_id, :team_id, :start_date, :end_date)
            ON CONFLICT (season_id, team_id)
            DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
        """),
        {
            "season_id": season_id,
            "team_id": team_id,
            "start_date": start_date,
            "end_date": end_date,
        },
    )
    db.commit()


def remove_team(db: Session, season_id: UUID, team_id: UUID) -> None:
    """Go to khoi mua vu."""
    db.execute(
        text("DELETE FROM season_team_assignments WHERE season_id = :season_id AND team_id = :team_id"),
        {"season_id": season_id, "team_id": team_id},
    )
    db.commit()
