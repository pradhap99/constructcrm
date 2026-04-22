"""
Base schema for all ORM response models.
Automatically coerces UUID → str before Pydantic validates fields,
so every Response schema can safely declare `id: str` (and other FK fields)
without getting ResponseValidationError when SQLAlchemy returns UUID objects.
"""
from __future__ import annotations
import uuid as _uuid
from typing import Any
from pydantic import BaseModel, ConfigDict, model_validator


class ResponseBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def _coerce_uuids(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: str(v) if isinstance(v, _uuid.UUID) else v for k, v in data.items()}
        if hasattr(data, '__dict__'):
            return {
                k: str(v) if isinstance(v, _uuid.UUID) else v
                for k, v in vars(data).items()
                if not k.startswith('_')
            }
        return data
