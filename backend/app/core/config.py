from pydantic_settings import BaseSettings
from pydantic import Field, SecretStr
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    database_url: str = os.getenv('DATABASE_URL')
    openai_api_key: SecretStr = SecretStr("")
    speech_model: str = "whisper-1"
    speech_timeout_seconds: int = Field(default=60, ge=1, le=90)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
