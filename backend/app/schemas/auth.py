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


class ForgotPasswordRequest(BaseModel):
    phone: str


class ForgotPasswordResponse(BaseModel):
    challenge: str
    session_id: str
    expires_in: int = 300
    resend_available_in: int = 60
    message: str = "Mã xác nhận đã được gửi về số điện thoại của bạn."
    demo_otp: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    challenge: str
    otp: str


class VerifyOtpResponse(BaseModel):
    reset_token: str
    expires_in: int = 600
    message: str = "Xác thực mã OTP thành công."


class ResendOtpRequest(BaseModel):
    challenge: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

