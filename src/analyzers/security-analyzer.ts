import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { globSync } from 'glob';
import type { SecurityResult, Vulnerabilities } from '../types';

interface ExecError extends Error {
  stdout?: string;
}

interface AuditResponse {
  metadata?: {
    vulnerabilities?: Vulnerabilities;
  };
}

export class SecurityAnalyzer {
  projectPath: string;
  results: SecurityResult;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.results = {
      score: 100,
      vulnerabilities: {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        total: 0,
      },
      secretsFound: [],
      insecurePatterns: [],
      recommendations: [],
    };
  }

  async analyze(): Promise<SecurityResult> {
    const spinner = ora('Analyzing security...').start();

    try {
      await this.checkDependencyVulnerabilities();
      await this.scanForSecrets();
      await this.checkInsecurePatterns();
      await this.runESLintSecurity();

      this.calculateScore();
      spinner.succeed(chalk.green('Security analysis complete'));
    } catch (error) {
      spinner.fail(chalk.red('Security analysis failed'));
      console.error((error as Error).message);
    }

    return this.results;
  }

  async checkDependencyVulnerabilities(): Promise<void> {
    try {
      const packageLockPath = path.join(this.projectPath, 'package-lock.json');

      if (!fs.existsSync(packageLockPath)) {
        this.results.recommendations.push({
          category: 'security',
          priority: 'medium',
          message: 'No package-lock.json found. Run npm install to generate it.',
        });
        return;
      }

      const auditResult = execSync('npm audit --json', {
        cwd: this.projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const audit: AuditResponse = JSON.parse(auditResult);

      if (audit.metadata?.vulnerabilities) {
        const vulns = audit.metadata.vulnerabilities;
        this.results.vulnerabilities = {
          critical: vulns.critical || 0,
          high: vulns.high || 0,
          moderate: vulns.moderate || 0,
          low: vulns.low || 0,
          total: vulns.total || 0,
        };

        if (vulns.critical && vulns.critical > 0) {
          this.results.recommendations.push({
            category: 'security',
            priority: 'critical',
            message: `Found ${vulns.critical} critical vulnerabilities. Run 'npm audit fix' immediately.`,
          });
        }

        if (vulns.high && vulns.high > 0) {
          this.results.recommendations.push({
            category: 'security',
            priority: 'high',
            message: `Found ${vulns.high} high severity vulnerabilities. Update dependencies.`,
          });
        }
      }
    } catch (error) {
      const err = error as ExecError;
      if (err.stdout) {
        try {
          const audit: AuditResponse = JSON.parse(err.stdout);
          if (audit.metadata?.vulnerabilities) {
            const vulns = audit.metadata.vulnerabilities;
            this.results.vulnerabilities = {
              critical: vulns.critical || 0,
              high: vulns.high || 0,
              moderate: vulns.moderate || 0,
              low: vulns.low || 0,
              total: vulns.total || 0,
            };
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  async scanForSecrets(): Promise<void> {
    const secretPatterns = [
      {
        name: 'API Key',
        regex: /(?:api[_-]?key|apikey)[\s]*[:=][\s]*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
      },
      { name: 'AWS Key', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
      {
        name: 'Private Key',
        regex: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g,
      },
      {
        name: 'Password',
        regex: /(?:password|passwd|pwd)[\s]*[:=][\s]*['"]([^'"]{8,})['"]?/gi,
      },
      {
        name: 'JWT Token',
        regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
      },
      {
        name: 'Database URL',
        regex: /(mongodb|postgres|mysql):\/\/[^'">\s]+/gi,
      },
    ];

    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      for (const pattern of secretPatterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          this.results.secretsFound.push({
            file,
            type: pattern.name,
            count: matches.length,
          });
        }
      }
    }

    if (this.results.secretsFound.length > 0) {
      this.results.recommendations.push({
        category: 'security',
        priority: 'critical',
        message: `Found ${this.results.secretsFound.length} potential secrets in code. Use environment variables.`,
      });
    }
  }

  async checkInsecurePatterns(): Promise<void> {
    const insecurePatterns = [
      { name: 'eval() usage', regex: /\beval\s*\(/g, severity: 'high' },
      {
        name: 'child_process exec',
        regex: /require\(['"]child_process['"]\)\.exec/g,
        severity: 'medium',
      },
      { name: 'Insecure randomness', regex: /Math\.random\(\)/g, severity: 'low' },
      {
        name: 'SQL concatenation',
        regex: /SELECT.*\+.*FROM|INSERT.*\+.*VALUES/gi,
        severity: 'high',
      },
    ];

    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      for (const pattern of insecurePatterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          this.results.insecurePatterns.push({
            file,
            pattern: pattern.name,
            severity: pattern.severity,
            occurrences: matches.length,
          });
        }
      }
    }
  }

  async runESLintSecurity(): Promise<void> {
    // Would integrate with eslint-plugin-security
  }

  calculateScore(): void {
    let score = 100;
    const vulns = this.results.vulnerabilities;

    if (vulns?.total && vulns.total > 0) {
      score -= vulns.critical * 15;
      score -= vulns.high * 10;
      score -= vulns.moderate * 5;
      score -= vulns.low * 2;
    }

    score -= this.results.secretsFound.length * 10;

    for (const pattern of this.results.insecurePatterns) {
      if (pattern.severity === 'high') score -= 8;
      else if (pattern.severity === 'medium') score -= 5;
      else score -= 2;
    }

    this.results.score = Math.max(0, Math.min(100, score));
  }
}
