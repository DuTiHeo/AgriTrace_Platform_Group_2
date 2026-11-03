from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    phone: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"  

class UserInformation(BaseModel):
    user_id: Optional[str] = None
    full_name: str
    phone: str
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    role: str
    status: Optional[str] = None
    org_id: Optional[str] = None
    team_id: Optional[str] = None
    created_at: Optional[datetime] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
