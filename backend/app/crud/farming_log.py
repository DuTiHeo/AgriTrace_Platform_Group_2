from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _row_to_log(row) -> dict:
    data = dict(row)
    data["gps"] = {
        "latitude": data.pop("latitude"),
        "longitude": data.pop("longitude"),
    }
    return data


def get_season_scope(db: Session, season_id: UUID) -> dict | None:
    row = db.execute(
        text("""
            SELECT s.season_id, s.status, p.org_id
            FROM seasons s
            JOIN plots p ON s.plot_id = p.plot_id
            WHERE s.season_id = :season_id
        """),
        {"season_id": season_id},
    ).mappings().first()
    return dict(row) if row else None


def create_log(
    db: Session,
    *,
    season_id: UUID,
    user_id: UUID,
    activity_type: str,
    content: str | None,
    latitude: float,
    longitude: float,
) -> dict:
    row = db.execute(
        text("""
            INSERT INTO farming_logs (season_id, user_id, activity_type, content, gps)
            VALUES (
                :season_id,
                :user_id,
                :activity_type,
                :content,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)
            )
            RETURNING log_id
        """),
        {
            "season_id": season_id,
            "user_id": user_id,
            "activity_type": activity_type,
            "content": content,
            "latitude": latitude,
            "longitude": longitude,
        },
    ).mappings().first()
    db.commit()
    return get_log(db, row["log_id"])


def _base_log_select() -> str:
    return """
        SELECT fl.log_id, fl.season_id, fl.user_id, u.full_name AS user_name,
               u.team_id, p.org_id, fl.activity_type, fl.content,
               ST_Y(fl.gps) AS latitude, ST_X(fl.gps) AS longitude,
               fl.logged_at
        FROM farming_logs fl
        JOIN users u ON fl.user_id = u.user_id
        JOIN seasons s ON fl.season_id = s.season_id
        JOIN plots p ON s.plot_id = p.plot_id
    """


def get_log(db: Session, log_id: UUID) -> dict | None:
    row = db.execute(
        text(f"""
            {_base_log_select()}
            WHERE fl.log_id = :log_id
        """),
        {"log_id": log_id},
    ).mappings().first()
    return _row_to_log(row) if row else None


def list_logs(
    db: Session,
    *,
    org_id: UUID | None = None,
    owner_id: UUID | None = None,
    team_id: UUID | None = None,
    season_id: UUID | None = None,
) -> list[dict]:
    conditions = ["1=1"]
    params: dict = {}
    join_owner = ""

    if owner_id:
        join_owner = "JOIN organizations o ON p.org_id = o.org_id"
        conditions.append("o.owner_id = :owner_id")
        params["owner_id"] = owner_id
    if org_id:
        conditions.append("p.org_id = :org_id")
        params["org_id"] = org_id
    if team_id:
        conditions.append("u.team_id = :team_id")
        params["team_id"] = team_id
    if season_id:
        conditions.append("fl.season_id = :season_id")
        params["season_id"] = season_id

    rows = db.execute(
        text(f"""
            {_base_log_select()}
            {join_owner}
            WHERE {' AND '.join(conditions)}
            ORDER BY fl.logged_at DESC
        """),
        params,
    ).mappings().all()
    return [_row_to_log(row) for row in rows]


def list_photos(db: Session, log_id: UUID) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT photo_id, log_id, url, created_at
            FROM log_photos
            WHERE log_id = :log_id
            ORDER BY created_at ASC
        """),
        {"log_id": log_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def count_photos(db: Session, log_id: UUID) -> int:
    row = db.execute(
        text("SELECT COUNT(*) AS total FROM log_photos WHERE log_id = :log_id"),
        {"log_id": log_id},
    ).mappings().first()
    return int(row["total"])


def add_photos(db: Session, log_id: UUID, urls: list[str]) -> list[dict]:
    for url in urls:
        db.execute(
            text("""
                INSERT INTO log_photos (log_id, url)
                VALUES (:log_id, :url)
            """),
            {"log_id": log_id, "url": url},
        )
    db.commit()
    return list_photos(db, log_id)


def list_notes(db: Session, log_id: UUID) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT ln.note_id, ln.log_id, ln.leader_id, u.full_name AS leader_name,
                   ln.content, ln.resolved, ln.created_at
            FROM log_notes ln
            JOIN users u ON ln.leader_id = u.user_id
            WHERE ln.log_id = :log_id
            ORDER BY ln.created_at ASC
        """),
        {"log_id": log_id},
    ).mappings().all()
    return [dict(row) for row in rows]
