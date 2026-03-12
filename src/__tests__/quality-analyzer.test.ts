import { QualityAnalyzer } from '../analyzers/quality-analyzer';

describe('QualityAnalyzer', () => {
  describe('estimateComplexity', () => {
    let analyzer: QualityAnalyzer;

    beforeEach(() => {
      analyzer = new QualityAnalyzer('/fake/path');
    });

    it('returns 1 for an empty function', () => {
      expect(analyzer.estimateComplexity('function hello() {}')).toBe(1);
    });

    it('increments for if statements', () => {
      const code = 'if (a) { } if (b) { }';
      expect(analyzer.estimateComplexity(code)).toBe(3);
    });

    it('increments for else if (counted by both if and else-if patterns)', () => {
      const code = 'if (a) {} else if (b) {}';
      // 1 base + 2 if matches + 1 else if match
      expect(analyzer.estimateComplexity(code)).toBe(4);
    });

    it('increments for loops', () => {
      const code = 'for (let i = 0; i < 10; i++) { while (true) {} }';
      expect(analyzer.estimateComplexity(code)).toBe(3);
    });

    it('increments for logical operators', () => {
      const code = 'if (a && b || c) {}';
      // 1 base + 1 if + 1 && + 1 ||
      expect(analyzer.estimateComplexity(code)).toBe(4);
    });

    it('increments for ternary operator', () => {
      const code = 'const x = a ? b : c;';
      // 1 base + 1 ?
      expect(analyzer.estimateComplexity(code)).toBe(2);
    });

    it('increments for catch blocks', () => {
      const code = 'try {} catch (e) {}';
      expect(analyzer.estimateComplexity(code)).toBe(2);
    });

    it('increments for switch cases', () => {
      const code = 'switch(x) { case 1: break; case 2: break; case 3: break; }';
      expect(analyzer.estimateComplexity(code)).toBe(4);
    });

    it('handles complex real-world code', () => {
      const code = `
        function processData(data) {
          if (data.type === 'A') {
            if (data.sub === 'A1') {
              for (let i = 0; i < data.length; i++) {
                if (data[i] > 10 && data[i] < 100) {
                  return true;
                }
              }
            } else if (data.sub === 'A2') {
              while (data.hasMore()) {
                if (data.next() || data.peek()) {
                  process(data);
                }
              }
            }
          }
        }
      `;
      const complexity = analyzer.estimateComplexity(code);
      expect(complexity).toBeGreaterThan(10);
    });
  });

  describe('calculateScore', () => {
    let analyzer: QualityAnalyzer;

    beforeEach(() => {
      analyzer = new QualityAnalyzer('/fake/path');
    });

    it('returns 100 for a clean project', () => {
      analyzer.results.complexity = {
        average: 3,
        total: 3,
        filesAnalyzed: 1,
        highComplexityFiles: []
      };
      analyzer.results.testCoverage = {
        testFiles: 5,
        sourceFiles: 5,
        estimatedCoverage: '100%'
      };
      analyzer.results.lintIssues = 0;
      analyzer.results.codeSmells = [];

      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(100);
    });

    it('deducts 5 for average complexity > 7', () => {
      analyzer.results.complexity = {
        average: 8,
        total: 8,
        filesAnalyzed: 1,
        highComplexityFiles: []
      };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(95);
    });

    it('deducts 10 for average complexity > 10', () => {
      analyzer.results.complexity = {
        average: 12,
        total: 12,
        filesAnalyzed: 1,
        highComplexityFiles: []
      };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(90);
    });

    it('deducts 15 for average complexity > 15', () => {
      analyzer.results.complexity = {
        average: 20,
        total: 20,
        filesAnalyzed: 1,
        highComplexityFiles: []
      };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(85);
    });

    it('deducts 20 for zero test files', () => {
      analyzer.results.testCoverage = { testFiles: 0, sourceFiles: 5 };
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(80);
    });

    it('deducts for lint issues at various thresholds', () => {
      analyzer.results.lintIssues = 5;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(95);

      analyzer.results.lintIssues = 25;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(90);

      analyzer.results.lintIssues = 60;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(85);

      analyzer.results.lintIssues = 150;
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(80);
    });

    it('deducts 2 per code smell', () => {
      analyzer.results.codeSmells = [
        {
          file: 'a.ts',
          issue: 'Large file',
          severity: 'medium',
          details: '600 lines'
        },
        {
          file: 'b.ts',
          issue: 'Debug',
          severity: 'low',
          details: '10 console.log'
        }
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(96);
    });

    it('combines multiple deductions', () => {
      analyzer.results.complexity = {
        average: 20,
        total: 20,
        filesAnalyzed: 1,
        highComplexityFiles: []
      };
      analyzer.results.testCoverage = { testFiles: 0, sourceFiles: 5 };
      analyzer.results.lintIssues = 60;
      analyzer.results.codeSmells = [
        {
          file: 'a.ts',
          issue: 'Large file',
          severity: 'medium',
          details: '600 lines'
        }
      ];
      // 100 - 15 (complexity) - 20 (no tests) - 15 (lint) - 2 (smell) = 48
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(48);
    });

    it('floors at 0', () => {
      analyzer.results.complexity = {
        average: 20,
        total: 20,
        filesAnalyzed: 1,
        highComplexityFiles: []
      };
      analyzer.results.testCoverage = { testFiles: 0, sourceFiles: 5 };
      analyzer.results.lintIssues = 200;
      analyzer.results.codeSmells = Array(30).fill({
        file: 'a.ts',
        issue: 'smell',
        severity: 'low',
        details: ''
      });
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(0);
    });
  });
});
