from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação carregadas a partir de variáveis de ambiente."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str = Field(min_length=1)
    SUPABASE_URL: AnyHttpUrl
    SUPABASE_KEY: str = Field(min_length=1)
    SECRET_KEY: str = Field(min_length=1)

    @field_validator("DATABASE_URL", "SUPABASE_KEY", "SECRET_KEY", mode="before")
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


settings = Settings()
