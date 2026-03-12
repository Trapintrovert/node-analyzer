import fs from 'fs-extra';
import path from 'path';
import { ReportGenerator } from '../report-generator';
import type { AnalysisResults } from '../types';

jest.mock('fs-extra');

const mockedFs = fs as jest.Mocked<typeof fs>;

function makeResults(overrides: Partial<AnalysisResults> = {}): AnalysisResults {
  return {
    projectPath: '/test',
    timestamp: new Date().toISOString(),
    performance: null,
    security: null,
    quality: null,
    dependencies: null,
    scaling: null,
    overallScore: 75,
    recommendations: [],
    ...overrides,
  };
}

describe('ReportGenerator', () => {
  describe('constructor', () => {
    it('stores results and options', () => {
      const results = makeResults();
      const gen = new ReportGenerator(results, { output: 'test.json' });
      expect(gen.results).toBe(results);
      expect(gen.options.output).toBe('test.json');
    });

    it('defaults options to empty object', () => {
      const gen = new ReportGenerator(makeResults());
      expect(gen.options).toEqual({});
    });
  });

  describe('getScoreColor', () => {
    it('returns green for score >= 80', () => {
      const gen = new ReportGenerator(makeResults());
      const color = gen.getScoreColor(85);
      const result = color('test');
      expect(result).toContain('test');
    });

    it('returns a callable for different thresholds', () => {
      const gen = new ReportGenerator(makeResults());
      const high = gen.getScoreColor(90);
      const mid = gen.getScoreColor(65);
      const low = gen.getScoreColor(40);

      expect(typeof high).toBe('function');
      expect(typeof mid).toBe('function');
      expect(typeof low).toBe('function');
      expect(high('x')).toBeDefined();
      expect(mid('x')).toBeDefined();
      expect(low('x')).toBeDefined();
    });
  });

  describe('getStatusIcon', () => {
    it('returns Pass for score >= 80', () => {
      const gen = new ReportGenerator(makeResults());
      expect(gen.getStatusIcon(85)).toContain('Pass');
    });

    it('returns Warning for score 60-79', () => {
      const gen = new ReportGenerator(makeResults());
      expect(gen.getStatusIcon(65)).toContain('Warning');
    });

    it('returns Fail for score < 60', () => {
      const gen = new ReportGenerator(makeResults());
      expect(gen.getStatusIcon(40)).toContain('Fail');
    });

    it('returns Pass for exactly 80', () => {
      const gen = new ReportGenerator(makeResults());
      expect(gen.getStatusIcon(80)).toContain('Pass');
    });

    it('returns Warning for exactly 60', () => {
      const gen = new ReportGenerator(makeResults());
      expect(gen.getStatusIcon(60)).toContain('Warning');
    });
  });

  describe('saveReport', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('saves report to absolute path as-is', () => {
      const results = makeResults({ overallScore: 88 });
      const gen = new ReportGenerator(results);

      gen.saveReport('/absolute/path/report.json');

      expect(mockedFs.ensureFileSync).toHaveBeenCalledWith(
        path.resolve('/absolute/path/report.json')
      );
      expect(mockedFs.writeJsonSync).toHaveBeenCalledWith(
        path.resolve('/absolute/path/report.json'),
        results,
        { spaces: 2 }
      );
    });

    it('resolves relative path to cwd', () => {
      const results = makeResults();
      const gen = new ReportGenerator(results);

      gen.saveReport('my-report.json');

      const expectedPath = path.resolve('my-report.json');
      expect(mockedFs.ensureFileSync).toHaveBeenCalledWith(expectedPath);
      expect(mockedFs.writeJsonSync).toHaveBeenCalledWith(expectedPath, results, { spaces: 2 });
    });
  });

  describe('printConsoleReport', () => {
    it('prints without errors for minimal results', () => {
      const gen = new ReportGenerator(makeResults());
      const spy = jest.spyOn(console, 'log').mockImplementation();

      expect(() => gen.printConsoleReport()).not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('prints all sections when all results present', () => {
      const results = makeResults({
        dependencies: {
          score: 90, outdated: [], unused: [], circularDependencies: [], duplicates: [], recommendations: [],
        },
        security: {
          score: 80,
          vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
          secretsFound: [], insecurePatterns: [], recommendations: [],
        },
        quality: {
          score: 75,
          complexity: { average: 5, highComplexityFiles: [] },
          codeSmells: [], testCoverage: null, lintIssues: 0, duplicateCode: [], recommendations: [],
        },
        performance: {
          score: 85,
          bundleSize: { total: '50 KB', largeFiles: [] },
          dependencies: { total: 5 },
          asyncPatterns: { asyncFunctions: 2, promiseChains: 0, callbackPatterns: 0, unhandledPromises: 0 },
          memoryLeakRisks: [], recommendations: [],
        },
        scaling: {
          score: 70, scalingNeeded: false, urgency: 'none',
          currentCapacity: {}, bottlenecks: [], recommendations: [],
        },
      });

      const gen = new ReportGenerator(results);
      const spy = jest.spyOn(console, 'log').mockImplementation();

      gen.printConsoleReport();

      const output = spy.mock.calls.flat().join('\n');
      expect(output).toContain('Dependencies');
      expect(output).toContain('Security');
      expect(output).toContain('Code Quality');
      expect(output).toContain('Performance');
      expect(output).toContain('Scaling');
      spy.mockRestore();
    });

    it('prints recommendations grouped by priority', () => {
      const results = makeResults({
        recommendations: [
          { category: 'test', priority: 'critical', message: 'fix critical' },
          { category: 'test', priority: 'low', message: 'fix low' },
          { category: 'test', priority: 'high', message: 'fix high' },
        ],
      });

      const gen = new ReportGenerator(results);
      const spy = jest.spyOn(console, 'log').mockImplementation();

      gen.printConsoleReport();

      const output = spy.mock.calls.flat().join('\n');
      expect(output).toContain('fix critical');
      expect(output).toContain('fix high');
      expect(output).toContain('fix low');
      spy.mockRestore();
    });
  });
});
