import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { globSync } from 'glob';
import { execSync } from 'child_process';
import type { QualityResult } from '../types';

export class QualityAnalyzer {
  projectPath: string;
  results: QualityResult;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.results = {
      score: 100,
      complexity: {
        average: 0,
        total: 0,
        filesAnalyzed: 0,
        highComplexityFiles: [],
      },
      codeSmells: [],
      testCoverage: null,
      lintIssues: 0,
      duplicateCode: [],
      recommendations: [],
    };
  }

  async analyze(): Promise<QualityResult> {
    const spinner = ora('Analyzing code quality...').start();

    try {
      await this.analyzeComplexity();
      await this.checkTestCoverage();
      await this.runLinting();
      await this.checkCodeStructure();

      this.calculateScore();
      spinner.succeed(chalk.green('Code quality analysis complete'));
    } catch (error) {
      spinner.fail(chalk.red('Code quality analysis failed'));
      console.error((error as Error).message);
    }

    return this.results;
  }

  async analyzeComplexity(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/test/**',
        '**/__tests__/**',
        '**/examples/**',
        '**/*.test.js',
        '**/*.spec.js',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
      ],
    });

    let totalComplexity = 0;
    const highComplexityFunctions: Array<{ file: string; complexity: number }> = [];
    let fileCount = 0;

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      const complexity = this.estimateComplexity(content);
      totalComplexity += complexity;
      fileCount++;

      if (complexity > 50) {
        highComplexityFunctions.push({
          file,
          complexity,
        });
      }
    }

    this.results.complexity = {
      average: fileCount > 0 ? parseFloat((totalComplexity / fileCount).toFixed(2)) : 0,
      total: totalComplexity,
      filesAnalyzed: fileCount,
      highComplexityFiles: highComplexityFunctions,
    };

    if (highComplexityFunctions.length > 0) {
      this.results.recommendations.push({
        category: 'quality',
        priority: 'medium',
        message: `${highComplexityFunctions.length} files have high complexity. Consider refactoring.`,
      });
    }
  }

  estimateComplexity(code: string): number {
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\&\&/g,
      /\|\|/g,
      /\?\s*[^:?\s]/g,
    ];

    let complexity = 1;

    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  async checkTestCoverage(): Promise<void> {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        this.results.testCoverage = { status: 'No package.json found' };
        return;
      }

      const packageJson = (await fs.readJson(packageJsonPath)) as { scripts?: Record<string, string> };
      const hasTestScript = packageJson.scripts && packageJson.scripts.test;

      if (!hasTestScript) {
        this.results.testCoverage = { status: 'No test script configured' };
        this.results.recommendations.push({
          category: 'quality',
          priority: 'high',
          message: 'No test script found in package.json. Add automated tests.',
        });
        return;
      }

      const testFiles = globSync('**/*.{test,spec}.{js,ts}', {
        cwd: this.projectPath,
        ignore: ['**/node_modules/**'],
      });

      const sourceFiles = globSync('**/src/**/*.{js,ts}', {
        cwd: this.projectPath,
        ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts'],
      });

      const coveragePercentage =
        sourceFiles.length > 0 ? ((testFiles.length / sourceFiles.length) * 100).toFixed(2) : 0;

      this.results.testCoverage = {
        status: 'estimated',
        testFiles: testFiles.length,
        sourceFiles: sourceFiles.length,
        estimatedCoverage: `${coveragePercentage}%`,
      };

      if (testFiles.length === 0) {
        this.results.recommendations.push({
          category: 'quality',
          priority: 'high',
          message: 'No test files found. Add unit and integration tests.',
        });
      } else if (parseFloat(String(coveragePercentage)) < 50) {
        this.results.recommendations.push({
          category: 'quality',
          priority: 'medium',
          message: `Low test coverage (estimated ${coveragePercentage}%). Aim for 70%+ coverage.`,
        });
      }
    } catch (error) {
      this.results.testCoverage = {
        status: 'Unable to determine',
        error: (error as Error).message,
      };
    }
  }

  async runLinting(): Promise<void> {
    try {
      const eslintPath = path.join(this.projectPath, '.eslintrc.json');
      const eslintConfigExists =
        fs.existsSync(eslintPath) ||
        fs.existsSync(path.join(this.projectPath, '.eslintrc.js'));

      if (!eslintConfigExists) {
        this.results.recommendations.push({
          category: 'quality',
          priority: 'medium',
          message: 'No ESLint configuration found. Add linting to maintain code quality.',
        });
        return;
      }

      const result = execSync('npx eslint . --format json', {
        cwd: this.projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const lintResults = JSON.parse(result) as Array<{ errorCount: number; warningCount: number }>;
      this.results.lintIssues = lintResults.reduce(
        (sum, file) => sum + file.errorCount + file.warningCount,
        0
      );

      if (this.results.lintIssues > 50) {
        this.results.recommendations.push({
          category: 'quality',
          priority: 'medium',
          message: `${this.results.lintIssues} linting issues found. Run 'npm run lint --fix'.`,
        });
      }
    } catch {
      this.results.lintIssues = 0;
    }
  }

  async checkCodeStructure(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/__tests__/**', '**/examples/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', '**/*.d.ts'],
    });

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').length;

      if (lines > 500) {
        this.results.codeSmells.push({
          file,
          issue: 'Large file',
          severity: 'medium',
          details: `${lines} lines - consider splitting into smaller modules`,
        });
      }

      const todoMatches = content.match(/\/\/\s*TODO/gi);
      if (todoMatches && todoMatches.length > 5) {
        this.results.codeSmells.push({
          file,
          issue: 'Many TODO comments',
          severity: 'low',
          details: `${todoMatches.length} TODO comments found`,
        });
      }

      const consoleMatches = content.match(/console\.log/g);
      if (consoleMatches && consoleMatches.length > 3) {
        this.results.codeSmells.push({
          file,
          issue: 'Debug statements',
          severity: 'low',
          details: `${consoleMatches.length} console.log statements - use proper logging`,
        });
      }
    }
  }

  calculateScore(): void {
    let score = 100;

    const avgComplexity =
      typeof this.results.complexity.average === 'number'
        ? this.results.complexity.average
        : parseFloat(String(this.results.complexity.average));
    if (avgComplexity > 15) score -= 15;
    else if (avgComplexity > 10) score -= 10;
    else if (avgComplexity > 7) score -= 5;

    if (this.results.testCoverage && this.results.testCoverage.testFiles === 0) {
      score -= 20;
    }

    if (this.results.lintIssues > 100) score -= 20;
    else if (this.results.lintIssues > 50) score -= 15;
    else if (this.results.lintIssues > 20) score -= 10;
    else if (this.results.lintIssues > 0) score -= 5;

    score -= this.results.codeSmells.length * 2;

    this.results.score = Math.max(0, Math.min(100, score));
  }
}
