#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { Analyzer } from './analyzer';
import { ReportGenerator } from './report-generator';
import type { AnalyzerOptions } from './types';

const program = new Command();

program
  .name('node-analyze')
  .description('Comprehensive NodeJS application analyzer')
  .version('1.0.0')
  .argument('[project-path]', 'Path to NodeJS project', '.')
  .option('-o, --output <file>', 'Output report file', 'analysis-report.json')
  .option('--no-performance', 'Skip performance analysis')
  .option('--no-security', 'Skip security analysis')
  .option('--no-quality', 'Skip code quality analysis')
  .option('--threshold <score>', 'Minimum passing score (0-100)', '70')
  .action(async (projectPath: string, options: AnalyzerOptions) => {
    try {
      console.log(chalk.blue.bold('\n🔍 NodeJS Application Analyzer\n'));

      const absolutePath = path.resolve(projectPath);
      console.log(chalk.gray(`Analyzing project: ${absolutePath}\n`));

      const analyzer = new Analyzer(absolutePath, options);
      const results = await analyzer.analyze();

      const reportGen = new ReportGenerator(results, options);
      reportGen.printConsoleReport();
      reportGen.saveReport(options.output ?? 'analysis-report.json');

      const overallScore = results.overallScore;
      const threshold = parseInt(options.threshold ?? '70', 10);

      console.log(chalk.gray(`\n📊 Report saved to: ${options.output ?? 'analysis-report.json'}\n`));

      if (overallScore >= threshold) {
        console.log(chalk.green.bold(`✅ Analysis passed! Score: ${overallScore}/100\n`));
        process.exit(0);
      } else {
        console.log(chalk.red.bold(`❌ Analysis failed! Score: ${overallScore}/100 (threshold: ${threshold})\n`));
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red.bold('\n❌ Error:'), err.message);
      console.error(err.stack);
      process.exit(1);
    }
  });

program.parse();
