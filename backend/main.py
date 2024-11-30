from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from pydantic import BaseModel
from typing import Dict, Any, List
import json
import base64
from templates import TYPESCRIPT_TEMPLATE

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class XGBConfig(BaseModel):
    target_column: str
    parameters: Dict[str, Any] = {
        "max_depth": 3,
        "learning_rate": 0.1,
        "n_estimators": 100
    }

def generate_typescript_code(feature_names: List[str], 
                           categorical_features: Dict[str, Dict[str, int]], 
                           class_mapping: Dict[int, str] = None) -> str:
    return TYPESCRIPT_TEMPLATE.replace(
        "{{CATEGORICAL_FEATURES}}", 
        json.dumps(categorical_features, indent=2)
    ).replace(
        "{{FEATURE_NAMES}}", 
        json.dumps(feature_names, indent=2)
    ).replace(
        "{{CLASS_MAPPING}}", 
        json.dumps(class_mapping, indent=2) if class_mapping else 'undefined'
    )

@app.post("/train")
async def train_model(file: UploadFile = File(...), config: str = Form(...)):
    try:
        # Parse config
        config_data = json.loads(config)
        config_obj = XGBConfig(**config_data)
        
        # Read data
        df = pd.read_csv(file.file)
        
        # Validate target column exists
        if config_obj.target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Target column '{config_obj.target_column}' not found in data"
            )
        
        # Handle categorical features
        X = df.drop(columns=[config_obj.target_column])
        y = df[config_obj.target_column]
        
        # Track categorical mappings
        categorical_mappings = {}
        categorical_columns = X.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            categorical_mappings[col] = dict(zip(le.classes_, le.transform(le.classes_)))
        
        # Convert target to numeric if needed
        target_mapping = None
        if y.dtype == 'object':
            le = LabelEncoder()
            y = le.fit_transform(y)
            target_mapping = dict(zip(range(len(le.classes_)), le.classes_))
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        # Determine if binary or multiclass
        n_classes = len(np.unique(y))
        if n_classes == 2:
            model = xgb.XGBClassifier(**config_obj.parameters)
        else:
            model = xgb.XGBClassifier(
                **config_obj.parameters,
                objective='multi:softmax',
                num_class=n_classes
            )
        
        # Train model
        model.fit(X_train, y_train)
        
        # Get metrics
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        
        # Save and encode model
        model_path = "model.json"
        model.save_model(model_path)
        with open(model_path, 'rb') as f:
            model_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Generate TypeScript code
        ts_code = generate_typescript_code(
            feature_names=X.columns.tolist(),
            categorical_features=categorical_mappings,
            class_mapping=target_mapping
        )
        
        # Get feature importance with proper scaling
        importance = model.feature_importances_
        importance = (importance - importance.min()) / (importance.max() - importance.min())
        
        return JSONResponse({
            "status": "success",
            "metrics": {
                "train_accuracy": float(train_score),
                "test_accuracy": float(test_score),
                "n_classes": int(n_classes),
                "n_features": len(X.columns)
            },
            "feature_importance": importance.tolist(),
            "feature_names": X.columns.tolist(),
            "artifacts": {
                "model": {
                    "data": model_data,
                    "format": "json"
                },
                "typescript_code": ts_code
            }
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))