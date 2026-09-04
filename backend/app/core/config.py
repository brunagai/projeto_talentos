from pydantic import AnyHttpUrl, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação carregadas a partir de variáveis de ambiente."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    SUPABASE_URL: AnyHttpUrl
    # service_role — bypassa RLS. Usar só em admin/seed/login.
    SUPABASE_KEY: str = Field(min_length=1)
    # anon key — request path com RLS (Fase F). Obrigatória em production.
    SUPABASE_ANON_KEY: str | None = None
    SECRET_KEY: str = Field(min_length=1)
    JWT_EXPIRE_MINUTES: int = 60 * 12
    ENVIRONMENT: str = "development"
    COOKIE_SECURE: bool | None = None
    AUTH_COOKIE_NAME: str = "access_token"
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024
    LOGIN_RATE_LIMIT_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 60
    # redis://... — rate limit compartilhado entre workers. Sem valor: memória.
    REDIS_URL: str | None = None
    # Confia em X-Forwarded-For apenas atrás de proxy conhecido.
    TRUST_PROXY: bool = False
    # Lista separada por vírgula. Ex.: http://localhost:3000,https://app.exemplo.com
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator("SUPABASE_KEY", "SECRET_KEY", mode="before")
    @classmethod
    def validate_required_non_empty(cls, value: object) -> str:
        if value is None:
            raise ValueError("variável de ambiente obrigatória não definida")
        if not isinstance(value, str):
            value = str(value)
        stripped = value.strip()
        if not stripped:
            raise ValueError("variável de ambiente não pode estar vazia")
        return stripped

    @field_validator("SUPABASE_URL", mode="before")
    @classmethod
    def validate_supabase_url(cls, value: object) -> str:
        if value is None:
            raise ValueError("SUPABASE_URL é obrigatória")
        if not isinstance(value, str):
            value = str(value)
        stripped = value.strip()
        if not stripped:
            raise ValueError("SUPABASE_URL não pode estar vazia")
        return stripped

    @field_validator("SUPABASE_ANON_KEY", "REDIS_URL", mode="before")
    @classmethod
    def empty_str_to_none(cls, value: object) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            value = str(value)
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def resolve_cookie_secure(self) -> "Settings":
        if self.COOKIE_SECURE is None:
            object.__setattr__(
                self,
                "COOKIE_SECURE",
                self.ENVIRONMENT.lower() in ("production", "prod"),
            )
        return self

    @model_validator(mode="after")
    def warn_missing_anon_key_in_production(self) -> "Settings":
        if self.is_production and not self.SUPABASE_ANON_KEY:
            import logging

            logging.getLogger(__name__).warning(
                "SUPABASE_ANON_KEY ausente em production: request path usa service_role "
                "(sem RLS). Defina ANON_KEY + JWT Secret alinhado para ativar a Fase F."
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [item.strip() for item in self.CORS_ORIGINS.split(",") if item.strip()]
        return origins or ["http://localhost:3000"]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def cookie_secure_enabled(self) -> bool:
        if self.COOKIE_SECURE is None:
            return self.is_production
        return bool(self.COOKIE_SECURE)

    @property
    def rls_request_path_enabled(self) -> bool:
        """Usa anon + JWT do usuário no PostgREST (RLS efetiva)."""
        return bool(self.SUPABASE_ANON_KEY)


settings = Settings()
