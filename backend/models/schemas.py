from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from dataclasses import dataclass

class XGBParameters(BaseModel):
    max_depth: int = Field(default=3, ge=1, le=10)
    learning_rate: float = Field(default=0.1, gt=0, le=1)
    n_estimators: int = Field(default=100, ge=1, le=1000)
    objective: Optional[str] = None

class XGBConfig(BaseModel):
    target_column: str
    task_type: str = Field(..., regex='^(binary_classification|multiclass_classification|regression)$')
    parameters: XGBParameters = XGBParameters()

@dataclass
class FeatureMetadata:
    name: str
    dtype: str  # 'numeric' or 'categorical'
    categorical_mapping: Optional[Dict[str, int]] = None
    scaling_params: Optional[Dict[str, float]] = None  # mean/std or min/max

@dataclass
class DataPipelineConfig:
    features: List[str]
    categorical_features: List[str]
    numeric_features: List[str]
    scaling_method: str = 'standard'  # 'standard' or 'minmax'
    handle_missing: str = 'mean'  # 'mean', 'median', 'mode', or 'drop'
    handle_outliers: bool = True
    outlier_threshold: float = 3.0  # for z-score method