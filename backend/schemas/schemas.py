from pydantic import BaseModel
from typing import Dict, Any, List, Literal

class PipelineStep(BaseModel):
    id: str
    type: Literal['preprocessing', 'feature_engineering', 'training']
    config: Dict[str, Any]

class ModelConfig(BaseModel):
    id: str | None
    name: str
    type: Literal['reranker', 'classifier', 'regression']
    parameters: Dict[str, Any]
    pipeline: List[PipelineStep]