interface TreeParam {
    num_deleted: string;
    num_feature: string;
    num_nodes: string;
    size_leaf_vector: string;
}
  
interface TreeNode {
    id?: number;
    split_indices: number[];
    split_conditions: number[];
    split_type: number[];
    left_children: number[];
    right_children: number[];
    parents: number[];
    base_weights: number[];
    tree_param: TreeParam;
}
  
interface GradientBooster {
    model: {
      trees: TreeNode[];
      tree_info: number[];
    };
}
  
interface ObjectiveParam {
    name: string;
    softmax_multiclass_param?: {
      num_class: string;
    };
}
  
interface XGBoostModel {
    learner: {
      objective: ObjectiveParam;
      gradient_booster: GradientBooster;
      attributes?: Record<string, string>;
      feature_names?: string[];
    };
}
  
export class XGBoostPredictor {
    private model: XGBoostModel;
    private numClasses: number;
    private numFeatures: number;
    private treeCache: Map<string, number>;
    private baseScore: number;
    private objective: string;
  
    constructor(modelJson: string) {
      try {
        this.model = JSON.parse(modelJson);
        
        if (!this.model?.learner?.objective?.name) {
          throw new Error("Invalid model format: missing objective");
        }
  
        this.objective = this.model.learner.objective.name;
        if (this.objective === 'multi:softmax' || this.objective === 'multi:softprob') {
          this.numClasses = parseInt(this.model.learner.objective.softmax_multiclass_param?.num_class || '2');
        } else {
          this.numClasses = 1;
        }
  
        const firstTree = this.model.learner.gradient_booster.model.trees[0];
        if (!firstTree) {
          throw new Error("Model contains no trees");
        }
        this.numFeatures = parseInt(firstTree.tree_param.num_feature);
  
        this.treeCache = new Map();
        this.baseScore = parseFloat(this.model.learner.attributes?.base_score || '0.5');
  
      } catch (e) {
        throw new Error(`Failed to initialize XGBoost model: ${e.message}`);
      }
    }
  
    private getCacheKey(treeIndex: number, features: number[]): string {
      return `${treeIndex}_${features.join('_')}`;
    }
  
    private traverseTreeWithCache(treeIndex: number, tree: TreeNode, features: number[]): number {
      const cacheKey = this.getCacheKey(treeIndex, features);
      if (this.treeCache.has(cacheKey)) {
        return this.treeCache.get(cacheKey)!;
      }
      
      const result = this.traverseTree(tree, features);
      this.treeCache.set(cacheKey, result);
      return result;
    }
  
    private traverseTree(tree: TreeNode, features: number[]): number {
      let nodeIndex = 0;
      const { left_children, right_children, split_indices, split_conditions } = tree;
      
      while (true) {
        if (left_children[nodeIndex] === -1) {
          return tree.base_weights[nodeIndex];
        }
        
        const featureIndex = split_indices[nodeIndex];
        if (featureIndex >= features.length) {
          throw new Error(`Invalid feature index: ${featureIndex}`);
        }
        
        nodeIndex = features[featureIndex] <= split_conditions[nodeIndex] 
          ? left_children[nodeIndex] 
          : right_children[nodeIndex];
      }
    }
  
    private sigmoid(x: number): number {
      if (x < -40) return 0;
      if (x > 40) return 1;
      return 1 / (1 + Math.exp(-x));
    }
  
    private softmax(scores: number[]): number[] {
      const maxScore = Math.max(...scores);
      const expScores = new Float64Array(scores.length);
      let sumExp = 0;
      
      for (let i = 0; i < scores.length; i++) {
        const exp = scores[i] - maxScore < -40 ? 0 : Math.exp(scores[i] - maxScore);
        expScores[i] = exp;
        sumExp += exp;
      }
      
      if (sumExp === 0) sumExp = 1;
      for (let i = 0; i < expScores.length; i++) {
        expScores[i] /= sumExp;
      }
  
      return Array.from(expScores);
    }
  
    predict(features: number[]): number {
      this.validateFeatures(features);
  
      if (this.numClasses === 1) {
        const probs = this.predict_proba(features);
        return probs[1] >= 0.5 ? 1 : 0;
      } else {
        const margins = this.predictRaw(features);
        return margins.indexOf(Math.max(...margins));
      }
    }
  
    private predictRaw(features: number[]): number[] {
      const trees = this.model.learner.gradient_booster.model.trees;
      const treeInfo = this.model.learner.gradient_booster.model.tree_info;
      
      if (this.numClasses === 1) {
        let sum = this.baseScore;
        for (let i = 0; i < trees.length; i++) {
          sum += this.traverseTreeWithCache(i, trees[i], features);
        }
        return [sum];
      } else {
        const margins = new Array(this.numClasses).fill(0);
        for (let i = 0; i < trees.length; i++) {
          const classIndex = treeInfo[i];
          margins[classIndex] += this.traverseTreeWithCache(i, trees[i], features);
        }
        return margins;
      }
    }
  
    predict_proba(features: number[]): number[] {
      this.validateFeatures(features);
      const margins = this.predictRaw(features);
      
      if (this.numClasses === 1) {
        const probability = this.sigmoid(margins[0]);
        return [1 - probability, probability];
      }
  
      return this.softmax(margins);
    }
  
    private validateFeatures(features: number[]): void {
      if (!Array.isArray(features)) {
        throw new Error("Features must be an array");
      }
      
      if (features.length !== this.numFeatures) {
        throw new Error(`Expected ${this.numFeatures} features, got ${features.length}`);
      }
  
      if (!features.every(f => typeof f === 'number' && !isNaN(f))) {
        throw new Error("All features must be valid numbers");
      }
    }
  
    getFeatureImportances(): number[] {
      const importances = new Array(this.numFeatures).fill(0);
      const trees = this.model.learner.gradient_booster.model.trees;
      
      for (const tree of trees) {
        for (let i = 0; i < tree.split_indices.length; i++) {
          const featureIndex = tree.split_indices[i];
          if (featureIndex >= 0 && featureIndex < this.numFeatures) {
            importances[featureIndex]++;
          }
        }
      }
      
      const sum = importances.reduce((a, b) => a + b, 0);
      return importances.map(v => sum > 0 ? v / sum : 0);
    }
  
    getModelInfo(): Record<string, any> {
      return {
        numClasses: this.numClasses,
        numFeatures: this.numFeatures,
        numTrees: this.model.learner.gradient_booster.model.trees.length,
        objective: this.objective,
        featureNames: this.model.learner.feature_names || [],
        baseScore: this.baseScore
      };
    }
  
    clearCache(): void {
      this.treeCache.clear();
    }
}