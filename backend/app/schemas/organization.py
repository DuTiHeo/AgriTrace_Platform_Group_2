from uuid import UUID
from pydantic import BaseModel


class OrganizationSummary(BaseModel):
    """Dung cho GET /organizations/mine - Owner xem cac nong trai minh so huu."""
    org_id: UUID
    name: str
    address: str | None = None
    status: str