import { SecurityAnalyzer } from '../analyzers/security-analyzer';

describe('SecurityAnalyzer', () => {
  describe('constructor', () => {
    it('initializes with clean defaults', () => {
      const analyzer = new SecurityAnalyzer('/fake');
      expect(analyzer.results.score).toBe(100);
      expect(analyzer.results.vulnerabilities.total).toBe(0);
      expect(analyzer.results.secretsFound).toEqual([]);
      expect(analyzer.results.insecurePatterns).toEqual([]);
    });
  });

  describe('calculateScore', () => {
    let analyzer: SecurityAnalyzer;

    beforeEach(() => {
      analyzer = new SecurityAnalyzer('/fake');
    });

    it('returns 100 with no issues', () => {
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(100);
    });

    it('deducts 15 per critical vulnerability', () => {
      analyzer.results.vulnerabilities = { critical: 2, high: 0, moderate: 0, low: 0, total: 2 };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(70);
    });

    it('deducts 10 per high vulnerability', () => {
      analyzer.results.vulnerabilities = { critical: 0, high: 3, moderate: 0, low: 0, total: 3 };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(70);
    });

    it('deducts 5 per moderate vulnerability', () => {
      analyzer.results.vulnerabilities = { critical: 0, high: 0, moderate: 4, low: 0, total: 4 };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(80);
    });

    it('deducts 2 per low vulnerability', () => {
      analyzer.results.vulnerabilities = { critical: 0, high: 0, moderate: 0, low: 5, total: 5 };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(90);
    });

    it('deducts 10 per secret found', () => {
      analyzer.results.secretsFound = [
        { file: 'a.ts', type: 'API Key', count: 1 },
        { file: 'b.ts', type: 'Password', count: 1 },
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(80);
    });

    it('deducts 8 for high severity insecure pattern', () => {
      analyzer.results.insecurePatterns = [
        { file: 'a.ts', pattern: 'eval()', severity: 'high', occurrences: 1 },
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(92);
    });

    it('deducts 5 for medium severity insecure pattern', () => {
      analyzer.results.insecurePatterns = [
        { file: 'a.ts', pattern: 'exec', severity: 'medium', occurrences: 1 },
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(95);
    });

    it('deducts 2 for low severity insecure pattern', () => {
      analyzer.results.insecurePatterns = [
        { file: 'a.ts', pattern: 'Math.random()', severity: 'low', occurrences: 1 },
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(98);
    });

    it('combines all deductions', () => {
      analyzer.results.vulnerabilities = { critical: 1, high: 1, moderate: 0, low: 0, total: 2 };
      analyzer.results.secretsFound = [{ file: 'a.ts', type: 'API Key', count: 1 }];
      analyzer.results.insecurePatterns = [
        { file: 'a.ts', pattern: 'eval()', severity: 'high', occurrences: 1 },
      ];
      // 100 - 15 - 10 - 10 - 8 = 57
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(57);
    });

    it('floors at 0', () => {
      analyzer.results.vulnerabilities = { critical: 5, high: 5, moderate: 5, low: 5, total: 20 };
      analyzer.results.secretsFound = Array(5).fill({ file: 'a', type: 'key', count: 1 });
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(0);
    });
  });
});
