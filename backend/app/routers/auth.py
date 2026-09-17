from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import LoginRequest, Token, UserInformation, ChangePasswordRequest
from app.crud import user as crud_user
from datetime import datetime, timezone
from jose import jwt, JWTError
from app.core.security import (
    verify_password, create_access_token, get_current_user,
    hash_password, oauth2_scheme, SECRET_KEY, ALGORITHM,
) 
from app.crud import token_blacklist as crud_blacklist

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

@router.get("/me", response_model=UserInformation)
def me(current_user: dict = Depends(get_current_user)):
    return UserInformation(
        full_name=current_user["full_name"],
        phone=current_user["phone"],
        national_id=current_user.get("national_id"),
        address=current_user.get("address"),
        role=current_user["role"],
        org_id=str(current_user["org_id"]) if current_user.get("org_id") else None,
        team_id=str(current_user["team_id"]) if current_user.get("team_id") else None,
    )

#token_blacklist trong hqtcsdl co the bi phinh to ra, khi do can admin xoa thu cong hoac la set 1 co che tu dong xoa token_blacklist đó
@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Token khong hop le")

    jti = payload.get("jti")
    exp_timestamp = payload.get("exp")
    expires_at = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)

    crud_blacklist.add_to_blacklist(db, jti, current_user["user_id"], expires_at)

    return {"message": "Dang xuat thanh cong"}

@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, token: str = Depends(oauth2_scheme), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),):
    #Xác thuc mk cu truoc
    if not verify_password(payload.old_password, current_user["password_hash"]):
        raise HTTPException(400, "Mat khau cu khong dung")

    #Rang buoc điều kiện đặt mk mới
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Mat khau moi phai co it nhat 8 ky tu")
    if payload.new_password.strip() != payload.new_password or not payload.new_password.strip():
        raise HTTPException(400, "Mat khau khong duoc chua khoang trang dau/cuoi hoac toan khoang trang")
    if not any(c.isalpha() for c in payload.new_password):
        raise HTTPException(400, "Mat khau moi phai chua it nhat 1 chu cai")
    if not any(c.isdigit() for c in payload.new_password):
        raise HTTPException(400, "Mat khau moi phai chua it nhat 1 chu so")
    if len(set(payload.new_password)) == 1:
        raise HTTPException(400, "Mat khau moi khong duoc toan ky tu giong nhau")
    if payload.new_password == payload.old_password:
        raise HTTPException(400, "Mat khau moi phai khac mat khau cu")

    #Băm và lưu mk ms
    new_hash = hash_password(payload.new_password)
    crud_user.update_password(db, current_user["user_id"], new_hash)

    #Thu hoi token hien tại, bắt đang nhập lại
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = decoded.get("jti")
        exp_timestamp = decoded.get("exp")
        expires_at = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        crud_blacklist.add_to_blacklist(db, jti, current_user["user_id"], expires_at)
    except JWTError:
        pass  # token da khong hop le thi khong can blacklist them

    return {"message": "Doi mat khau thanh cong, vui long dang nhap lai"}