TYPESCRIPT_TEMPLATE = '''
// Auto-generated inference code
export interface PredictionInput {
  [feature: string]: number | string;
}

export interface PredictionOutput {
  prediction: number | string;
  probability: number[];
}

interface PreprocessingConfig {
  categoricalFeatures: {
    [column: string]: { [value: string]: number }
  };
  featureNames: string[];
  classMapping?: { [key: number]: string };
}

const config: PreprocessingConfig = {
  categoricalFeatures: {{CATEGORICAL_FEATURES}},
  featureNames: {{FEATURE_NAMES}},
  classMapping: {{CLASS_MAPPING}}
};

export class XGBoostPredictor {
  private model: any;

  constructor(modelJson: any) {
    this.model = modelJson;
  }

  private preprocess(input: PredictionInput): number[] {
    // Ensure all features are present
    const features = config.featureNames.map(feat => {
      if (!(feat in input)) {
        throw new Error(`Missing feature: ${feat}`);
      }
      const value = input[feat];
      
      // Handle categorical features
      if (feat in config.categoricalFeatures) {
        const mapping = config.categoricalFeatures[feat];
        if (typeof value !== "string") {
          throw new Error(`Feature ${feat} expects a string value`);
        }
        if (!(value in mapping)) {
          throw new Error(`Unknown category ${value} for feature ${feat}`);
        }
        return mapping[value];
      }
      
      // Handle numerical features
      if (typeof value !== "number") {
        throw new Error(`Feature ${feat} expects a number value`);
      }
      return value;
    });

    return features;
  }

  public predict(input: PredictionInput): PredictionOutput {
    const features = this.preprocess(input);
    const prediction = this.model.predict(features);
    
    if (config.classMapping) {
      return {
        prediction: config.classMapping[prediction],
        probability: this.model.predict_proba(features)
      };
    }
    
    return {
      prediction,
      probability: this.model.predict_proba(features)
    };
  }
}
'''