import numpy as np
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, confusion_matrix
from typing import Dict, Any, Tuple, Optional
import tempfile
import os
import logging

from models.schemas import XGBConfig
from utils.encoders import encode_model_data

logger = logging.getLogger(__name__)

class ModelTrainer:
    def __init__(self, config: XGBConfig):
        self.config = config
        self.model = None
        self.target_encoder = None

    def _init_model(self, n_classes: Optional[int] = None) -> None:
        """Initialize XGBoost model based on task type"""
        model_params = self.config.parameters.dict()
        if 'objective' in model_params:
            del model_params['objective']
            
        if self.config.task_type == 'regression':
            self.model = xgb.XGBRegressor(**model_params)
        elif self.config.task_type == 'multiclass_classification':
            self.model = xgb.XGBClassifier(
                **model_params,
                objective='multi:softmax',
                num_class=n_classes
            )
        else:  # binary classification
            self.model = xgb.XGBClassifier(
                **model_params,
                objective='binary:logistic'
            )
    
    def preprocess_target(self, y: np.ndarray) -> Tuple[np.ndarray, Optional[Dict[int, str]]]:
        """Preprocess target variable and return mapping if applicable"""
        target_mapping = None
        
        if self.config.task_type != 'regression':
            if y.dtype == 'object' or self.config.task_type == 'multiclass_classification':
                self.target_encoder = LabelEncoder()
                y = self.target_encoder.fit_transform(y)
                target_mapping = dict(enumerate(map(str, self.target_encoder.classes_)))
            else:
                target_mapping = {0: 'class_0', 1: 'class_1'}
                
        return y, target_mapping

    def _calculate_regression_metrics(self, y_train: np.ndarray, y_test: np.ndarray,
                                   y_pred_train: np.ndarray, y_pred_test: np.ndarray,
                                   n_features: int) -> Dict[str, Any]:
        """Calculate metrics for regression tasks"""
        return {
            'train_rmse': float(np.sqrt(mean_squared_error(y_train, y_pred_train))),
            'test_rmse': float(np.sqrt(mean_squared_error(y_test, y_pred_test))),
            'n_features': int(n_features),
            'test_predictions': {
                'actual': y_test.tolist(),
                'predicted': y_pred_test.tolist()
            }
        }

    def _calculate_classification_metrics(self, X_train: np.ndarray, X_test: np.ndarray,
                                       y_train: np.ndarray, y_test: np.ndarray,
                                       y_pred_test: np.ndarray, n_features: int,
                                       target_mapping: Dict[int, str]) -> Dict[str, Any]:
        """Calculate metrics for classification tasks"""
        conf_matrix = confusion_matrix(y_test, y_pred_test)
        
        return {
            'train_accuracy': float(self.model.score(X_train, y_train)),
            'test_accuracy': float(self.model.score(X_test, y_test)),
            'n_classes': int(len(target_mapping) if target_mapping else 2),
            'n_features': int(n_features),
            'confusion_matrix': conf_matrix.tolist()
        }
    
    def train(self, X_train: np.ndarray, X_test: np.ndarray, 
             y_train: np.ndarray, y_test: np.ndarray, 
             feature_names: list) -> Dict[str, Any]:
        """Train model and return metrics and artifacts"""
        try:
            # Preprocess target if needed
            y_train_processed, target_mapping = self.preprocess_target(y_train)
            if self.target_encoder is not None:
                y_test = self.target_encoder.transform(y_test)
            
            # Initialize and train model
            n_classes = len(np.unique(y_train_processed)) if self.config.task_type != 'regression' else None
            self._init_model(n_classes)
            self.model.fit(X_train, y_train_processed)
            
            # Calculate predictions and metrics
            if self.config.task_type == 'regression':
                y_pred_train = self.model.predict(X_train)
                y_pred_test = self.model.predict(X_test)
                metrics = self._calculate_regression_metrics(
                    y_train, y_test, y_pred_train, y_pred_test, len(feature_names)
                )
            else:
                y_pred_test = self.model.predict(X_test)
                metrics = self._calculate_classification_metrics(
                    X_train, X_test, y_train_processed, y_test, y_pred_test, 
                    len(feature_names), target_mapping
                )
            
            # Calculate feature importance
            importance = self.model.feature_importances_
            importance = (importance - importance.min()) / (importance.max() - importance.min()) \
                if len(importance) > 1 else importance
            importance = [float(x) for x in importance]
            
            # Save and encode model
            model_data = self._save_model()
            
            return {
                "status": "success",
                "metrics": metrics,
                "feature_importance": importance,
                "feature_names": feature_names,
                "class_mapping": target_mapping,
                "artifacts": {
                    "model": {
                        "data": model_data,
                        "format": "json"
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Error in model training: {str(e)}")
            raise
    
    def _save_model(self) -> str:
        """Save model to temporary file and return encoded data"""
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as tmp:
            self.model.save_model(tmp.name)
            with open(tmp.name, 'rb') as f:
                model_data = encode_model_data(f.read())
            os.unlink(tmp.name)
        return model_data