// Shared types for the NodeJS Analyzer

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Recommendation {
  category: string;
  priority: RecommendationPriority;
  message: string;
}

export interface DependenciesResult {
  score: number;
  outdated: Array<{
    name: string;
    current: string;
    wanted: string;
    latest: string;
    severity: string;
  }>;
  unused: string[];
  circularDependencies: Array<{ cycle: string[] }>;
  duplicates: unknown[];
  recommendations: Recommendation[];
}

export interface Vulnerabilities {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  total: number;
}

export interface SecurityResult {
  score: number;
  vulnerabilities: Vulnerabilities;
  secretsFound: Array<{ file: string; type: string; count: number }>;
  insecurePatterns: Array<{
    file: string;
    pattern: string;
    severity: string;
    occurrences: number;
  }>;
  recommendations: Recommendation[];
}

export interface QualityResult {
  score: number;
  complexity: {
    average: number | string;
    total?: number;
    filesAnalyzed?: number;
    highComplexityFiles: Array<{ file: string; complexity: number }>;
  };
  codeSmells: Array<{
    file: string;
    issue: string;
    severity: string;
    details: string;
  }>;
  testCoverage: {
    status?: string;
    testFiles?: number;
    sourceFiles?: number;
    estimatedCoverage?: string;
    error?: string;
  } | null;
  lintIssues: number;
  duplicateCode: unknown[];
  recommendations: Recommendation[];
}

export interface PerformanceResult {
  score: number;
  bundleSize: {
    total: string;
    totalBytes?: number;
    files?: number;
    largeFiles: Array<{ file: string; size: string }>;
  };
  dependencies: {
    total: number;
    devDependencies?: number;
    productionDependencies?: number;
    heavyDependencies?: string[];
  };
  asyncPatterns: {
    asyncFunctions: number;
    promiseChains: number;
    callbackPatterns: number;
    unhandledPromises: number;
  };
  memoryLeakRisks: Array<{
    file: string;
    pattern: string;
    severity: string;
    occurrences: number;
  }>;
  recommendations: Recommendation[];
}

export type ScalingUrgency = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface ScalingResult {
  score: number;
  scalingNeeded: boolean;
  urgency: ScalingUrgency;
  currentCapacity: Record<string, unknown>;
  projectedLoad?: {
    currentCapacity?: number;
    scalingTriggers?: Record<string, { threshold: string; action: string }>;
    growthScenarios?: Record<string, { expectedRPS: number; action: string }>;
  };
  bottlenecks: Array<{
    type: string;
    severity: string;
    issue: string;
    impact?: string;
    currentState?: string;
    recommendation?: string;
  }>;
  scalingPlan?: {
    immediate: Array<{ action: string; reason: string; category: string; effort?: string; impact?: string }>;
    shortTerm: Array<{ action: string; reason: string; category: string; cost?: string }>;
    longTerm: Array<{ action: string; reason: string; category: string; cost?: string }>;
  };
  scalingRecommendations?: unknown[];
  estimatedCosts?: Record<string, { total: string; development?: string; infrastructure?: string }>;
  recommendations: Recommendation[];
}

export interface AnalysisResults {
  projectPath: string;
  timestamp: string;
  performance: PerformanceResult | null;
  security: SecurityResult | null;
  quality: QualityResult | null;
  dependencies: DependenciesResult | null;
  scaling: ScalingResult | null;
  overallScore: number;
  recommendations: Recommendation[];
}

export interface AnalyzerOptions {
  output?: string;
  performance?: boolean;
  security?: boolean;
  quality?: boolean;
  scaling?: boolean;
  threshold?: string;
}
