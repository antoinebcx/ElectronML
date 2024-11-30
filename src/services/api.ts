import axios from 'axios';

export type TaskType = 'binary_classification' | 'multiclass_classification' | 'regression';

export interface XGBoostConfig {
  target_column: string;
  task_type: TaskType;
  parameters: {
    max_depth: number;
    learning_rate: number;
    n_estimators: number;
    objective?: string;  // Optional - can be derived from task_type
  };
}

export interface TrainingResult {
  status: string;
  metrics: {
    train_accuracy?: number;    // for classification
    test_accuracy?: number;     // for classification
    train_rmse?: number;       // for regression
    test_rmse?: number;        // for regression
    n_classes?: number;        // for classification
    n_features: number;
  };
  feature_importance: number[];
  feature_names: string[];
  artifacts: {
    model: {
      data: string; // base64 encoded
      format: string;
    };
    typescript_code: string;
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