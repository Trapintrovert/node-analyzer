# nodejs-app-analyzer

[![npm version](https://img.shields.io/npm/v/nodejs-app-analyzer.svg)](https://www.npmjs.com/package/nodejs-app-analyzer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive CLI tool that analyzes NodeJS applications across **five categories** — security, performance, code quality, dependencies, and scaling readiness — and gives you an actionable score with prioritized recommendations.

## Installation

```bash
# Install globally
npm install -g nodejs-app-analyzer

# Or run directly with npx
npx nodejs-app-analyzer /path/to/your/project
```

## Quick Start

```bash
# Analyze the current directory
node-analyze

# Analyze a specific project
node-analyze /path/to/your/project

# Save report to a file
node-analyze ./my-app -o report.json

# Set a minimum passing score
node-analyze ./my-app --threshold 80
```

## Features

- **Security Analysis** — Vulnerability scanning, secret detection, insecure pattern identification
- **Performance Analysis** — Bundle size, memory leak risks, async patterns, blocking operations
- **Code Quality** — Cyclomatic complexity, test coverage estimation, ESLint detection, code smells
- **Dependency Analysis** — Outdated packages, circular dependencies, unused modules
- **Scaling Readiness** — Infrastructure bottlenecks, database optimization, API scalability, load projections

## Usage

```bash
node-analyze [project-path] [options]
```

### Options

| Option | Description | Default |
|---|---|---|
| `-o, --output <file>` | Output report file | `analysis-report.json` |
| `--no-performance` | Skip performance analysis | |
| `--no-security` | Skip security analysis | |
| `--no-quality` | Skip code quality analysis | |
| `--no-scaling` | Skip scaling analysis | |
| `--threshold <score>` | Minimum passing score (0-100) | `70` |
| `-h, --help` | Display help | |

### Examples

```bash
# Full analysis with strict threshold
node-analyze ./my-app --threshold 85

# Security-only scan
node-analyze ./my-app --no-performance --no-quality --no-scaling

# Skip slow analyses for quick feedback
node-analyze ./my-app --no-scaling --no-performance

# Custom report output
node-analyze ./my-app -o reports/audit-$(date +%Y%m%d).json
```

## Sample Output

```
🔍 NodeJS Application Analyzer

╔════════════════════════════════════════════════════════════╗
║           NodeJS Application Analysis Report              ║
╚════════════════════════════════════════════════════════════╝

Overall Score: 73/100

╔═══════════════════╤═══════╤═══════════╗
║ Category          │ Score │ Status    ║
╟───────────────────┼───────┼───────────╢
║ Dependencies      │ 93    │ ✓ Pass    ║
║ Security          │ 82    │ ✓ Pass    ║
║ Code Quality      │ 77    │ ⚠ Warning ║
║ Performance       │ 83    │ ✓ Pass    ║
║ Scaling Readiness │ 80    │ ✓ Pass    ║
╚═══════════════════╧═══════╧═══════════╝

💡 Recommendations

  🚨 Critical:
     • Found 2 potential secrets in code. Use environment variables.

  ⚠️  High Priority:
     • 12 potential memory leak risks detected.

  📌 Medium Priority:
     • 3 files have high complexity. Consider refactoring.
     • No ESLint configuration found. Add linting.

  💭 Low Priority:
     • 5 potentially unused dependencies found.

✅ Analysis passed! Score: 73/100
```

## Scoring System

Each category is scored from 0-100:

| Score | Status | Color |
|---|---|---|
| 80-100 | Pass | Green |
| 60-79 | Warning | Yellow |
| 0-59 | Fail | Red |

Overall score is a weighted average:

| Category | Weight |
|---|---|
| Security | 25% |
| Dependencies | 20% |
| Code Quality | 20% |
| Performance | 20% |
| Scaling | 15% |

## What It Analyzes

### Security
- Dependency vulnerabilities via `npm audit`
- Hardcoded secrets (API keys, passwords, JWT tokens, database URLs)
- Insecure patterns (`eval()`, SQL concatenation, `child_process.exec`)

### Performance
- Total bundle size and large file detection
- Heavy dependency identification (moment, lodash, etc.)
- Async/await vs callback pattern usage
- Memory leak risks (global variables, unclosed listeners, large closures)
- Synchronous blocking operations inside loops

### Code Quality
- Cyclomatic complexity per file
- Test file detection and coverage estimation
- ESLint configuration presence
- Code smells (oversized files, excessive debug statements)

### Dependencies
- Outdated packages with severity classification
- Circular dependency detection
- Unused dependency identification

### Scaling Readiness
- Infrastructure analysis (clustering, Docker, Kubernetes)
- Application bottlenecks (sync I/O, CPU-intensive operations)
- Database optimization (N+1 queries, connection pooling)
- API scalability (rate limiting, caching, compression)
- Concurrency patterns (Promise.all, worker threads, job queues)
- Load projections for 2x, 5x, 10x traffic growth

## CI/CD Integration

Use as a quality gate in your pipeline. The analyzer exits with code 1 if the score is below the threshold.

### GitHub Actions

```yaml
- name: Analyze Code Quality
  run: npx nodejs-app-analyzer --threshold 70
```

### GitLab CI

```yaml
code-analysis:
  script:
    - npx nodejs-app-analyzer --threshold 70
```

### Pre-commit Hook

```bash
# In package.json scripts
"precommit": "npx nodejs-app-analyzer --threshold 75"
```

## Output

The analyzer produces two outputs:

1. **Console Report** — Color-coded tables with scores, findings, and prioritized recommendations
2. **JSON Report** — Complete machine-readable analysis saved to `analysis-report.json` (or custom path via `-o`)

```json
{
  "projectPath": "/path/to/project",
  "timestamp": "2026-03-12T...",
  "overallScore": 73,
  "dependencies": { "score": 93, "outdated": [...], "unused": [...] },
  "security": { "score": 82, "vulnerabilities": {...}, "secretsFound": [...] },
  "quality": { "score": 77, "complexity": {...}, "codeSmells": [...] },
  "performance": { "score": 83, "bundleSize": {...}, "memoryLeakRisks": [...] },
  "scaling": { "score": 80, "bottlenecks": [...], "scalingPlan": {...} },
  "recommendations": [...]
}
```

## Requirements

- Node.js >= 18
- The target project must have a `package.json`

## Contributing

```bash
# Clone the repo
git clone https://github.com/your-username/nodejs-app-analyzer.git
cd nodejs-app-analyzer

# Install dependencies
npm install

# Build
npm run build

# Run tests (81 tests)
npm test

# Lint
npm run lint
```

## License

MIT
