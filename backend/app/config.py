from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./sushi_cafe.db"
    jwt_secret: str = "change-me-in-production"
    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    admin_username: str = "admin"
    admin_password: str = "admin"
    app_env: str = "development"
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:admin@example.com"
    r2_endpoint_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_public_base_url: str = ""

    model_config = SettingsConfigDict(env_file="backend/.env", extra="ignore")

    @property
    def r2_configured(self) -> bool:
        return all((
            self.r2_endpoint_url,
            self.r2_access_key_id,
            self.r2_secret_access_key,
            self.r2_bucket,
            self.r2_public_base_url,
        ))


settings = Settings()
