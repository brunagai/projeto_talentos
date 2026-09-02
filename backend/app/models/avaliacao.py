from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AvaliacaoSemanalCreate(BaseModel):
    """Dados recebidos no formulário de avaliação semanal."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    talento_id: UUID
    semana_numero: int
    horas_dedicadas: float

    autoavaliacao_tecnica: int = Field(ge=0, le=5)
    autoavaliacao_socioemocional: int = Field(ge=0, le=5)

    feedback_case: Optional[str] = None
    interdependencias: Optional[str] = None
    ajustes_rota: Optional[str] = None
    rituais_mentoria: Optional[str] = None
