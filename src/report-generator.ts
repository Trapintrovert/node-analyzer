import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { table } from 'table';
import type { AnalysisResults, AnalyzerOptions, ScalingUrgency } from './types';

export class ReportGenerator {
  results: AnalysisResults;
  options: AnalyzerOptions;

  constructor(results: AnalysisResults, options: AnalyzerOptions = {}) {
    this.results = results;
    this.options = options;
  }

  printConsoleReport(): void {
    console.log(
      chalk.bold.cyan(
        '\n╔════════════════════════════════════════════════════════════╗'
      )
    );
    console.log(
      chalk.bold.cyan(
        '║           NodeJS Application Analysis Report              ║'
      )
    );
    console.log(
      chalk.bold.cyan(
        '╚════════════════════════════════════════════════════════════╝\n'
      )
    );

    const scoreColor = this.getScoreColor(this.results.overallScore);
    console.log(
      chalk.bold('Overall Score: ') +
        scoreColor(`${this.results.overallScore}/100`)
    );
    console.log(
      chalk.gray(
        `Analysis Date: ${new Date(this.results.timestamp).toLocaleString()}\n`
      )
    );

    this.printScoreTable();

    if (this.results.dependencies) {
      this.printDependenciesSection();
    }

    if (this.results.security) {
      this.printSecuritySection();
    }

    if (this.results.quality) {
      this.printQualitySection();
    }

    if (this.results.performance) {
      this.printPerformanceSection();
    }

    if (this.results.scaling) {
      this.printScalingSection();
    }

    this.printRecommendations();
  }

  printScoreTable(): void {
    const data: (string | ReturnType<typeof chalk.bold>)[][] = [
      [chalk.bold('Category'), chalk.bold('Score'), chalk.bold('Status')]
    ];

    if (this.results.dependencies) {
      data.push([
        'Dependencies',
        this.getScoreColor(this.results.dependencies.score)(
          String(this.results.dependencies.score)
        ),
        this.getStatusIcon(this.results.dependencies.score)
      ]);
    }

    if (this.results.security) {
      data.push([
        'Security',
        this.getScoreColor(this.results.security.score)(
          String(this.results.security.score)
        ),
        this.getStatusIcon(this.results.security.score)
      ]);
    }

    if (this.results.quality) {
      data.push([
        'Code Quality',
        this.getScoreColor(this.results.quality.score)(
          String(this.results.quality.score)
        ),
        this.getStatusIcon(this.results.quality.score)
      ]);
    }

    if (this.results.performance) {
      data.push([
        'Performance',
        this.getScoreColor(this.results.performance.score)(
          String(this.results.performance.score)
        ),
        this.getStatusIcon(this.results.performance.score)
      ]);
    }

    if (this.results.scaling) {
      data.push([
        'Scaling Readiness',
        this.getScoreColor(this.results.scaling.score)(
          String(this.results.scaling.score)
        ),
        this.getStatusIcon(this.results.scaling.score)
      ]);
    }

    console.log(table(data));
  }

  printDependenciesSection(): void {
    console.log(chalk.bold.yellow('\n📦 Dependencies Analysis\n'));

    const deps = this.results.dependencies!;

    console.log(
      `  ${chalk.gray('•')} Outdated Packages: ${deps.outdated.length}`
    );
    if (deps.outdated.length > 0) {
      const major = deps.outdated.filter((d) => d.severity === 'major').length;
      console.log(`    ${chalk.red('↑')} Major updates: ${major}`);
    }

    console.log(
      `  ${chalk.gray('•')} Circular Dependencies: ${deps.circularDependencies.length}`
    );
    console.log(
      `  ${chalk.gray('•')} Unused Dependencies: ${deps.unused.length}`
    );

    if (deps.unused.length > 0 && deps.unused.length <= 5) {
      console.log(chalk.gray(`    Unused: ${deps.unused.join(', ')}`));
    }
  }

  printSecuritySection(): void {
    console.log(chalk.bold.red('\n🔒 Security Analysis\n'));

    const sec = this.results.security!;

    if (sec.vulnerabilities && sec.vulnerabilities.total > 0) {
      console.log(`  ${chalk.gray('•')} Vulnerabilities Found:`);
      console.log(
        `    ${chalk.red('●')} Critical: ${sec.vulnerabilities.critical}`
      );
      console.log(`    ${chalk.red('●')} High: ${sec.vulnerabilities.high}`);
      console.log(
        `    ${chalk.yellow('●')} Moderate: ${sec.vulnerabilities.moderate}`
      );
      console.log(`    ${chalk.blue('●')} Low: ${sec.vulnerabilities.low}`);
    } else {
      console.log(`  ${chalk.green('✓')} No known vulnerabilities found`);
    }

    console.log(
      `  ${chalk.gray('•')} Secrets in Code: ${sec.secretsFound.length}`
    );
    console.log(
      `  ${chalk.gray('•')} Insecure Patterns: ${sec.insecurePatterns.length}`
    );
  }

  printQualitySection(): void {
    console.log(chalk.bold.blue('\n📊 Code Quality Analysis\n'));

    const quality = this.results.quality!;

    console.log(
      `  ${chalk.gray('•')} Average Complexity: ${quality.complexity.average}`
    );
    console.log(
      `  ${chalk.gray('•')} High Complexity Files: ${quality.complexity.highComplexityFiles.length}`
    );
    console.log(`  ${chalk.gray('•')} Lint Issues: ${quality.lintIssues}`);
    console.log(
      `  ${chalk.gray('•')} Code Smells: ${quality.codeSmells.length}`
    );

    if (quality.testCoverage) {
      if (quality.testCoverage.testFiles !== undefined) {
        console.log(
          `  ${chalk.gray('•')} Test Files: ${quality.testCoverage.testFiles}`
        );
        console.log(
          `  ${chalk.gray('•')} Estimated Coverage: ${quality.testCoverage.estimatedCoverage}`
        );
      } else {
        console.log(
          `  ${chalk.gray('•')} Test Coverage: ${quality.testCoverage.status}`
        );
      }
    }
  }

  printPerformanceSection(): void {
    console.log(chalk.bold.green('\n⚡ Performance Analysis\n'));

    const perf = this.results.performance!;

    console.log(`  ${chalk.gray('•')} Bundle Size: ${perf.bundleSize.total}`);
    console.log(
      `  ${chalk.gray('•')} Large Files (>100KB): ${perf.bundleSize.largeFiles.length}`
    );
    console.log(
      `  ${chalk.gray('•')} Dependencies: ${perf.dependencies.total}`
    );
    console.log(
      `  ${chalk.gray('•')} Memory Leak Risks: ${perf.memoryLeakRisks.length}`
    );
    console.log(
      `  ${chalk.gray('•')} Async Functions: ${perf.asyncPatterns.asyncFunctions}`
    );
    console.log(
      `  ${chalk.gray('•')} Unhandled Promises: ${perf.asyncPatterns.unhandledPromises}`
    );
  }

  printScalingSection(): void {
    console.log(chalk.bold.cyan('\n📈 Scaling Analysis\n'));

    const scaling = this.results.scaling!;

    const urgencyColor: Record<ScalingUrgency, typeof chalk.green> = {
      none: chalk.green,
      low: chalk.blue,
      medium: chalk.yellow,
      high: chalk.red,
      critical: chalk.red.bold
    };

    const urgencyIcon: Record<ScalingUrgency, string> = {
      none: '✅',
      low: '💡',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥'
    };

    const urgency = scaling.urgency as ScalingUrgency;
    console.log(
      `  ${urgencyIcon[urgency]} Scaling Urgency: ${urgencyColor[urgency](urgency.toUpperCase())}`
    );
    console.log(
      `  ${chalk.gray('•')} Scaling Needed: ${scaling.scalingNeeded ? chalk.red('Yes') : chalk.green('No')}`
    );
    console.log(
      `  ${chalk.gray('•')} Bottlenecks Found: ${scaling.bottlenecks.length}`
    );

    if (scaling.bottlenecks.length > 0) {
      console.log(chalk.yellow('\n  Critical Bottlenecks:'));
      scaling.bottlenecks
        .filter((b) => b.severity === 'critical' || b.severity === 'high')
        .slice(0, 3)
        .forEach((b) => {
          console.log(`    ${chalk.red('⚠')} ${b.issue}`);
          console.log(`      Impact: ${b.impact}`);
        });
    }

    if (scaling.projectedLoad?.scalingTriggers) {
      console.log(chalk.cyan('\n  Scaling Triggers:'));
      const triggers = scaling.projectedLoad.scalingTriggers;
      if (triggers.immediate) {
        console.log(
          `    Immediate: ${triggers.immediate.threshold} → ${triggers.immediate.action}`
        );
      }
      if (triggers.shortTerm) {
        console.log(
          `    Short-term: ${triggers.shortTerm.threshold} → ${triggers.shortTerm.action}`
        );
      }
      if (triggers.longTerm) {
        console.log(
          `    Long-term: ${triggers.longTerm.threshold} → ${triggers.longTerm.action}`
        );
      }
    }

    if (scaling.scalingPlan) {
      console.log(chalk.cyan('\n  Action Plan:'));
      if (scaling.scalingPlan.immediate.length > 0) {
        console.log(
          `    ${chalk.red('Immediate')}: ${scaling.scalingPlan.immediate.length} actions`
        );
      }
      if (scaling.scalingPlan.shortTerm.length > 0) {
        console.log(
          `    ${chalk.yellow('Short-term')}: ${scaling.scalingPlan.shortTerm.length} actions`
        );
      }
      if (scaling.scalingPlan.longTerm.length > 0) {
        console.log(
          `    ${chalk.blue('Long-term')}: ${scaling.scalingPlan.longTerm.length} actions`
        );
      }
    }
  }

  printRecommendations(): void {
    if (this.results.recommendations.length === 0) {
      console.log(chalk.green.bold('\n✨ No recommendations - great job!\n'));
      return;
    }

    console.log(chalk.bold.magenta('\n💡 Recommendations\n'));

    const critical = this.results.recommendations.filter(
      (r) => r.priority === 'critical'
    );
    const high = this.results.recommendations.filter(
      (r) => r.priority === 'high'
    );
    const medium = this.results.recommendations.filter(
      (r) => r.priority === 'medium'
    );
    const low = this.results.recommendations.filter(
      (r) => r.priority === 'low'
    );

    if (critical.length > 0) {
      console.log(chalk.red.bold('  🚨 Critical:'));
      critical.forEach((r) =>
        console.log(`     ${chalk.red('•')} ${r.message}`)
      );
      console.log();
    }

    if (high.length > 0) {
      console.log(chalk.red('  ⚠️  High Priority:'));
      high.forEach((r) =>
        console.log(`     ${chalk.yellow('•')} ${r.message}`)
      );
      console.log();
    }

    if (medium.length > 0) {
      console.log(chalk.yellow('  📌 Medium Priority:'));
      medium.forEach((r) =>
        console.log(`     ${chalk.yellow('•')} ${r.message}`)
      );
      console.log();
    }

    if (low.length > 0) {
      console.log(chalk.blue('  💭 Low Priority:'));
      low.forEach((r) => console.log(`     ${chalk.blue('•')} ${r.message}`));
      console.log();
    }
  }

  getScoreColor(score: number): (text: string) => string {
    if (score >= 80) return chalk.green.bold as (text: string) => string;
    if (score >= 60) return chalk.yellow.bold as (text: string) => string;
    return chalk.red.bold as (text: string) => string;
  }

  getStatusIcon(score: number): string {
    if (score >= 80) return chalk.green('✓ Pass');
    if (score >= 60) return chalk.yellow('⚠ Warning');
    return chalk.red('✗ Fail');
  }

  saveReport(outputFile: string): void {
    const reportPath = path.resolve(outputFile);

    fs.ensureFileSync(reportPath);
    fs.writeJsonSync(reportPath, this.results, { spaces: 2 });
  }
}
