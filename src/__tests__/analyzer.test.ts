import { Analyzer } from '../analyzer';
import type { AnalysisResults, Recommendation } from '../types';

jest.mock('../analyzers/dependency-analyzer');
jest.mock('../analyzers/security-analyzer');
jest.mock('../analyzers/quality-analyzer');
jest.mock('../analyzers/performance-analyzer');
jest.mock('../analyzers/scaling-analyzer');

const { DependencyAnalyzer } = jest.requireMock(
  '../analyzers/dependency-analyzer'
);
const { SecurityAnalyzer } = jest.requireMock('../analyzers/security-analyzer');
const { QualityAnalyzer } = jest.requireMock('../analyzers/quality-analyzer');
const { PerformanceAnalyzer } = jest.requireMock(
  '../analyzers/performance-analyzer'
);
const { ScalingAnalyzer } = jest.requireMock('../analyzers/scaling-analyzer');

function mockAnalyzer(MockClass: any, result: Record<string, any>) {
  MockClass.mockImplementation(() => ({
    analyze: jest.fn().mockResolvedValue(result)
  }));
}

const baseDeps = {
  score: 90,
  outdated: [],
  unused: [],
  circularDependencies: [],
  duplicates: [],
  recommendations: []
};
const baseSecurity = {
  score: 80,
  vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
  secretsFound: [],
  insecurePatterns: [],
  recommendations: []
};
const baseQuality = {
  score: 75,
  complexity: { average: 5, highComplexityFiles: [] },
  codeSmells: [],
  testCoverage: null,
  lintIssues: 0,
  duplicateCode: [],
  recommendations: []
};
const basePerf = {
  score: 85,
  bundleSize: { total: '100 KB', largeFiles: [] },
  dependencies: { total: 10 },
  asyncPatterns: {
    asyncFunctions: 5,
    promiseChains: 0,
    callbackPatterns: 0,
    unhandledPromises: 0
  },
  memoryLeakRisks: [],
  recommendations: []
};
const baseScaling = {
  score: 70,
  scalingNeeded: false,
  urgency: 'none' as const,
  currentCapacity: {},
  bottlenecks: [],
  recommendations: []
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalyzer(DependencyAnalyzer, baseDeps);
  mockAnalyzer(SecurityAnalyzer, baseSecurity);
  mockAnalyzer(QualityAnalyzer, baseQuality);
  mockAnalyzer(PerformanceAnalyzer, basePerf);
  mockAnalyzer(ScalingAnalyzer, baseScaling);
});

describe('Analyzer', () => {
  describe('constructor', () => {
    it('initializes with correct defaults', () => {
      const analyzer = new Analyzer('/test/path');
      expect(analyzer.projectPath).toBe('/test/path');
      expect(analyzer.results.overallScore).toBe(0);
      expect(analyzer.results.recommendations).toEqual([]);
      expect(analyzer.results.dependencies).toBeNull();
      expect(analyzer.results.security).toBeNull();
    });
  });

  describe('analyze', () => {
    it('runs all analyzers by default', async () => {
      const analyzer = new Analyzer('/test/path');
      const results = await analyzer.analyze();

      expect(results.dependencies).toEqual(baseDeps);
      expect(results.security).toEqual(baseSecurity);
      expect(results.quality).toEqual(baseQuality);
      expect(results.performance).toEqual(basePerf);
      expect(results.scaling).toEqual(baseScaling);
    });

    it('skips security when option is false', async () => {
      const analyzer = new Analyzer('/test/path', { security: false });
      const results = await analyzer.analyze();

      expect(results.security).toBeNull();
      expect(results.dependencies).toEqual(baseDeps);
    });

    it('skips quality when option is false', async () => {
      const analyzer = new Analyzer('/test/path', { quality: false });
      const results = await analyzer.analyze();

      expect(results.quality).toBeNull();
    });

    it('skips performance when option is false', async () => {
      const analyzer = new Analyzer('/test/path', { performance: false });
      const results = await analyzer.analyze();

      expect(results.performance).toBeNull();
    });

    it('skips scaling when option is false', async () => {
      const analyzer = new Analyzer('/test/path', { scaling: false });
      const results = await analyzer.analyze();

      expect(results.scaling).toBeNull();
    });
  });

  describe('calculateOverallScore', () => {
    it('computes weighted average of all scores', async () => {
      const analyzer = new Analyzer('/test/path');
      await analyzer.analyze();

      // weights: deps=20, security=25, quality=20, perf=20, scaling=15
      // scores:  90,       80,          75,         85,       70
      // weighted = (90*20 + 80*25 + 75*20 + 85*20 + 70*15) / 100 = 80.5 → 81
      expect(analyzer.results.overallScore).toBe(81);
    });

    it('adjusts weights when analyzers are skipped', async () => {
      const analyzer = new Analyzer('/test/path', {
        security: false,
        scaling: false
      });
      await analyzer.analyze();

      // weights: deps=20, quality=20, perf=20 → total=60
      // scores: 90, 75, 85
      // weighted = (90*20 + 75*20 + 85*20) / 60 = 5000/60 = 83.33 → 83
      expect(analyzer.results.overallScore).toBe(83);
    });
  });

  describe('generateRecommendations', () => {
    it('sorts recommendations by priority (critical first)', async () => {
      const lowRec: Recommendation = {
        category: 'deps',
        priority: 'low',
        message: 'low issue'
      };
      const criticalRec: Recommendation = {
        category: 'security',
        priority: 'critical',
        message: 'critical issue'
      };
      const highRec: Recommendation = {
        category: 'quality',
        priority: 'high',
        message: 'high issue'
      };

      mockAnalyzer(DependencyAnalyzer, {
        ...baseDeps,
        recommendations: [lowRec]
      });
      mockAnalyzer(SecurityAnalyzer, {
        ...baseSecurity,
        recommendations: [criticalRec]
      });
      mockAnalyzer(QualityAnalyzer, {
        ...baseQuality,
        recommendations: [highRec]
      });

      const analyzer = new Analyzer('/test/path');
      const results = await analyzer.analyze();

      expect(results.recommendations[0].priority).toBe('critical');
      expect(results.recommendations[1].priority).toBe('high');
      expect(results.recommendations[2].priority).toBe('low');
    });

    it('aggregates recommendations from all analyzers', async () => {
      const rec1: Recommendation = {
        category: 'deps',
        priority: 'medium',
        message: 'msg1'
      };
      const rec2: Recommendation = {
        category: 'perf',
        priority: 'medium',
        message: 'msg2'
      };

      mockAnalyzer(DependencyAnalyzer, {
        ...baseDeps,
        recommendations: [rec1]
      });
      mockAnalyzer(PerformanceAnalyzer, {
        ...basePerf,
        recommendations: [rec2]
      });

      const analyzer = new Analyzer('/test/path');
      const results = await analyzer.analyze();

      expect(results.recommendations).toHaveLength(2);
      expect(results.recommendations.map((r) => r.message)).toContain('msg1');
      expect(results.recommendations.map((r) => r.message)).toContain('msg2');
    });

    it('returns empty recommendations when no issues found', async () => {
      const analyzer = new Analyzer('/test/path');
      const results = await analyzer.analyze();

      expect(results.recommendations).toEqual([]);
    });
  });
});
