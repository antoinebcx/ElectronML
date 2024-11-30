import axios from 'axios';

export interface XGBoostConfig {
  target_column: string;
  parameters: {
    max_depth: number;
    learning_rate: number;
    n_estimators: number;
  };
}

export interface TrainingResult {
  status: string;
  metrics: {
    train_accuracy: number;
    test_accuracy: number;
  };
  feature_importance: number[];
  feature_names: string[];
}

const API_BASE_URL = 'http://localhost:8000';

export const mlApi = {
  async trainModel(data: FormData, config: XGBoostConfig): Promise<TrainingResult> {
    // Append config to FormData
    data.append('config', JSON.stringify(config));
    
    const response = await axios.post(`${API_BASE_URL}/train`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }
};