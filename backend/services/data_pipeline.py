import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from typing import Dict, List, Optional, Union, Tuple
import logging
import json

from models.schemas import DataPipelineConfig, FeatureMetadata
from utils.encoders import NumpyJSONEncoder

logger = logging.getLogger(__name__)

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