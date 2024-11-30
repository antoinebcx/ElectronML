export interface XGBoostConfig {
    target_column: string;
    parameters: {
      max_depth: number;
      learning_rate: number;
      n_estimators: number;
      objective: 'binary:logistic' | 'multi:softmax';
    };
  }
  
  export interface TrainingResult {
    status: 'success' | 'error';
    metrics: {
      train_accuracy: number;
      test_accuracy: number;
    };
    feature_importance: number[];
    feature_names: string[];
  }
  
  export interface TrainingStatus {
    isTraining: boolean;
    error?: string;
    result?: TrainingResult;
  }