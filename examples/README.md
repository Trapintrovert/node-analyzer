# Example Test Project

This folder contains a sample NodeJS project that you can use to test the analyzer.

## What's Inside

The example project intentionally contains various issues to demonstrate the analyzer's capabilities:

### Good Practices ✅
- Uses Express.js
- Has some async/await patterns
- Includes basic error handling
- Has a package.json

### Issues to Detect ❌
- Synchronous file operations
- N+1 query pattern
- Missing rate limiting
- No clustering
- Outdated dependencies
- Missing test coverage
- High complexity functions
- Memory leak risks

## How to Use

### 1. Test the Analyzer on This Example
```bash
# From the analyzer root directory (build first if needed)
npm run build
node dist/cli.js examples/sample-project
```

### 2. Expected Results
You should see:
- Overall score: 50-60 (intentionally low)
- Multiple security warnings
- Performance bottlenecks
- Scaling recommendations

### 3. Fix Issues and Re-Test
Try fixing some issues and run again to see score improve!

## Files Included

```
examples/sample-project/
├── package.json          # With some outdated dependencies
├── index.js              # Main app with various issues
└── config.json           # Configuration file
```

## Try These Scenarios

### Scenario 1: Security Focus
```bash
node dist/cli.js examples/sample-project --no-performance --no-quality
```
Expected: Security warnings about missing rate limiting

### Scenario 2: Performance Focus  
```bash
node dist/cli.js examples/sample-project --no-security --no-quality
```
Expected: Warnings about sync operations and blocking code

### Scenario 3: Scaling Analysis
```bash
node dist/cli.js examples/sample-project --no-security --no-quality --no-performance
```
Expected: Recommendations for clustering and load balancing

## Learning Exercises

### Exercise 1: Fix Sync Operations
1. Find synchronous file operations in the code
2. Convert them to async/await
3. Run analyzer again
4. See performance score improve!

### Exercise 2: Add Rate Limiting
1. Install express-rate-limit
2. Add to the Express app
3. Run analyzer again
4. See security score improve!

### Exercise 3: Implement Clustering
1. Use the code example from analyzer recommendations
2. Add cluster.js wrapper
3. Run analyzer again
4. See scaling score improve!

## Expected Analysis Output

```
Overall Score: 55/100

⚠️ Dependencies: 75
   - 5 outdated packages
   
🚨 Security: 40
   - No rate limiting
   - Missing security headers
   
⚠️ Quality: 60
   - No tests found
   - High complexity in 3 files
   
🚨 Performance: 45
   - 8 synchronous operations
   - 3 memory leak risks
   
🔥 Scaling: 30
   - Single instance
   - No load balancer
   - Database not optimized
```

This is the perfect project to learn how the analyzer works!
