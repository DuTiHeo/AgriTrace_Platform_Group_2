from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://agritrace:agritrace_pass@db:5432/agritrace_farm"

    class Config:
        env_file = ".env"


settings = Settings()
