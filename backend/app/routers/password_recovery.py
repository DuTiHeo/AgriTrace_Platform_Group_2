import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import ALGORITHM, SECRET_KEY, hash_password, verify_password
from app.crud import otp as crud_otp
from app.crud.user import get_user_by_phone
from app.db.session import get_db
from app.utils.sms import send_sms_otp

router = APIRouter()


class PhoneRequest(BaseModel):
    phone: str = Field(min_length=1, max_length=20)


class VerifyRequest(BaseModel):
    challenge: str = Field(max_length=2048)
    otp: str = Field(pattern=r"^\d{4,6}$")


class ResendRequest(BaseModel):
    challenge: str = Field(max_length=2048)


class ResetRequest(BaseModel):
    reset_token: str = Field(max_length=2048)
    new_password: str = Field(min_length=8, max_length=72)


def digest(value: str) -> str:
    """Tạo mã băm HMAC-SHA256 theo SECRET_KEY."""
    return hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def issue_token(user: dict, purpose: str, session_id: str | None = None, expire_minutes: int = 5, **extra) -> str:
    """Tạo JWT Token có thời hạn và gắn version của password cũ để chống giả mạo."""
    payload = {
        "sub": str(user["user_id"]),
        "phone": user["phone"],
        "purpose": purpose,
        "session_id": session_id,
        "version": digest(user["password_hash"]),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expire_minutes),
        "nonce": secrets.token_hex(16),
        **extra,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def validate_token(token: str, purpose: str, db: Session) -> tuple[dict, dict]:
    """Giải mã và xác thực token JWT cùng trạng thái user hiện tại."""
    try:
        claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if claims.get("purpose") != purpose:
            raise ValueError("Mục đích của phiên không hợp lệ.")
        user = get_user_by_phone(db, claims["phone"])
        if (
            not user
            or user["status"] != "active"
            or str(user["user_id"]) != claims["sub"]
            or not hmac.compare_digest(claims["version"], digest(user["password_hash"]))
        ):
            raise ValueError("Người dùng không hợp lệ hoặc mật khẩu đã bị thay đổi.")
        return claims, user
    except (JWTError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Phiên khôi phục không hợp lệ hoặc đã hết hạn. Vui lòng bắt đầu lại."
        )


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: PhoneRequest, db: Session = Depends(get_db)):
    """
    Bước 1: Nhận số điện thoại -> Tạo OTP -> Gửi SMS -> Trả về challenge token.
    """
    phone = payload.phone.strip()
    user = get_user_by_phone(db, phone)
    if not user:
        raise HTTPException(status_code=404, detail="Số điện thoại chưa được đăng ký trong hệ thống.")
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị vô hiệu hóa.")

    # Tạo mã OTP 4 chữ số (hoặc 6 chữ số) ngẫu nhiên an toàn
    otp = f"{secrets.randbelow(10000):04d}"

    # Tạo bản ghi lưu trữ OTP vào CSDL để theo dõi số lần thử sai
    otp_record = crud_otp.create_otp_record(
        db=db,
        user_id=user["user_id"],
        phone=phone,
        otp_code=otp,
        secret_key=SECRET_KEY,
        expire_minutes=settings.otp_expire_minutes,
        max_attempts=settings.otp_max_attempts,
        purpose="password_reset"
    )

    # Gửi mã OTP qua SMS Service
    sms_sent = send_sms_otp(phone=phone, otp=otp, expire_minutes=settings.otp_expire_minutes)
    if not sms_sent:
        # Trong trường hợp gửi SMS thất bại nghiêm trọng từ cổng nhà mạng
        pass

    session_id = str(otp_record["id"])
    challenge_token = issue_token(
        user=user,
        purpose="otp",
        session_id=session_id,
        expire_minutes=settings.otp_expire_minutes,
        otp_digest=digest(otp)
    )

    response_data = {
        "challenge": challenge_token,
        "session_id": session_id,
        "expires_in": settings.otp_expire_minutes * 60,
        "resend_available_in": 60,
        "message": "Mã xác nhận OTP đã được gửi về số điện thoại của bạn."
    }

    # Bổ sung demo_otp nếu đang bật chế độ dev/test để thuận tiện kiểm thử
    if settings.password_reset_demo_enabled or settings.sms_provider == "console":
        response_data["demo_otp"] = otp

    return response_data


@router.post("/resend-otp")
@limiter.limit("5/minute")
def resend_otp(request: Request, payload: ResendRequest, db: Session = Depends(get_db)):
    """
    Gửi lại mã OTP sau khoảng thời gian chờ (cooldown 60s).
    """
    claims, user = validate_token(payload.challenge, "otp", db)
    session_id = claims.get("session_id")
    if session_id:
        old_record = crud_otp.get_otp_record(db, session_id)
        if old_record:
            now = datetime.now(timezone.utc)
            resend_at = old_record["resend_available_at"]
            if isinstance(resend_at, str):
                resend_at = datetime.fromisoformat(resend_at)
            if resend_at.tzinfo is None:
                resend_at = resend_at.replace(tzinfo=timezone.utc)

            if resend_at > now:
                remaining_seconds = int((resend_at - now).total_seconds())
                raise HTTPException(
                    status_code=429,
                    detail=f"Vui lòng đợi thêm {remaining_seconds} giây trước khi yêu cầu mã mới."
                )

    otp = f"{secrets.randbelow(10000):04d}"
    otp_record = crud_otp.create_otp_record(
        db=db,
        user_id=user["user_id"],
        phone=user["phone"],
        otp_code=otp,
        secret_key=SECRET_KEY,
        expire_minutes=settings.otp_expire_minutes,
        max_attempts=settings.otp_max_attempts,
        purpose="password_reset"
    )

    send_sms_otp(phone=user["phone"], otp=otp, expire_minutes=settings.otp_expire_minutes)

    new_session_id = str(otp_record["id"])
    new_challenge = issue_token(
        user=user,
        purpose="otp",
        session_id=new_session_id,
        expire_minutes=settings.otp_expire_minutes,
        otp_digest=digest(otp)
    )

    response_data = {
        "challenge": new_challenge,
        "session_id": new_session_id,
        "expires_in": settings.otp_expire_minutes * 60,
        "resend_available_in": 60,
        "message": "Đã gửi lại mã OTP mới về số điện thoại của bạn."
    }

    if settings.password_reset_demo_enabled or settings.sms_provider == "console":
        response_data["demo_otp"] = otp

    return response_data


@router.post("/verify-otp")
@limiter.limit("10/minute")
def verify_otp(request: Request, payload: VerifyRequest, db: Session = Depends(get_db)):
    """
    Bước 2: Nhập mã OTP -> Xác thực -> Trả về reset_token.
    """
    claims, user = validate_token(payload.challenge, "otp", db)
    session_id = claims.get("session_id")

    if session_id:
        # Xác thực với bản ghi DB và kiểm tra số lần nhập sai
        success, message, _ = crud_otp.verify_otp_code(
            db=db,
            record_id=session_id,
            otp_code=payload.otp.strip(),
            secret_key=SECRET_KEY
        )
        if not success:
            raise HTTPException(status_code=400, detail=message)
    else:
        # Fallback xác thực qua digest token nếu không có session_id
        if not hmac.compare_digest(claims.get("otp_digest", ""), digest(payload.otp.strip())):
            raise HTTPException(status_code=400, detail="Mã OTP không đúng.")

    # Cấp reset_token có hiệu lực 10 phút
    reset_token = issue_token(
        user=user,
        purpose="reset",
        session_id=session_id,
        expire_minutes=10
    )

    # Lưu mã băm của reset_token vào bản ghi để đảm bảo token chỉ được dùng 1 lần duy nhất
    if session_id:
        crud_otp.update_reset_token_hash(db, session_id, digest(reset_token))

    return {
        "reset_token": reset_token,
        "expires_in": 600,
        "message": "Xác thực mã OTP thành công."
    }


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetRequest, db: Session = Depends(get_db)):
    """
    Bước 3: Nhập mật khẩu mới -> Cập nhật CSDL.
    """
    claims, user = validate_token(payload.reset_token, "reset", db)
    session_id = claims.get("session_id")

    # Kiểm tra trước xem phiên này đã từng bị dùng chưa (nếu có session_id)
    if session_id:
        record = crud_otp.get_otp_record(db, session_id)
        if not record or record["is_used"]:
            raise HTTPException(
                status_code=400,
                detail="Phiên khôi phục này đã được sử dụng. Vui lòng bắt đầu lại."
            )
        if record.get("reset_token_hash") and not hmac.compare_digest(record["reset_token_hash"], digest(payload.reset_token)):
            raise HTTPException(
                status_code=400,
                detail="Mã xác nhận khôi phục không hợp lệ."
            )

    password = payload.new_password

    # Kiểm tra ràng buộc độ mạnh mật khẩu theo quy tắc hệ thống
    if (
        len(password.encode("utf-8")) > 72
        or len(password) < 8
        or password != password.strip()
        or not any(c.isalpha() for c in password)
        or not any(c.isdigit() for c in password)
    ):
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu cần ít nhất 8 ký tự, có chứa chữ cái và chữ số, không chứa khoảng trắng đầu/cuối."
        )

    if verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại.")

    # Đánh dấu token đã được sử dụng một cách nguyên tử trước khi update password
    if session_id:
        token_valid = crud_otp.mark_otp_as_used(db, session_id, digest(payload.reset_token))
        if not token_valid:
            raise HTTPException(
                status_code=400,
                detail="Phiên khôi phục này đã được sử dụng. Vui lòng bắt đầu lại."
            )

    # Cập nhật mật khẩu mới vào bảng users một cách an toàn
    result = db.execute(
        text("""
            UPDATE users
            SET password_hash = :new_hash,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id
              AND password_hash = :old_hash
              AND status = 'active'
        """),
        {
            "new_hash": hash_password(password),
            "user_id": user["user_id"],
            "old_hash": user["password_hash"]
        }
    )

    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Phiên khôi phục không còn hợp lệ. Vui lòng bắt đầu lại."
        )

    db.commit()

    return {
        "message": "Đã cập nhật mật khẩu mới thành công. Vui lòng đăng nhập lại bằng mật khẩu mới."
    }
