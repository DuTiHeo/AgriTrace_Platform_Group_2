from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import LoginRequest, Token
from app.crud import user as crud_user
from app.core.security import verify_password, create_access_token

router = APIRouter()


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = crud_user.get_user_by_phone(db, payload.phone)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Sai so dien thoai hoac mat khau")
    if user["status"] != "active":
        raise HTTPException(403, "Tai khoan cua ban da bi vo hieu hoa")

    token = create_access_token(user["user_id"], user["role"], user["org_id"], user["team_id"])
    return Token(access_token=token)