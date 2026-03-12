import { PerformanceAnalyzer } from '../analyzers/performance-analyzer';

describe('PerformanceAnalyzer', () => {
  describe('constructor', () => {
    it('initializes with clean defaults', () => {
      const analyzer = new PerformanceAnalyzer('/fake');
      expect(analyzer.results.score).toBe(100);
      expect(analyzer.results.bundleSize.total).toBe('0 KB');
      expect(analyzer.results.memoryLeakRisks).toEqual([]);
      expect(analyzer.results.asyncPatterns.unhandledPromises).toBe(0);
    });
  });

  describe('calculateScore', () => {
    let analyzer: PerformanceAnalyzer;

    beforeEach(() => {
      analyzer = new PerformanceAnalyzer('/fake');
    });

    it('returns 100 with no issues', () => {
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(100);
    });

    it('deducts 5 for bundle > 1MB', () => {
      analyzer.results.bundleSize.totalBytes = 1.5 * 1024 * 1024;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(95);
    });

    it('deducts 10 for bundle > 2MB', () => {
      analyzer.results.bundleSize.totalBytes = 3 * 1024 * 1024;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(90);
    });

    it('deducts 20 for bundle > 5MB', () => {
      analyzer.results.bundleSize.totalBytes = 6 * 1024 * 1024;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(80);
    });

    it('deducts 10 for > 50 dependencies', () => {
      analyzer.results.dependencies.total = 55;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(90);
    });

    it('deducts 15 for > 100 dependencies', () => {
      analyzer.results.dependencies.total = 120;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(85);
    });

    it('deducts 10 per high severity memory leak risk', () => {
      analyzer.results.memoryLeakRisks = [
        { file: 'a.ts', pattern: 'setInterval', severity: 'high', occurrences: 1 },
        { file: 'b.ts', pattern: 'setInterval', severity: 'high', occurrences: 1 },
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(80);
    });

    it('deducts 3 per non-high memory leak risk', () => {
      analyzer.results.memoryLeakRisks = [
        { file: 'a.ts', pattern: 'globals', severity: 'medium', occurrences: 1 },
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(97);
    });

    it('deducts up to 20 for unhandled promises', () => {
      analyzer.results.asyncPatterns.unhandledPromises = 15;
      analyzer.calculateScore();
      // min(15*2, 20) = 20
      expect(analyzer.results.score).toBe(80);
    });

    it('caps unhandled promises deduction at 20', () => {
      analyzer.results.asyncPatterns.unhandledPromises = 50;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(80);
    });

    it('combines deductions and floors at 0', () => {
      analyzer.results.bundleSize.totalBytes = 6 * 1024 * 1024;
      analyzer.results.dependencies.total = 120;
      analyzer.results.memoryLeakRisks = Array(5).fill(
        { file: 'a.ts', pattern: 'interval', severity: 'high', occurrences: 1 }
      );
      analyzer.results.asyncPatterns.unhandledPromises = 20;
      // 100 - 20 (bundle) - 15 (deps) - 50 (5 high leaks) - 20 (promises) = 0 (floored)
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(0);
    });
  });
});
