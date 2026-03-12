import { DependencyAnalyzer } from '../analyzers/dependency-analyzer';

describe('DependencyAnalyzer', () => {
  describe('getUpdateSeverity', () => {
    let analyzer: DependencyAnalyzer;

    beforeEach(() => {
      analyzer = new DependencyAnalyzer('/fake/path');
    });

    it('returns "major" when major version differs', () => {
      expect(analyzer.getUpdateSeverity('1.2.3', '2.0.0')).toBe('major');
    });

    it('returns "minor" when only minor version differs', () => {
      expect(analyzer.getUpdateSeverity('1.2.3', '1.3.0')).toBe('minor');
    });

    it('returns "patch" when only patch version differs', () => {
      expect(analyzer.getUpdateSeverity('1.2.3', '1.2.5')).toBe('patch');
    });

    it('returns "patch" when versions are the same', () => {
      expect(analyzer.getUpdateSeverity('1.2.3', '1.2.3')).toBe('patch');
    });

    it('returns "unknown" when current is empty', () => {
      expect(analyzer.getUpdateSeverity('', '1.0.0')).toBe('unknown');
    });

    it('returns "unknown" when latest is empty', () => {
      expect(analyzer.getUpdateSeverity('1.0.0', '')).toBe('unknown');
    });
  });

  describe('calculateScore', () => {
    it('starts at 100 with no issues', () => {
      const analyzer = new DependencyAnalyzer('/fake/path');
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(100);
    });

    it('deducts 5 per major outdated package', () => {
      const analyzer = new DependencyAnalyzer('/fake/path');
      analyzer.results.outdated = [
        {
          name: 'a',
          current: '1.0.0',
          wanted: '2.0.0',
          latest: '2.0.0',
          severity: 'major'
        },
        {
          name: 'b',
          current: '1.0.0',
          wanted: '3.0.0',
          latest: '3.0.0',
          severity: 'major'
        }
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(90);
    });

    it('deducts 2 per non-major outdated package', () => {
      const analyzer = new DependencyAnalyzer('/fake/path');
      analyzer.results.outdated = [
        {
          name: 'a',
          current: '1.0.0',
          wanted: '1.1.0',
          latest: '1.1.0',
          severity: 'minor'
        }
      ];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(98);
    });

    it('deducts 10 per circular dependency', () => {
      const analyzer = new DependencyAnalyzer('/fake/path');
      analyzer.results.circularDependencies = [{ cycle: ['a', 'b', 'a'] }];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(90);
    });

    it('deducts 1 per unused dependency', () => {
      const analyzer = new DependencyAnalyzer('/fake/path');
      analyzer.results.unused = ['pkg-a', 'pkg-b', 'pkg-c'];
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(97);
    });

    it('floors score at 0', () => {
      const analyzer = new DependencyAnalyzer('/fake/path');
      analyzer.results.circularDependencies = Array(20).fill({
        cycle: ['a', 'b']
      });
      analyzer.calculateScore();
      expect(analyzer.results.score).toBe(0);
    });

    it('caps score at 100', () => {
      const analyzer = new DependencyAnalyzer('/fake/path');
      analyzer.calculateScore();
      expect(analyzer.results.score).toBeLessThanOrEqual(100);
    });
  });

  describe('constructor', () => {
    it('initializes with default results', () => {
      const analyzer = new DependencyAnalyzer('/my/project');
      expect(analyzer.projectPath).toBe('/my/project');
      expect(analyzer.results.score).toBe(100);
      expect(analyzer.results.outdated).toEqual([]);
      expect(analyzer.results.unused).toEqual([]);
      expect(analyzer.results.circularDependencies).toEqual([]);
    });
  });
});
