from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    database_url: str = os.getenv('DATABASE_URL', '')
    sms_provider: str = os.getenv('SMS_PROVIDER', 'console')  # 'console', 'esms', 'twilio'
    otp_expire_minutes: int = int(os.getenv('OTP_EXPIRE_MINUTES', '5'))
    otp_max_attempts: int = int(os.getenv('OTP_MAX_ATTEMPTS', '5'))
    password_reset_demo_enabled: bool = os.getenv('PASSWORD_RESET_DEMO_ENABLED', 'true').lower() == 'true'

    # eSMS configuration
    esms_api_key: str = os.getenv('ESMS_API_KEY', '')
    esms_secret_key: str = os.getenv('ESMS_SECRET_KEY', '')
    esms_brandname: str = os.getenv('ESMS_BRANDNAME', 'AgriTrace')

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
