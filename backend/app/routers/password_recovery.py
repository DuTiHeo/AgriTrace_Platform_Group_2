"""Development OTP flow. Disabled unless PASSWORD_RESET_DEMO_ENABLED=true.

Replace demo delivery with an SMS provider before enabling recovery in production.
"""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.core.security import ALGORITHM, SECRET_KEY, hash_password, verify_password
from app.crud.user import get_user_by_phone
from app.db.session import get_db

router = APIRouter()


class PhoneRequest(BaseModel):
    phone: str = Field(min_length=1, max_length=20)


class VerifyRequest(BaseModel):
    challenge: str = Field(max_length=2048)
    otp: str = Field(pattern=r"^\d{4}$")


class ResetRequest(BaseModel):
    reset_token: str = Field(max_length=2048)
    new_password: str = Field(min_length=8, max_length=72)


def demo_enabled():
    if os.getenv("PASSWORD_RESET_DEMO_ENABLED", "false").lower() != "true":
        raise HTTPException(503, "Khôi phục mật khẩu chưa được bật. Vui lòng liên hệ quản trị viên.")


def digest(value: str) -> str:
    return hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def issue(user, purpose, **extra):
    return jwt.encode({
        "sub": str(user["user_id"]), "phone": user["phone"], "purpose": purpose,
        "version": digest(user["password_hash"]),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "nonce": secrets.token_hex(16), **extra,
    }, SECRET_KEY, algorithm=ALGORITHM)


def validate(token, purpose, db):
    try:
        claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if claims.get("purpose") != purpose:
            raise ValueError()
        user = get_user_by_phone(db, claims["phone"])
        if (not user or user["status"] != "active"
                or str(user["user_id"]) != claims["sub"]
                or not hmac.compare_digest(claims["version"], digest(user["password_hash"]))):
            raise ValueError()
        return claims, user
    except (JWTError, ValueError, KeyError, TypeError):
        raise HTTPException(400, "Phiên khôi phục không hợp lệ hoặc đã hết hạn. Vui lòng bắt đầu lại.")


@router.post("/forgot-password", dependencies=[Depends(demo_enabled)])
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: PhoneRequest, db: Session = Depends(get_db)):
    user = get_user_by_phone(db, payload.phone.strip())
    if not user:
        raise HTTPException(404, "Số điện thoại chưa được đăng ký.")
    if user["status"] != "active":
        raise HTTPException(403, "Tài khoản đã bị vô hiệu hóa.")
    otp = f"{secrets.randbelow(10000):04d}"
    return {"challenge": issue(user, "otp", otp_digest=digest(otp)),
            "demo_otp": otp, "expires_in": 300}


@router.post("/verify-otp", dependencies=[Depends(demo_enabled)])
@limiter.limit("5/minute")
def verify_otp(request: Request, payload: VerifyRequest, db: Session = Depends(get_db)):
    claims, user = validate(payload.challenge, "otp", db)
    if not hmac.compare_digest(claims.get("otp_digest", ""), digest(payload.otp)):
        raise HTTPException(400, "Mã OTP không đúng.")
    return {"reset_token": issue(user, "reset")}


@router.post("/reset-password", dependencies=[Depends(demo_enabled)])
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetRequest, db: Session = Depends(get_db)):
    _, user = validate(payload.reset_token, "reset", db)
    password = payload.new_password
    if (len(password.encode()) > 72 or password != password.strip()
            or not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password)):
        raise HTTPException(400, "Mật khẩu cần ít nhất 8 ký tự, có chữ và số, tối đa 72 byte và không có khoảng trắng đầu/cuối.")
    if verify_password(password, user["password_hash"]):
        raise HTTPException(400, "Mật khẩu mới phải khác mật khẩu cũ.")
    # Atomic comparison prevents concurrent reuse of the same recovery token.
    result = db.execute(text("""UPDATE users SET password_hash = :new_hash
        WHERE user_id = :user_id AND password_hash = :old_hash AND status = 'active'"""),
        {"new_hash": hash_password(password), "user_id": user["user_id"], "old_hash": user["password_hash"]})
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(400, "Phiên khôi phục đã được sử dụng. Vui lòng bắt đầu lại.")
    db.commit()
    return {"message": "Đã cập nhật mật khẩu. Vui lòng đăng nhập lại."}
