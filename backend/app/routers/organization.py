from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import organization as crud_org
from app.schemas.organization import OrganizationSummary
from app.routers.user import require_role

router = APIRouter()


@router.get("/mine", response_model=list[OrganizationSummary])
def list_my_organizations(
    current_user: dict = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    return crud_org.get_orgs_owned_by(db, current_user["user_id"])