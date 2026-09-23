from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    phone: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"  

class UserInformation(BaseModel):
    full_name: str
    phone: str
    national_id: Optional[str] = None
    address: Optional[str] = None
    role: str
    org_id: Optional[str] = None
    team_id: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str