from pydantic_settings import BaseSettings
from pathlib import Path
import os
from dotenv import load_dotenv

# Tự động định vị file .env chuẩn xác dù ứng dụng được chạy từ bất kỳ thư mục nào
_env_candidates = [
    Path(__file__).resolve().parent.parent.parent / '.env',  # backend/.env
    Path.cwd() / 'backend' / '.env',
    Path.cwd() / '.env',
]
for _candidate in _env_candidates:
    if _candidate.is_file():
        load_dotenv(dotenv_path=_candidate, override=True)
        break
else:
    load_dotenv(override=True)

class Settings(BaseSettings):
    database_url: str = os.getenv('DATABASE_URL', '')
    sms_provider: str = os.getenv('SMS_PROVIDER', 'esms').lower().strip()
    otp_expire_minutes: int = int(os.getenv('OTP_EXPIRE_MINUTES', '5'))
    otp_max_attempts: int = int(os.getenv('OTP_MAX_ATTEMPTS', '5'))
    password_reset_demo_enabled: bool = os.getenv('PASSWORD_RESET_DEMO_ENABLED', 'false').lower() in ('true', '1', 'yes')

    # eSMS configuration
    esms_api_key: str = os.getenv('ESMS_API_KEY', '')
    esms_secret_key: str = os.getenv('ESMS_SECRET_KEY', '')
    esms_brandname: str = os.getenv('ESMS_BRANDNAME', 'Baotrixemay')
    esms_sms_type: str = os.getenv('ESMS_SMS_TYPE', '8')  # '8': Đầu số cố định 10 số (OTP), '2': Brandname CSKH

    # Twilio configuration
    twilio_account_sid: str = os.getenv('TWILIO_ACCOUNT_SID', '')
    twilio_auth_token: str = os.getenv('TWILIO_AUTH_TOKEN', '')
    twilio_from_number: str = os.getenv('TWILIO_FROM_NUMBER', '') or os.getenv('TWILIO_PHONE_NUMBER', '')

    # SpeedSMS configuration (Vietnam SMS Gateway)
    speedsms_access_token: str = os.getenv('SPEEDSMS_ACCESS_TOKEN', '')

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
