from __future__ import annotations

from app.exceptions.base import AppError


class BusinessError(AppError):
    status_code = 400
    code = "business_error"


class ValidationError(BusinessError):
    code = "validation_error"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class AccessDeniedError(AppError):
    status_code = 403
    code = "access_denied"


class TalentoNotFoundError(NotFoundError):
    code = "talento_not_found"


class TurmaAccessDeniedError(AccessDeniedError):
    code = "turma_access_denied"


class TalentoTurmaMismatchError(AccessDeniedError):
    code = "talento_turma_mismatch"


class CompetenciaInvalidaError(ValidationError):
    code = "competencia_invalida"
