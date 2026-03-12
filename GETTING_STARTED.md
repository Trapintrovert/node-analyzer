# Quick Start Guide - NodeJS Analyzer

## Installation & Setup

### Prerequisites
- Node.js 18+ installed
- npm

### Step 1: Install Dependencies
```bash
npm install
```

This will install all required packages:
- chalk (colored terminal output)
- commander (CLI parsing)
- ora (loading spinners)
- table (formatted tables)
- glob (file pattern matching)
- fs-extra (enhanced file operations)

### Step 2: Build
```bash
npm run build
```

This compiles the TypeScript source into `dist/` using tsup.

### Step 3: Run
```bash
# Analyze the current project
npm start

# Or analyze a specific project
node dist/cli.js /path/to/your/project
```

You should see the analysis running with spinners, followed by a formatted report.

---

## Basic Usage

### Analyze a Project
```bash
# Analyze current directory
npm start

# Analyze specific project
node dist/cli.js /path/to/your/nodejs/project

# Save report to custom file
node dist/cli.js /path/to/project -o my-report.json
```

### Command Options
```bash
node dist/cli.js [project-path] [options]

Options:
  -o, --output <file>      Output report file (default: "analysis-report.json")
  --no-performance         Skip performance analysis
  --no-security            Skip security analysis
  --no-quality             Skip code quality analysis
  --no-scaling             Skip scaling analysis
  --threshold <score>      Minimum passing score 0-100 (default: "70")
  -h, --help               Display help
```

### Examples

**Quick analysis (skip some categories):**
```bash
node dist/cli.js ./my-app --no-performance --no-quality
```

**Production check (strict threshold):**
```bash
node dist/cli.js ./my-app --threshold 85
```

**Security-focused scan:**
```bash
node dist/cli.js ./my-app --no-performance --no-quality -o security-report.json
```

**Complete analysis with custom output:**
```bash
node dist/cli.js ./my-app -o reports/full-analysis-$(date +%Y%m%d).json
```

---

## Development

### Available Scripts

```bash
npm run build      # Compile TypeScript with tsup → dist/
npm start          # Run the analyzer on current directory
npm test           # Run the test suite (81 tests)
npm run lint       # Lint source files with ESLint
npm run lint:fix   # Lint and auto-fix issues
npm run dev        # Build and run in one step
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npx jest --coverage

# Run a specific test file
npx jest src/__tests__/quality-analyzer.test.ts
```

---

## Understanding the Output

### Console Output Structure

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

📦 Dependencies Analysis
  • Outdated Packages: 1
  • Circular Dependencies: 0
  • Unused Dependencies: 5

🔒 Security Analysis
  ✓ No known vulnerabilities found
  • Secrets in Code: 0
  • Insecure Patterns: 3

📊 Code Quality Analysis
  • Average Complexity: 26.92
  • High Complexity Files: 1
  • Lint Issues: 0
  • Code Smells: 4
  • Test Files: 6
  • Estimated Coverage: 54.55%

⚡ Performance Analysis
  • Bundle Size: 186.42 KB
  • Memory Leak Risks: 5
  • Async Functions: 10
  • Unhandled Promises: 1

📈 Scaling Analysis
  ⚠️ Scaling Urgency: MEDIUM
  • Bottlenecks Found: 2

💡 Recommendations
  📌 Medium Priority:
     • 1 files have high complexity. Consider refactoring.
  💭 Low Priority:
     • 5 potentially unused dependencies found. Consider removing.

✅ Analysis passed! Score: 73/100
```

### JSON Report Structure

The JSON report (`analysis-report.json`) contains:
```json
{
  "projectPath": "/path/to/project",
  "timestamp": "2026-03-12T...",
  "overallScore": 73,
  "dependencies": { "score": 93, ... },
  "security": { "score": 82, ... },
  "quality": { "score": 77, ... },
  "performance": { "score": 83, ... },
  "scaling": { "score": 80, ... },
  "recommendations": [...]
}
```

---

## What Gets Analyzed

### 1. Dependencies (20% of score)
- Outdated packages (npm outdated)
- Circular dependencies
- Unused dependencies

### 2. Security (25% of score)
- Known vulnerabilities in dependencies
- Hardcoded secrets (API keys, passwords)
- Insecure patterns (eval, SQL injection risks)

### 3. Code Quality (20% of score)
- Cyclomatic complexity
- Test coverage estimation
- ESLint configuration
- Code smells (large files, debug statements)

### 4. Performance (20% of score)
- Bundle size
- Synchronous blocking operations
- Memory leak risks
- Async patterns

### 5. Scaling Readiness (15% of score)
- Infrastructure setup
- Clustering capability
- Database optimization
- API scalability
- Load handling capacity

---

## Common Workflows

### Pre-Deployment Check
```bash
# Ensure quality before deploying
node dist/cli.js ./my-app --threshold 80
# Exit code 1 if score is below threshold
```

### Security Audit
```bash
node dist/cli.js ./my-app --no-performance --no-quality -o security-audit.json
```

### Performance Optimization
```bash
node dist/cli.js ./my-app --no-security --no-quality -o performance-report.json
```

### CI/CD Integration
```yaml
# .github/workflows/quality-check.yml
- name: Code Quality Check
  run: |
    npm install
    npm run build
    node dist/cli.js . --threshold 75
```

---

## Troubleshooting

### Issue: "Cannot find module 'chalk'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Analysis takes too long
```bash
node dist/cli.js . --no-quality --no-performance
```

### Issue: "Permission denied" on Linux/Mac
```bash
chmod +x dist/cli.js
./dist/cli.js /path/to/project
```

### Issue: Score is lower than expected
- Review each category's detailed output
- Focus on critical/high priority items first
- Check `analysis-report.json` for full details

---

## Additional Documentation

- `README.md` - Main project documentation
- `PROJECT_STRUCTURE.md` - Detailed file layout
- `docs/SCALING_ANALYZER_GUIDE.md` - Scaling analysis deep dive
- `docs/ENTERPRISE_ROADMAP.md` - Enterprise features roadmap
- `pipeline-flow-diagram.html` - Visual pipeline (open in browser)
- `USAGE_EXAMPLES.sh` - More usage examples
