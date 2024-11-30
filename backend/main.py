from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
from sklearn.model_selection import train_test_split
import json
import logging

from models.schemas import XGBConfig, DataPipelineConfig
from services.data_pipeline import DataPipeline
from services.model_trainer import ModelTrainer
from utils.encoders import NumpyJSONEncoder

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        
        # Initialize pipeline and trainer
        pipeline = DataPipeline(pipeline_config)
        trainer = ModelTrainer(config_obj)
        
        # Prepare features and target
        X = df.drop(columns=[config_obj.target_column])
        y = df[config_obj.target_column]
        
        # Process features
        pipeline.fit(X)
        X_transformed, feature_names = pipeline.transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X_transformed, y, test_size=0.2)
        
        # Train model and get results
        results = trainer.train(X_train, X_test, y_train, y_test, feature_names)
        
        # Add preprocessing metadata to results
        results["artifacts"]["preprocessing_metadata"] = pipeline.export_metadata()
        
        # Return results
        return JSONResponse(
            content=json.loads(json.dumps(results, cls=NumpyJSONEncoder))
        )
        
    except Exception as e:
        logger.error(f"Error in train_model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)