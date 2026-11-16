import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def digest_value(secret_key: str, value: str) -> str:
    """Tạo mã băm HMAC-SHA256 an toàn."""
    return hmac.new(secret_key.encode(), value.encode(), hashlib.sha256).hexdigest()


def ensure_otp_table(db: Session) -> None:
    """Tự động tạo bảng otp_verifications nếu chưa có sẵn trong CSDL."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS otp_verifications (
            id                  UUID PRIMARY KEY,
            user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            phone               VARCHAR(20) NOT NULL,
            otp_hash            VARCHAR(255) NOT NULL,
            purpose             VARCHAR(30) NOT NULL DEFAULT 'password_reset',
            attempts            INT NOT NULL DEFAULT 0,
            max_attempts        INT NOT NULL DEFAULT 5,
            is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
            is_used             BOOLEAN NOT NULL DEFAULT FALSE,
            reset_token_hash    VARCHAR(255),
            expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
            resend_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose ON otp_verifications(phone, purpose)
    """))
    db.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at)
    """))
    db.commit()


def create_otp_record(
    db: Session,
    user_id: UUID,
    phone: str,
    otp_code: str,
    secret_key: str,
    expire_minutes: int = 5,
    max_attempts: int = 5,
    purpose: str = "password_reset"
) -> dict:
    """Vô hiệu hóa OTP cũ và tạo một phiên OTP mới."""
    ensure_otp_table(db)

    # Đánh dấu các OTP cũ chưa dùng thành đã dùng để tránh xung đột mã cũ
    db.execute(
        text("""
            UPDATE otp_verifications
            SET is_used = TRUE
            WHERE phone = :phone AND purpose = :purpose AND is_used = FALSE
        """),
        {"phone": phone, "purpose": purpose}
    )

    record_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expire_minutes)
    resend_available_at = now + timedelta(seconds=60)
    otp_hash = digest_value(secret_key, otp_code)

    db.execute(
        text("""
            INSERT INTO otp_verifications (
                id, user_id, phone, otp_hash, purpose, attempts, max_attempts,
                is_verified, is_used, expires_at, resend_available_at
            )
            VALUES (
                :id, :user_id, :phone, :otp_hash, :purpose, 0, :max_attempts,
                FALSE, FALSE, :expires_at, :resend_available_at
            )
        """),
        {
            "id": str(record_id),
            "user_id": str(user_id),
            "phone": phone,
            "otp_hash": otp_hash,
            "purpose": purpose,
            "max_attempts": max_attempts,
            "expires_at": expires_at,
            "resend_available_at": resend_available_at
        }
    )
    db.commit()

    return {
        "id": record_id,
        "user_id": user_id,
        "phone": phone,
        "otp_hash": otp_hash,
        "purpose": purpose,
        "attempts": 0,
        "max_attempts": max_attempts,
        "is_verified": False,
        "is_used": False,
        "expires_at": expires_at,
        "resend_available_at": resend_available_at
    }


def get_otp_record(db: Session, record_id: str | UUID) -> dict | None:
    ensure_otp_table(db)
    row = db.execute(
        text("SELECT * FROM otp_verifications WHERE id = :id"),
        {"id": str(record_id)}
    ).mappings().first()
    return dict(row) if row else None


def verify_otp_code(
    db: Session,
    record_id: str | UUID,
    otp_code: str,
    secret_key: str
) -> tuple[bool, str, dict | None]:
    """
    Xác thực mã OTP:
    - Kiểm tra hạn dùng
    - Kiểm tra số lần nhập sai
    - Tăng số lần thử nếu nhập sai
    - Trả về (success, message, record)
    """
    record = get_otp_record(db, record_id)
    if not record:
        return False, "Phiên khôi phục không hợp lệ hoặc không tồn tại.", None

    if record["is_used"]:
        return False, "Phiên khôi phục này đã được sử dụng. Vui lòng bắt đầu lại.", None

    now = datetime.now(timezone.utc)
    expires_at = record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        return False, "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.", None

    if record["attempts"] >= record["max_attempts"]:
        return False, "Mã OTP đã bị vô hiệu hóa do nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.", None

    calculated_hash = digest_value(secret_key, otp_code)
    is_match = hmac.compare_digest(calculated_hash, record["otp_hash"])

    if not is_match:
        new_attempts = record["attempts"] + 1
        db.execute(
            text("UPDATE otp_verifications SET attempts = :attempts WHERE id = :id"),
            {"attempts": new_attempts, "id": str(record_id)}
        )
        db.commit()
        remaining = max(0, record["max_attempts"] - new_attempts)
        if remaining > 0:
            return False, f"Mã OTP không đúng. Bạn còn {remaining} lần thử.", None
        return False, "Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy. Vui lòng lấy mã mới.", None

    # OTP đúng -> cập nhật is_verified = TRUE
    db.execute(
        text("UPDATE otp_verifications SET is_verified = TRUE WHERE id = :id"),
        {"id": str(record_id)}
    )
    db.commit()

    record["is_verified"] = True
    return True, "Xác thực mã OTP thành công.", record


def update_reset_token_hash(db: Session, record_id: str | UUID, token_hash: str) -> None:
    db.execute(
        text("UPDATE otp_verifications SET reset_token_hash = :hash WHERE id = :id"),
        {"hash": token_hash, "id": str(record_id)}
    )
    db.commit()


def mark_otp_as_used(db: Session, record_id: str | UUID, token_hash: str) -> bool:
    """
    Kiểm tra và đánh dấu reset_token đã sử dụng một cách nguyên tử (Atomic).
    Chỉ cho phép sử dụng nếu:
    - is_verified == True
    - is_used == False
    - reset_token_hash khớp
    """
    result = db.execute(
        text("""
            UPDATE otp_verifications
            SET is_used = TRUE
            WHERE id = :id
              AND is_verified = TRUE
              AND is_used = FALSE
              AND reset_token_hash = :hash
        """),
        {"id": str(record_id), "hash": token_hash}
    )
    if result.rowcount == 1:
        db.commit()
        return True
    db.rollback()
    return False
