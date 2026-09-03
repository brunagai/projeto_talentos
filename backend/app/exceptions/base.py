from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Exceção base da aplicação com mapeamento HTTP explícito."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
        }
        if self.details:
            body["details"] = self.details
        return body
