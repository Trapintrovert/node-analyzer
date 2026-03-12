#!/bin/bash

# NodeJS Application Analyzer - Usage Examples

echo "=================================================="
echo "NodeJS Application Analyzer - Usage Examples"
echo "=================================================="
echo ""

# Example 1: Build and run
echo "1. Build and Analyze (current directory):"
echo "   $ npm run build && npm start"
echo ""

# Example 2: Analyze specific project
echo "2. Analyze Specific Project:"
echo "   $ node dist/cli.js /path/to/your/nodejs/project"
echo ""

# Example 3: Custom output file
echo "3. Custom Output Report:"
echo "   $ node dist/cli.js ./my-app -o my-custom-report.json"
echo ""

# Example 4: Skip specific analyzers
echo "4. Skip Performance Analysis:"
echo "   $ node dist/cli.js --no-performance"
echo ""

# Example 5: Set custom threshold
echo "5. Custom Quality Threshold:"
echo "   $ node dist/cli.js --threshold 80"
echo ""

# Example 6: Run tests
echo "6. Run Test Suite:"
echo "   $ npm test"
echo ""

# Example 7: Lint source code
echo "7. Lint TypeScript Source:"
echo "   $ npm run lint"
echo "   $ npm run lint:fix    # auto-fix issues"
echo ""

# Example 8: CI/CD Integration
echo "8. CI/CD Pipeline (fails if score < 70):"
cat << 'EOF'
   # .github/workflows/analyze.yml
   jobs:
     analyze:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: '18'
         - name: Install Dependencies
           run: npm install
         - name: Build
           run: npm run build
         - name: Run Analysis
           run: node dist/cli.js --threshold 70
EOF
echo ""

# Example 9: Combined options
echo "9. Combined Options:"
echo "   $ node dist/cli.js ./api --no-security --threshold 85 -o api-report.json"
echo ""

# Example 10: Analyze sample project
echo "10. Test with Sample Project:"
echo "    $ node dist/cli.js examples/sample-project"
echo ""

# Available scripts
echo "=================================================="
echo "Available npm Scripts:"
echo "=================================================="
echo "  npm run build      Build TypeScript with tsup"
echo "  npm start          Run the analyzer"
echo "  npm test           Run test suite (81 tests)"
echo "  npm run lint       Lint source files"
echo "  npm run lint:fix   Lint and auto-fix"
echo "  npm run dev        Build and run in one step"
echo ""

# What gets analyzed
echo "=================================================="
echo "What Gets Analyzed:"
echo "=================================================="
echo "  Dependencies: outdated packages, circular deps, unused"
echo "  Security: vulnerabilities, secrets, insecure patterns"
echo "  Quality: complexity, tests, linting, code smells"
echo "  Performance: bundle size, async patterns, memory leaks"
echo "  Scaling: bottlenecks, load capacity, infrastructure"
echo ""

echo "View the pipeline diagram: open pipeline-flow-diagram.html"
