import axios from 'axios';

export type TaskType = 'binary_classification' | 'multiclass_classification' | 'regression';

export interface XGBoostConfig {
  target_column: string;
  task_type: TaskType;
  parameters: {
    max_depth: number;
    learning_rate: number;
    n_estimators: number;
  };
}

export interface TrainingResult {
  status: string;
  metrics: {
    train_accuracy?: number;
    test_accuracy?: number;
    train_rmse?: number;
    test_rmse?: number;
    n_classes?: number;
    n_features: number;
    confusion_matrix?: number[][];
    auc_score?: number;
    test_predictions?: {
      actual: number[];
      predicted: number[];
    };
  };
  feature_importance: number[];
  feature_names: string[];
  class_mapping?: Record<number, string>;
  artifacts: {
    model: {
      data: string; // base64 encoded
      format: string;
    };
    typescript_code: string;
    preprocessing_metadata: string;
  };
}

const API_BASE_URL = 'http://localhost:8000';

export const mlApi = {
  async trainModel(data: FormData, config: XGBoostConfig): Promise<TrainingResult> {
    data.append('config', JSON.stringify(config));
    const response = await axios.post(`${API_BASE_URL}/train`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }
};