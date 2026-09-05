from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://goaltracker:goaltracker@localhost:5432/goaltracker"

    @field_validator("database_url")
    @classmethod
    def _use_psycopg3_driver(cls, v: str) -> str:
        """This app only ever installs the psycopg (v3) driver — never psycopg2,
        which is an entirely different, unrelated package. Force the URL's scheme
        to postgresql+psycopg:// no matter what comes after "postgresql" (nothing,
        "+psycopg2", a typo like "+psycpg2", anything else), so a connection
        string copied from a provider's dashboard — or mistyped by hand — can
        never accidentally select a driver that isn't actually installed."""
        if v.startswith("postgresql"):
            _, _, rest = v.partition("://")
            if rest:
                return f"postgresql+psycopg://{rest}"
        return v

    jwt_secret_key: str = "insecure-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()