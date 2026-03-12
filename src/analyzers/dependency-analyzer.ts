import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { globSync } from 'glob';
import type { DependenciesResult } from '../types';

interface ExecError extends Error {
  stdout?: string;
}

export class DependencyAnalyzer {
  projectPath: string;
  results: DependenciesResult;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.results = {
      score: 100,
      outdated: [],
      unused: [],
      circularDependencies: [],
      duplicates: [],
      recommendations: [],
    };
  }

  async analyze(): Promise<DependenciesResult> {
    const spinner = ora('Analyzing dependencies...').start();

    try {
      await this.checkOutdatedPackages();
      await this.detectCircularDependencies();
      await this.checkForUnusedDependencies();

      this.calculateScore();
      spinner.succeed(chalk.green('Dependency analysis complete'));
    } catch (error) {
      spinner.fail(chalk.red('Dependency analysis failed'));
      console.error((error as Error).message);
    }

    return this.results;
  }

  async checkOutdatedPackages(): Promise<void> {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return;
      }

      const result = execSync('npm outdated --json', {
        cwd: this.projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const outdated = JSON.parse(result || '{}') as Record<
        string,
        { current: string; wanted: string; latest: string }
      >;

      for (const [name, info] of Object.entries(outdated)) {
        this.results.outdated.push({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          severity: this.getUpdateSeverity(info.current, info.latest),
        });
      }

      const majorUpdates = this.results.outdated.filter((dep) => dep.severity === 'major').length;
      if (majorUpdates > 0) {
        this.results.recommendations.push({
          category: 'dependencies',
          priority: 'medium',
          message: `${majorUpdates} packages have major version updates available. Review breaking changes.`,
        });
      }

      if (this.results.outdated.length > 10) {
        this.results.recommendations.push({
          category: 'dependencies',
          priority: 'low',
          message: `${this.results.outdated.length} outdated packages. Run 'npm update'.`,
        });
      }
    } catch (error) {
      const err = error as ExecError;
      if (err.stdout) {
        try {
          const outdated = JSON.parse(err.stdout) as Record<
            string,
            { current: string; wanted: string; latest: string }
          >;
          for (const [name, info] of Object.entries(outdated)) {
            this.results.outdated.push({
              name,
              current: info.current,
              wanted: info.wanted,
              latest: info.latest,
              severity: this.getUpdateSeverity(info.current, info.latest),
            });
          }
        } catch {
          // Ignore
        }
      }
    }
  }

  getUpdateSeverity(current: string, latest: string): string {
    if (!current || !latest) return 'unknown';

    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    if (latestParts[0] > currentParts[0]) return 'major';
    if (latestParts[1] > currentParts[1]) return 'minor';
    return 'patch';
  }

  async detectCircularDependencies(): Promise<void> {
    try {
      const jsFiles = globSync('**/*.{js,ts}', {
        cwd: this.projectPath,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      const dependencyGraph = new Map<string, string[]>();

      for (const file of jsFiles) {
        const filePath = path.join(this.projectPath, file);
        const content = await fs.readFile(filePath, 'utf8');

        const requireMatches = content.match(/require\s*\(['"]([^'"]+)['"]\)/g) || [];
        const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];

        const dependencies = new Set<string>();

        requireMatches.forEach((match: string) => {
          const depMatch = match.match(/require\s*\(['"]([^'"]+)['"]\)/);
          if (depMatch) {
            const dep = depMatch[1];
            if (dep.startsWith('.')) {
              dependencies.add(dep);
            }
          }
        });

        importMatches.forEach((match: string) => {
          const depMatch = match.match(/from\s+['"]([^'"]+)['"]/);
          if (depMatch) {
            const dep = depMatch[1];
            if (dep.startsWith('.')) {
              dependencies.add(dep);
            }
          }
        });

        if (dependencies.size > 0) {
          dependencyGraph.set(file, Array.from(dependencies));
        }
      }

      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const detectCycle = (node: string, cyclePath: string[] = []): void => {
        if (recursionStack.has(node)) {
          this.results.circularDependencies.push({
            cycle: [...cyclePath, node],
          });
          return;
        }

        if (visited.has(node)) return;

        visited.add(node);
        recursionStack.add(node);

        const deps = dependencyGraph.get(node) || [];
        for (const dep of deps) {
          detectCycle(dep, [...cyclePath, node]);
        }

        recursionStack.delete(node);
      };

      for (const node of dependencyGraph.keys()) {
        detectCycle(node);
      }

      if (this.results.circularDependencies.length > 0) {
        this.results.recommendations.push({
          category: 'dependencies',
          priority: 'high',
          message: `${this.results.circularDependencies.length} circular dependencies detected. Refactor to break cycles.`,
        });
      }
    } catch {
      // Ignore errors in circular dependency detection
    }
  }

  async checkForUnusedDependencies(): Promise<void> {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return;
      }

      const packageJson = (await fs.readJson(packageJsonPath)) as {
        dependencies?: Record<string, string>;
      };
      const dependencies = Object.keys(packageJson.dependencies || {});

      const jsFiles = globSync('**/*.{js,ts}', {
        cwd: this.projectPath,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      let allContent = '';
      for (const file of jsFiles) {
        const filePath = path.join(this.projectPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        allContent += content;
      }

      for (const dep of dependencies) {
        const isUsed =
          allContent.includes(`'${dep}'`) ||
          allContent.includes(`"${dep}"`) ||
          allContent.includes(`\`${dep}\``);

        if (!isUsed) {
          this.results.unused.push(dep);
        }
      }

      if (this.results.unused.length > 0) {
        this.results.recommendations.push({
          category: 'dependencies',
          priority: 'low',
          message: `${this.results.unused.length} potentially unused dependencies found. Consider removing.`,
        });
      }
    } catch {
      // Ignore errors
    }
  }

  calculateScore(): void {
    let score = 100;

    const majorOutdated = this.results.outdated.filter((d) => d.severity === 'major').length;
    score -= majorOutdated * 5;
    score -= (this.results.outdated.length - majorOutdated) * 2;

    score -= this.results.circularDependencies.length * 10;

    score -= this.results.unused.length * 1;

    this.results.score = Math.max(0, Math.min(100, score));
  }
}
