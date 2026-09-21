from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID


def get_orgs_owned_by(db: Session, user_id: UUID) -> list[dict]:
    """Danh sach nong trai ma user nay dang lam Owner - de FE cho chon
    'dang thao tac nong trai nao' truoc khi goi cac API /users."""
    rows = db.execute(
        text("""
            SELECT org_id, name, address, status
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