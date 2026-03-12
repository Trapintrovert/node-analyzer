import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { globSync } from 'glob';
import type { PerformanceResult } from '../types';

export class PerformanceAnalyzer {
  projectPath: string;
  results: PerformanceResult;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.results = {
      score: 100,
      bundleSize: {
        total: '0 KB',
        totalBytes: 0,
        files: 0,
        largeFiles: [],
      },
      dependencies: {
        total: 0,
        devDependencies: 0,
        productionDependencies: 0,
        heavyDependencies: [],
      },
      asyncPatterns: {
        asyncFunctions: 0,
        promiseChains: 0,
        callbackPatterns: 0,
        unhandledPromises: 0,
      },
      memoryLeakRisks: [],
      recommendations: [],
    };
  }

  async analyze(): Promise<PerformanceResult> {
    const spinner = ora('Analyzing performance...').start();

    try {
      await this.analyzeBundleSize();
      await this.checkDependencySize();
      await this.analyzeAsyncPatterns();
      await this.detectMemoryLeakRisks();
      await this.checkPerformancePatterns();

      this.calculateScore();
      spinner.succeed(chalk.green('Performance analysis complete'));
    } catch (error) {
      spinner.fail(chalk.red('Performance analysis failed'));
      console.error((error as Error).message);
    }

    return this.results;
  }

  async analyzeBundleSize(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/test/**', '**/*.test.js', '**/*.test.ts'],
    });

    let totalSize = 0;
    const largeFiles: Array<{ file: string; size: string }> = [];

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const stats = await fs.stat(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);

      totalSize += stats.size;

      if (stats.size > 100 * 1024) {
        largeFiles.push({
          file,
          size: `${sizeKB} KB`,
        });
      }
    }

    this.results.bundleSize = {
      total: `${(totalSize / 1024).toFixed(2)} KB`,
      totalBytes: totalSize,
      files: jsFiles.length,
      largeFiles,
    };

    if (largeFiles.length > 0) {
      this.results.recommendations.push({
        category: 'performance',
        priority: 'medium',
        message: `${largeFiles.length} large files found. Consider code splitting or lazy loading.`,
      });
    }
  }

  async checkDependencySize(): Promise<void> {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return;
      }

      const packageJson = (await fs.readJson(packageJsonPath)) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});

      const heavyDependencies = [
        'moment',
        'lodash',
        'axios',
        'jquery',
        'webpack',
        'babel-core',
        'typescript',
      ];

      const foundHeavy = deps.filter((dep) =>
        heavyDependencies.some((heavy) => dep.includes(heavy))
      );

      this.results.dependencies = {
        total: deps.length,
        devDependencies: devDeps.length,
        productionDependencies: deps.length,
        heavyDependencies: foundHeavy,
      };

      if (deps.length > 50) {
        this.results.recommendations.push({
          category: 'performance',
          priority: 'low',
          message: `${deps.length} dependencies installed. Review if all are necessary.`,
        });
      }

      if (foundHeavy.includes('moment')) {
        this.results.recommendations.push({
          category: 'performance',
          priority: 'medium',
          message: 'Consider replacing moment.js with date-fns or dayjs for better performance.',
        });
      }

      if (foundHeavy.includes('lodash')) {
        this.results.recommendations.push({
          category: 'performance',
          priority: 'low',
          message: 'Consider using lodash-es for tree-shaking or native alternatives.',
        });
      }
    } catch {
      // Ignore errors
    }
  }

  async analyzeAsyncPatterns(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    let asyncFunctions = 0;
    let promiseChains = 0;
    let callbackPatterns = 0;
    let unhandledPromises = 0;

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      const asyncMatches = content.match(/async\s+function|async\s*\(/g);
      if (asyncMatches) asyncFunctions += asyncMatches.length;

      const promiseMatches = content.match(/\.then\s*\(/g);
      if (promiseMatches) promiseChains += promiseMatches.length;

      const callbackMatches = content.match(/function\s*\([^)]*callback[^)]*\)/gi);
      if (callbackMatches) callbackPatterns += callbackMatches.length;

      const unhandledMatches = content.match(/\.then\([^)]+\)(?!\s*\.catch)/g);
      if (unhandledMatches) unhandledPromises += unhandledMatches.length;
    }

    this.results.asyncPatterns = {
      asyncFunctions,
      promiseChains,
      callbackPatterns,
      unhandledPromises,
    };

    if (callbackPatterns > 10) {
      this.results.recommendations.push({
        category: 'performance',
        priority: 'medium',
        message:
          'Many callback patterns found. Consider migrating to async/await for better readability.',
      });
    }

    if (unhandledPromises > 5) {
      this.results.recommendations.push({
        category: 'performance',
        priority: 'high',
        message: `${unhandledPromises} promises without error handling. Add .catch() handlers.`,
      });
    }
  }

  async detectMemoryLeakRisks(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    const leakPatterns = [
      {
        name: 'Global variables',
        regex:
          /^(?!.*(?:const|let|var))\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/gm,
        severity: 'medium',
      },
      {
        name: 'Event listeners without cleanup',
        regex: /addEventListener\([^)]+\)(?![\s\S]*removeEventListener)/g,
        severity: 'medium',
      },
      {
        name: 'setInterval without clear',
        regex: /setInterval\([^)]+\)(?![\s\S]*clearInterval)/g,
        severity: 'high',
      },
      {
        name: 'Large closures',
        regex: /function[^{]*{[\s\S]{500,}}/g,
        severity: 'low',
      },
    ];

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      for (const pattern of leakPatterns) {
        const matches = content.match(pattern.regex);
        if (matches && matches.length > 0) {
          this.results.memoryLeakRisks.push({
            file,
            pattern: pattern.name,
            severity: pattern.severity,
            occurrences: matches.length,
          });
        }
      }
    }

    if (this.results.memoryLeakRisks.length > 10) {
      this.results.recommendations.push({
        category: 'performance',
        priority: 'high',
        message: `${this.results.memoryLeakRisks.length} potential memory leak risks detected.`,
      });
    }
  }

  async checkPerformancePatterns(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    let synchronousFileOps = 0;
    let blockingLoops = 0;

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      const syncOps = content.match(/fs\.(readFileSync|writeFileSync|appendFileSync)/g);
      if (syncOps) synchronousFileOps += syncOps.length;

      const blockingPattern = /for\s*\([^)]+\)\s*\{[^}]*?(fs\.(readFileSync|writeFileSync|appendFileSync|mkdirSync|readdirSync|statSync|existsSync|copyFileSync|renameSync|unlinkSync)|http\.get\s*\(|https\.get\s*\(|database\.(query|execute)\s*\()[^}]*?\}/g;
      const blocking = content.match(blockingPattern);
      if (blocking) blockingLoops += blocking.length;
    }

    if (synchronousFileOps > 5) {
      this.results.recommendations.push({
        category: 'performance',
        priority: 'high',
        message: `${synchronousFileOps} synchronous file operations found. Use async alternatives.`,
      });
    }

    if (blockingLoops > 0) {
      this.results.recommendations.push({
        category: 'performance',
        priority: 'high',
        message: `${blockingLoops} potentially blocking loops detected. Consider batching or async processing.`,
      });
    }
  }

  calculateScore(): void {
    let score = 100;

    const totalBytes = this.results.bundleSize.totalBytes ?? 0;
    const totalMB = totalBytes / (1024 * 1024);
    if (totalMB > 5) score -= 20;
    else if (totalMB > 2) score -= 10;
    else if (totalMB > 1) score -= 5;

    if (this.results.dependencies.total > 100) score -= 15;
    else if (this.results.dependencies.total > 50) score -= 10;

    const highRisks = this.results.memoryLeakRisks.filter((r) => r.severity === 'high').length;
    score -= highRisks * 10;
    score -= (this.results.memoryLeakRisks.length - highRisks) * 3;

    score -= Math.min(this.results.asyncPatterns.unhandledPromises * 2, 20);

    this.results.score = Math.max(0, Math.min(100, score));
  }
}
