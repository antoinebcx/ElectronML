from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, confusion_matrix
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass
import json
import base64
import logging
import tempfile
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom JSON encoder for NumPy types
class NumpyJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                          np.int16, np.int32, np.int64, np.uint8,
                          np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

# Initialize FastAPI app
app = FastAPI(title="XGBoost Model Training API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request validation
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

class DataPipeline:
    def __init__(self, config: DataPipelineConfig):
        self.config = config
        self.feature_metadata: Dict[str, FeatureMetadata] = {}
        self.categorical_encoders: Dict[str, LabelEncoder] = {}
        self.numeric_scaler: Optional[Union[StandardScaler, MinMaxScaler]] = None
        
    def fit(self, df: pd.DataFrame) -> None:
        """Fit the pipeline on training data"""
        try:
            # Validate features
            missing_cols = set(self.config.features) - set(df.columns)
            if missing_cols:
                raise ValueError(f"Missing columns in data: {missing_cols}")
            
            # Handle missing values
            df = self._handle_missing_values(df)
            
            # Process categorical features
            for feature in self.config.categorical_features:
                encoder = LabelEncoder()
                df[feature] = df[feature].astype(str)
                encoder.fit(df[feature])
                self.categorical_encoders[feature] = encoder
                
                self.feature_metadata[feature] = FeatureMetadata(
                    name=feature,
                    dtype='categorical',
                    categorical_mapping=dict(zip(encoder.classes_, encoder.transform(encoder.classes_)))
                )
            
            # Process numeric features
            numeric_data = df[self.config.numeric_features].copy()
            
            if self.config.handle_outliers:
                numeric_data = self._handle_outliers(numeric_data)
            
            # Fit scaler
            if self.config.scaling_method == 'standard':
                self.numeric_scaler = StandardScaler()
            else:
                self.numeric_scaler = MinMaxScaler()
                
            self.numeric_scaler.fit(numeric_data)
            
            # Store numeric feature metadata
            scaling_params = {
                'mean': self.numeric_scaler.mean_.tolist(),
                'scale': self.numeric_scaler.scale_.tolist()
            } if isinstance(self.numeric_scaler, StandardScaler) else {
                'min': self.numeric_scaler.min_.tolist(),
                'scale': self.numeric_scaler.scale_.tolist()
            }
            
            for idx, feature in enumerate(self.config.numeric_features):
                self.feature_metadata[feature] = FeatureMetadata(
                    name=feature,
                    dtype='numeric',
                    scaling_params={
                        param: float(values[idx]) 
                        for param, values in scaling_params.items()
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in pipeline fit: {str(e)}")
            raise
    
    def transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
        """Transform data using fitted pipeline"""
        try:
            df = df.copy()
            
            # Handle missing values
            df = self._handle_missing_values(df)
            
            # Transform categorical features
            for feature in self.config.categorical_features:
                encoder = self.categorical_encoders[feature]
                df[feature] = df[feature].astype(str)
                # Handle unseen categories
                df[feature] = df[feature].map(lambda x: x if x in encoder.classes_ else encoder.classes_[0])
                df[feature] = encoder.transform(df[feature])
            
            # Transform numeric features
            numeric_data = df[self.config.numeric_features].copy()
            if self.config.handle_outliers:
                numeric_data = self._handle_outliers(numeric_data)
            numeric_data = self.numeric_scaler.transform(numeric_data)
            
            # Combine features in correct order
            transformed_data = []
            feature_names = []
            for feature in self.config.features:
                if feature in self.config.numeric_features:
                    idx = self.config.numeric_features.index(feature)
                    transformed_data.append(numeric_data[:, idx])
                else:
                    transformed_data.append(df[feature].values)
                feature_names.append(feature)
            
            return np.column_stack(transformed_data), feature_names
            
        except Exception as e:
            logger.error(f"Error in pipeline transform: {str(e)}")
            raise
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        if self.config.handle_missing == 'drop':
            return df.dropna()
        
        for feature in self.config.numeric_features:
            if df[feature].isnull().any():
                if self.config.handle_missing == 'mean':
                    fill_value = df[feature].mean()
                elif self.config.handle_missing == 'median':
                    fill_value = df[feature].median()
                else:  # mode
                    fill_value = df[feature].mode()[0]
                df[feature].fillna(fill_value, inplace=True)
        
        for feature in self.config.categorical_features:
            if df[feature].isnull().any():
                df[feature].fillna(df[feature].mode()[0], inplace=True)
        
        return df
    
    def _handle_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        for feature in df.columns:
            z_scores = np.abs((df[feature] - df[feature].mean()) / df[feature].std())
            mask = z_scores > self.config.outlier_threshold
            if mask.any():
                df.loc[mask, feature] = df[feature].mean()
        return df
    
    def export_metadata(self) -> str:
        """Export pipeline metadata as JSON"""
        metadata = {
            'features': self.config.features,
            'categorical_features': {
                feature: {
                    str(k): int(v)
                    for k, v in self.feature_metadata[feature].categorical_mapping.items()
                }
                for feature in self.config.categorical_features
            },
            'numeric_features': {
                feature: {
                    k: float(v)
                    for k, v in self.feature_metadata[feature].scaling_params.items()
                }
                for feature in self.config.numeric_features
            },
            'scaling_method': self.config.scaling_method
        }
        return json.dumps(metadata, indent=2, cls=NumpyJSONEncoder)

@app.post("/train")
async def train_model(file: UploadFile = File(...), config: str = Form(...)):
    """Train XGBoost model with preprocessing pipeline"""
    try:
        # Parse config
        config_data = json.loads(config)
        config_obj = XGBConfig(**config_data)
        
        # Read data
        df = pd.read_csv(file.file)
        logger.info(f"Loaded data with shape: {df.shape}")
        
        # Validate target column exists
        if config_obj.target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Target column '{config_obj.target_column}' not found in data"
            )
        
        # Setup preprocessing pipeline
        features = [col for col in df.columns if col != config_obj.target_column]
        pipeline_config = DataPipelineConfig(
            features=features,
            categorical_features=df[features].select_dtypes(include=['object']).columns.tolist(),
            numeric_features=df[features].select_dtypes(include=['int64', 'float64']).columns.tolist(),
            scaling_method='standard',
            handle_missing='mean',
            handle_outliers=True
        )
        
        pipeline = DataPipeline(pipeline_config)
        
        # Prepare features and target
        X = df.drop(columns=[config_obj.target_column])
        y = df[config_obj.target_column]
        
        # Fit and transform features
        pipeline.fit(X)
        X_transformed, feature_names = pipeline.transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X_transformed, y, test_size=0.2)
        
        target_mapping = None
        if config_obj.task_type != 'regression':
            # Handle classification target
            if y.dtype == 'object' or config_obj.task_type == 'multiclass_classification':
                le = LabelEncoder()
                y = le.fit_transform(y)
                y_train = le.transform(y_train)
                y_test = le.transform(y_test)
                target_mapping = dict(enumerate(map(str, le.classes_)))
            else:
                target_mapping = {0: 'class_0', 1: 'class_1'}

        # Configure model
        model_params = config_obj.parameters.dict()
        if 'objective' in model_params:
            del model_params['objective']
            
        if config_obj.task_type == 'regression':
            model = xgb.XGBRegressor(**model_params)
        elif config_obj.task_type == 'multiclass_classification':
            n_classes = len(np.unique(y))
            model = xgb.XGBClassifier(
                **model_params,
                objective='multi:softmax',
                num_class=n_classes
            )
        else:  # binary classification
            model = xgb.XGBClassifier(
                **model_params,
                objective='binary:logistic'
            )
        
        # Train model
        model.fit(X_train, y_train)
        
        if config_obj.task_type == 'regression':
            # Get predictions on test set
            y_pred_test = model.predict(X_test)
            
            metrics = {
                'train_rmse': float(np.sqrt(mean_squared_error(y_train, model.predict(X_train)))),
                'test_rmse': float(np.sqrt(mean_squared_error(y_test, y_pred_test))),
                'n_features': int(len(feature_names)),
                'test_predictions': {
                    'actual': y_test.tolist(),
                    'predicted': y_pred_test.tolist()
                }
            }
        else:
            # Add confusion matrix
            y_pred_test = model.predict(X_test)
            conf_matrix = confusion_matrix(y_test, y_pred_test)
            
            metrics = {
                'train_accuracy': float(model.score(X_train, y_train)),
                'test_accuracy': float(model.score(X_test, y_test)),
                'n_classes': int(len(target_mapping) if target_mapping else 2),
                'n_features': int(len(feature_names)),
                'confusion_matrix': conf_matrix.tolist()
            }
        
        # Save model temporarily and encode
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as tmp:
            model.save_model(tmp.name)
            with open(tmp.name, 'rb') as f:
                model_data = base64.b64encode(f.read()).decode('utf-8')
            os.unlink(tmp.name)
        
        # Calculate feature importance
        importance = model.feature_importances_
        importance = (importance - importance.min()) / (importance.max() - importance.min()) \
            if len(importance) > 1 else importance
        importance = [float(x) for x in importance]
        
        # Prepare response data
        response_data = {
            "status": "success",
            "metrics": metrics,
            "feature_importance": importance,
            "feature_names": feature_names,
            "class_mapping": target_mapping,
            "artifacts": {
                "model": {
                    "data": model_data,
                    "format": "json"
                },
                "preprocessing_metadata": pipeline.export_metadata()
            }
        }

        return JSONResponse(content=json.loads(json.dumps(response_data, cls=NumpyJSONEncoder)))
        
    except Exception as e:
        logger.error(f"Error in train_model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)