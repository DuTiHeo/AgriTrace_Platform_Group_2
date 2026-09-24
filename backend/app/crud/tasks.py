# backend/app/crud/tasks.py
from datetime import date
from typing import Optional
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session


def _ensure_tasks_status_constraint(db: Session) -> None:

    try:
        db.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'tasks_status_check'
                ) THEN
                    ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;
                    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
                        CHECK (status IN ('in_progress', 'completed', 'cancelled'));
                END IF;
            END $$;
        """))
        db.commit()
    except Exception:
        db.rollback()


def validate_task_context(
    db: Session,
    team_id: UUID,
    worker_id: UUID,
    plot_id: UUID,
) -> tuple[bool, str, Optional[UUID]]:

    team = db.execute(
        text("SELECT team_id, org_id, name FROM teams WHERE team_id = :team_id"),
        {"team_id": team_id},
    ).mappings().first()
    if not team:
        return False, "Không tìm thấy tổ công nhân", None

    org_id = team["org_id"]

    plot = db.execute(
        text("SELECT plot_id, org_id, code, status FROM plots WHERE plot_id = :plot_id"),
        {"plot_id": plot_id},
    ).mappings().first()
    if not plot:
        return False, "Không tìm thấy lô đất", None
    if plot["org_id"] != org_id:
        return False, "Lô đất không thuộc cùng nông trại với tổ công nhân", None
    if plot["status"] != "active":
        return False, "Lô đất đang ở trạng thái ngừng hoạt động (inactive)", None

    worker = db.execute(
        text("SELECT user_id, full_name, role, status, org_id, team_id FROM users WHERE user_id = :worker_id"),
        {"worker_id": worker_id},
    ).mappings().first()
    if not worker:
        return False, "Không tìm thấy người dùng (công nhân)", None
    if worker["status"] != "active":
        return False, "Tài khoản của công nhân đang bị khóa", None
    if worker["role"] not in ("worker", "leader"):
        return False, "Chỉ có thể giao việc cho Worker hoặc Leader", None

    # Công nhân phải thuộc cùng nông trại hoặc cùng tổ
    if worker["org_id"] and worker["org_id"] != org_id:
        return False, "Công nhân không thuộc nông trại này", None
    if worker["team_id"] and worker["team_id"] != team_id:
        return False, f"Công nhân đang thuộc tổ khác ({worker['team_id']})", None

    return True, "", org_id


def get_task(db: Session, task_id: UUID) -> Optional[dict]:

    query = text("""
        SELECT t.task_id, t.team_id, tm.name AS team_name, tm.org_id, o.name AS org_name,
               t.worker_id, u.full_name AS worker_name, u.phone AS worker_phone,
               t.plot_id, p.code AS plot_code,
               t.content, t.due_date, t.status, t.created_at, t.updated_at
        FROM tasks t
        JOIN teams tm ON t.team_id = tm.team_id
        JOIN organizations o ON tm.org_id = o.org_id
        JOIN users u ON t.worker_id = u.user_id
        JOIN plots p ON t.plot_id = p.plot_id
        WHERE t.task_id = :task_id;
    """)
    result = db.execute(query, {"task_id": task_id}).mappings().first()
    return dict(result) if result else None


def list_tasks(
    db: Session,
    *,
    org_id: Optional[UUID] = None,
    team_id: Optional[UUID] = None,
    worker_id: Optional[UUID] = None,
    plot_id: Optional[UUID] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    owner_id: Optional[UUID] = None,
    include_cancelled: bool = False,
) -> list[dict]:

    conditions = ["1=1"]
    params: dict = {}

    if owner_id:
        conditions.append("o.owner_id = :owner_id")
        params["owner_id"] = owner_id

    if org_id:
        conditions.append("tm.org_id = :org_id")
        params["org_id"] = org_id

    if team_id:
        conditions.append("t.team_id = :team_id")
        params["team_id"] = team_id

    if worker_id:
        conditions.append("t.worker_id = :worker_id")
        params["worker_id"] = worker_id

    if plot_id:
        conditions.append("t.plot_id = :plot_id")
        params["plot_id"] = plot_id

    if status:
        conditions.append("t.status = :status")
        params["status"] = status
    elif not include_cancelled:
        conditions.append("t.status != 'cancelled'")

    if keyword:
        conditions.append("(t.content ILIKE :kw OR u.full_name ILIKE :kw OR p.code ILIKE :kw)")
        params["kw"] = f"%{keyword}%"

    where_clause = " AND ".join(conditions)
    query = text(f"""
        SELECT t.task_id, t.team_id, tm.name AS team_name, tm.org_id, o.name AS org_name,
               t.worker_id, u.full_name AS worker_name, u.phone AS worker_phone,
               t.plot_id, p.code AS plot_code,
               t.content, t.due_date, t.status, t.created_at, t.updated_at
        FROM tasks t
        JOIN teams tm ON t.team_id = tm.team_id
        JOIN organizations o ON tm.org_id = o.org_id
        JOIN users u ON t.worker_id = u.user_id
        JOIN plots p ON t.plot_id = p.plot_id
        WHERE {where_clause}
        ORDER BY t.created_at DESC;
    """)

    results = db.execute(query, params).mappings().all()
    return [dict(row) for row in results]


def create_task(
    db: Session,
    *,
    team_id: UUID,
    worker_id: UUID,
    plot_id: UUID,
    content: str,
    due_date: Optional[date] = None,
    status: str = "in_progress",
) -> dict:

    query = text("""
        INSERT INTO tasks (team_id, worker_id, plot_id, content, due_date, status)
        VALUES (:team_id, :worker_id, :plot_id, :content, :due_date, :status)
        RETURNING task_id;
    """)
    params = {
        "team_id": team_id,
        "worker_id": worker_id,
        "plot_id": plot_id,
        "content": content,
        "due_date": due_date,
        "status": status,
    }
    result = db.execute(query, params).mappings().first()
    db.commit()

    task_id = result["task_id"]
    return get_task(db, task_id)


def update_task(db: Session, task_id: UUID, update_data: dict) -> Optional[dict]:

    if not update_data:
        return get_task(db, task_id)

    set_clauses = [f"{k} = :{k}" for k in update_data.keys()]
    params = {"task_id": task_id, **update_data}

    query = text(f"""
        UPDATE tasks 
        SET {', '.join(set_clauses)}
        WHERE task_id = :task_id 
        RETURNING task_id;
    """)
    res = db.execute(query, params).mappings().first()
    db.commit()
    return get_task(db, task_id) if res else None


def soft_delete_task(db: Session, task_id: UUID) -> Optional[dict]:

    _ensure_tasks_status_constraint(db)
    query = text("""
        UPDATE tasks 
        SET status = 'cancelled'
        WHERE task_id = :task_id 
        RETURNING task_id;
    """)
    res = db.execute(query, {"task_id": task_id}).mappings().first()
    db.commit()
    return get_task(db, task_id) if res else None