from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AvaliacaoGestorCreate(BaseModel):
    """Dados para registrar a avaliação formal do gestor."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    talento_id: UUID
    semana_numero: int = Field(ge=1)
    gestor_nome: Optional[str] = None
    hard_skills: dict[str, int] = Field(default_factory=dict)
    soft_skills: dict[str, int] = Field(default_factory=dict)
    feedback_performance: Optional[str] = None
    alinhamento_cultural: Optional[str] = None
    pontos_desenvolvimento: Optional[str] = None
    pontos_fortes: Optional[str] = None

    def validar_notas(self) -> None:
        for grupo, skills in (("hard_skills", self.hard_skills), ("soft_skills", self.soft_skills)):
            for nome, nota in skills.items():
                if not isinstance(nota, int) or nota < 0 or nota > 5:
                    raise ValueError(
                        f"{grupo}.{nome}: nota deve ser inteira entre 0 e 5"
                    )
