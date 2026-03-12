# NodeJS Application Analyzer

A comprehensive CLI tool to analyze the performance, security, code quality, and **scaling readiness** of your NodeJS applications. Built with TypeScript, bundled with tsup.

## Features

- **Security Analysis**: Scan for vulnerabilities, exposed secrets, and insecure coding patterns
- **Performance Analysis**: Check bundle size, dependency weight, async patterns, and memory leak risks
- **Code Quality Analysis**: Measure complexity, test coverage, lint issues, and code smells
- **Dependency Analysis**: Identify outdated packages, circular dependencies, and unused modules
- **Scaling Analysis**: Detect infrastructure bottlenecks, predict load capacity, get actionable scaling recommendations

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Analyze a project
npm start                              # analyze current directory
node dist/cli.js /path/to/your/project # analyze a specific project
```

See `GETTING_STARTED.md` for detailed setup instructions.

---

## Usage

### Basic Usage

```bash
# Analyze the current directory
npm start

# Analyze a specific project
node dist/cli.js /path/to/your/project

# Save report to custom file
node dist/cli.js ./my-app -o my-analysis.json
```

### Options

```bash
node dist/cli.js [project-path] [options]

Options:
  -o, --output <file>      Output report file (default: "analysis-report.json")
  --no-performance         Skip performance analysis
  --no-security            Skip security analysis
  --no-quality             Skip code quality analysis
  --no-scaling             Skip scaling analysis
  --threshold <score>      Minimum passing score 0-100 (default: "70")
  -h, --help               Display help for command
```

### Examples

```bash
# Skip performance analysis
node dist/cli.js ./my-app --no-performance

# Set custom threshold
node dist/cli.js ./my-app --threshold 80

# Security-focused scan
node dist/cli.js ./my-app --no-performance --no-quality -o security-report.json
```

---

## Development

### Tech Stack

- **Language**: TypeScript
- **Build**: tsup (esbuild-based bundler)
- **Testing**: Jest with ts-jest
- **Linting**: ESLint with @typescript-eslint

### Scripts

```bash
npm run build      # Build with tsup → dist/
npm start          # Run the analyzer
npm test           # Run test suite (81 tests)
npm run lint       # Lint source files
npm run lint:fix   # Lint and auto-fix
npm run dev        # Build and run in one step
```

### Project Structure

```
nodejs-analyzer/
├── src/                          # TypeScript source
│   ├── cli.ts                    # CLI entry point
│   ├── analyzer.ts               # Main orchestrator
│   ├── report-generator.ts       # Report formatting
│   ├── types.ts                  # Shared type definitions
│   ├── globals.d.ts              # Module declarations
│   ├── __tests__/                # Test suite
│   │   ├── analyzer.test.ts
│   │   ├── dependency-analyzer.test.ts
│   │   ├── quality-analyzer.test.ts
│   │   ├── security-analyzer.test.ts
│   │   ├── performance-analyzer.test.ts
│   │   └── report-generator.test.ts
│   └── analyzers/                # Individual analyzers
│       ├── dependency-analyzer.ts
│       ├── security-analyzer.ts
│       ├── quality-analyzer.ts
│       ├── performance-analyzer.ts
│       ├── scaling-analyzer.ts
│       └── scaling-examples.ts   # Scaling code examples
├── dist/                         # Compiled output (after build)
├── docs/                         # Documentation
├── examples/                     # Sample project for testing
├── tsconfig.json                 # TypeScript configuration
├── tsup.config.ts                # tsup bundler configuration
├── jest.config.js                # Jest test configuration
├── .eslintrc.json                # ESLint configuration
└── package.json
```

---

## Output

The analyzer generates:
1. **Console Report**: Formatted output with scores, findings, and recommendations
2. **JSON Report**: Detailed analysis saved to the specified output file

### Sample Console Output

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
```

---

## Scoring System

Each category is scored from 0-100:
- **80-100**: Pass (Green)
- **60-79**: Warning (Yellow)
- **0-59**: Fail (Red)

Overall score is a weighted average:
- Security: 25%
- Dependencies: 20%
- Code Quality: 20%
- Performance: 20%
- Scaling: 15%

---

## What It Analyzes

### Security
- Dependency vulnerabilities (npm audit)
- Hardcoded secrets (API keys, passwords, tokens)
- Insecure patterns (eval, SQL injection risks)

### Performance
- Bundle size analysis
- Heavy dependency detection
- Async/await vs callback patterns
- Memory leak risks
- Blocking operations

### Code Quality
- Cyclomatic complexity
- Test coverage estimation
- ESLint configuration detection
- Code smells (large files, debug statements)

### Dependencies
- Outdated packages
- Circular dependencies
- Unused dependencies

### Scaling Readiness
- Infrastructure setup (clustering, load balancing)
- Application bottlenecks (sync operations, CPU-intensive tasks)
- Database optimization (N+1 queries, connection pooling)
- API scalability (rate limiting, caching, compression)
- Concurrency patterns (job queues, worker threads)
- Load projections (when to scale for 2x, 5x, 10x growth)

---

## CI/CD Integration

Use as a quality gate in your CI/CD:

```yaml
# GitHub Actions example
- name: Analyze Code
  run: |
    npm install
    npm run build
    node dist/cli.js --threshold 70
```

The analyzer exits with code 1 if the score is below the threshold.

---

## Documentation

- **`GETTING_STARTED.md`** - Installation and first steps
- **`PROJECT_STRUCTURE.md`** - Detailed project layout
- **`USAGE_EXAMPLES.sh`** - Command-line examples
- **`docs/SCALING_ANALYZER_GUIDE.md`** - Complete guide to scaling analysis
- **`docs/ENTERPRISE_ROADMAP.md`** - Enterprise features roadmap
- **`examples/README.md`** - Sample project for testing

---

## Requirements

- Node.js 18+
- npm

## License

MIT
