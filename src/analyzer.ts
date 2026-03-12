import { PerformanceAnalyzer } from './analyzers/performance-analyzer';
import { SecurityAnalyzer } from './analyzers/security-analyzer';
import { QualityAnalyzer } from './analyzers/quality-analyzer';
import { DependencyAnalyzer } from './analyzers/dependency-analyzer';
import { ScalingAnalyzer } from './analyzers/scaling-analyzer';
import type { AnalysisResults, AnalyzerOptions } from './types';

export class Analyzer {
  projectPath: string;
  options: AnalyzerOptions;
  results: AnalysisResults;

  constructor(projectPath: string, options: AnalyzerOptions = {}) {
    this.projectPath = projectPath;
    this.options = options;
    this.results = {
      projectPath,
      timestamp: new Date().toISOString(),
      performance: null,
      security: null,
      quality: null,
      dependencies: null,
      scaling: null,
      overallScore: 0,
      recommendations: [],
    };
  }

  async analyze(): Promise<AnalysisResults> {
    const analyzers: Promise<void>[] = [];

    analyzers.push(this.analyzeDependencies());

    if (this.options.security !== false) {
      analyzers.push(this.analyzeSecurity());
    }

    if (this.options.quality !== false) {
      analyzers.push(this.analyzeQuality());
    }

    if (this.options.performance !== false) {
      analyzers.push(this.analyzePerformance());
    }

    if (this.options.scaling !== false) {
      analyzers.push(this.analyzeScaling());
    }

    await Promise.all(analyzers);

    this.calculateOverallScore();
    this.generateRecommendations();

    return this.results;
  }

  async analyzeDependencies(): Promise<void> {
    const analyzer = new DependencyAnalyzer(this.projectPath);
    this.results.dependencies = await analyzer.analyze();
  }

  async analyzeSecurity(): Promise<void> {
    const analyzer = new SecurityAnalyzer(this.projectPath);
    this.results.security = await analyzer.analyze();
  }

  async analyzeQuality(): Promise<void> {
    const analyzer = new QualityAnalyzer(this.projectPath);
    this.results.quality = await analyzer.analyze();
  }

  async analyzePerformance(): Promise<void> {
    const analyzer = new PerformanceAnalyzer(this.projectPath);
    this.results.performance = await analyzer.analyze();
  }

  async analyzeScaling(): Promise<void> {
    const analyzer = new ScalingAnalyzer(this.projectPath);
    this.results.scaling = await analyzer.analyze();
  }

  calculateOverallScore(): void {
    const scores: number[] = [];
    let weights: number[] = [];

    if (this.results.dependencies) {
      scores.push(this.results.dependencies.score);
      weights.push(20);
    }

    if (this.results.security) {
      scores.push(this.results.security.score);
      weights.push(25);
    }

    if (this.results.quality) {
      scores.push(this.results.quality.score);
      weights.push(20);
    }

    if (this.results.performance) {
      scores.push(this.results.performance.score);
      weights.push(20);
    }

    if (this.results.scaling) {
      scores.push(this.results.scaling.score);
      weights.push(15);
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    weights = weights.map((w) => w / totalWeight);

    this.results.overallScore = Math.round(
      scores.reduce((acc, score, i) => acc + score * weights[i], 0)
    );
  }

  generateRecommendations(): void {
    const recommendations: import('./types').Recommendation[] = [];

    if (this.results.dependencies?.recommendations) {
      recommendations.push(...this.results.dependencies.recommendations);
    }

    if (this.results.security?.recommendations) {
      recommendations.push(...this.results.security.recommendations);
    }

    if (this.results.quality?.recommendations) {
      recommendations.push(...this.results.quality.recommendations);
    }

    if (this.results.performance?.recommendations) {
      recommendations.push(...this.results.performance.recommendations);
    }

    if (this.results.scaling?.recommendations) {
      recommendations.push(...this.results.scaling.recommendations);
    }

    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    this.results.recommendations = recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }
}
