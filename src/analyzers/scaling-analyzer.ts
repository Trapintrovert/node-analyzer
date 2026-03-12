import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { globSync } from 'glob';
import type { ScalingResult, ScalingUrgency } from '../types';
import {
  generateClusteringCode,
  generateAsyncRefactoringExample,
  generateWorkerThreadExample,
  generateDataLoaderExample,
  generateParallelQueryExample,
  generateConnectionPoolExample,
  generateRateLimitExample,
  generateCachingExample,
  generateCompressionExample,
  generateQueueExample,
  generateMonitoringExample,
  generateMicroservicesArchitecture,
  generateDatabaseScalingArchitecture,
} from './scaling-examples';

interface ScalingRecommendation {
  category: string;
  priority: string;
  type?: string;
  reason: string;
  solution: {
    immediate?: string;
    shortTerm?: string;
    longTerm?: string;
    code?: string;
    library?: string;
    useCase?: string[];
    whenNeeded?: string;
    architecture?: string;
    architectureDiagram?: string;
  };
  estimatedCost?: Record<string, string>;
  estimatedEffort?: string;
  expectedImprovement?: string;
  preventsCosts?: string;
  whenToScale?: Record<string, string>;
}

interface AppCapacity {
  syncOperations?: number;
  blockingOperations?: number;
}

export class ScalingAnalyzer {
  projectPath: string;
  results: ScalingResult & {
    currentCapacity: Record<string, unknown>;
    projectedLoad?: {
      currentCapacity?: number;
      scalingTriggers?: Record<string, { threshold: string; action: string }>;
      growthScenarios?: Record<string, { expectedRPS: number; action: string }>;
    };
    scalingRecommendations?: ScalingRecommendation[];
    estimatedCosts?: Record<string, { total: string; development?: string; infrastructure?: string }>;
  };

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.results = {
      score: 100,
      scalingNeeded: false,
      urgency: 'none',
      currentCapacity: {},
      bottlenecks: [],
      scalingRecommendations: [],
      recommendations: [],
    };
  }

  async analyze(): Promise<ScalingResult> {
    const spinner = ora('Analyzing scaling requirements...').start();

    try {
      await this.analyzeInfrastructure();
      await this.analyzeApplicationMetrics();
      await this.analyzeDatabaseScaling();
      await this.analyzeAPIEndpoints();
      await this.analyzeConcurrencyPatterns();
      await this.analyzeResourceUtilization();
      await this.predictFutureLoad();
      await this.generateScalingPlan();

      this.calculateScore();
      spinner.succeed(chalk.green('Scaling analysis complete'));
    } catch (error) {
      spinner.fail(chalk.red('Scaling analysis failed'));
      console.error((error as Error).message);
    }

    return this.results;
  }

  async analyzeInfrastructure(): Promise<void> {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = (await fs.readJson(packageJsonPath)) as {
      dependencies?: Record<string, string>;
    };

    const infraFiles = {
      docker: fs.existsSync(path.join(this.projectPath, 'Dockerfile')),
      dockerCompose: fs.existsSync(path.join(this.projectPath, 'docker-compose.yml')),
      kubernetes:
        fs.existsSync(path.join(this.projectPath, 'k8s')) ||
        fs.existsSync(path.join(this.projectPath, 'kubernetes')),
      terraform: fs.existsSync(path.join(this.projectPath, 'terraform')),
      helm: fs.existsSync(path.join(this.projectPath, 'charts')),
    };

    this.results.currentCapacity.infrastructure = infraFiles;

    const usesClustering = this.checkForClustering(packageJson);

    if (!usesClustering && !infraFiles.kubernetes) {
      this.results.bottlenecks.push({
        type: 'infrastructure',
        severity: 'high',
        issue: 'Single-instance deployment',
        impact: 'Cannot handle concurrent load, single point of failure',
        currentState: 'Running on single process',
        recommendation: 'Implement clustering or container orchestration',
      });

      this.results.scalingRecommendations!.push({
        category: 'infrastructure',
        priority: 'high',
        type: 'horizontal',
        reason: 'Application runs on single instance',
        solution: {
          immediate: 'Use PM2 cluster mode or Node.js cluster module',
          shortTerm: 'Deploy with Docker Compose (2-3 replicas)',
          longTerm: 'Migrate to Kubernetes with HPA (Horizontal Pod Autoscaler)',
          code: generateClusteringCode(),
        },
        estimatedCost: {
          immediate: '$0 (code change only)',
          shortTerm: '$50-100/month (additional instances)',
          longTerm: '$300-500/month (managed Kubernetes)',
        },
      });
    }

    const hasLoadBalancer = this.checkForLoadBalancer();
    if (!hasLoadBalancer && usesClustering) {
      this.results.bottlenecks.push({
        type: 'infrastructure',
        severity: 'medium',
        issue: 'No load balancer detected',
        impact: 'Traffic not distributed across instances',
        recommendation: 'Add nginx or cloud load balancer',
      });
    }
  }

  async analyzeApplicationMetrics(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/test/**', '**/__tests__/**', '**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
    });

    let totalEndpoints = 0;
    let syncOperations = 0;
    let blockingOperations = 0;
    let heavyComputations = 0;

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      const routePatterns = content.match(/\.(get|post|put|delete|patch)\s*\(/g);
      if (routePatterns) totalEndpoints += routePatterns.length;

      const syncFileOps = content.match(/fs\.(readFileSync|writeFileSync|existsSync)/g);
      if (syncFileOps) syncOperations += syncFileOps.length;

      const cpuIntensive = content.match(/(JSON\.parse|JSON\.stringify)\([^)]{100,}\)/g);
      if (cpuIntensive) heavyComputations += cpuIntensive.length;

      const largeLoops = content.match(/for\s*\([^)]+\)\s*{[\s\S]{200,}}/g);
      if (largeLoops) blockingOperations += largeLoops.length;
    }

    this.results.currentCapacity.application = {
      totalEndpoints,
      syncOperations,
      blockingOperations,
      heavyComputations,
      largeDataProcessing: 0,
    };

    if (syncOperations > 10) {
      this.results.bottlenecks.push({
        type: 'application',
        severity: 'high',
        issue: `${syncOperations} synchronous file operations found`,
        impact: 'Blocks event loop, reduces throughput by 60-80%',
        currentState: 'Estimated: ~100 req/sec',
        recommendation: 'Convert to async operations or offload to worker threads',
      });

      this.results.scalingRecommendations!.push({
        category: 'application',
        priority: 'critical',
        type: 'vertical',
        reason: 'Synchronous operations blocking event loop',
        solution: {
          immediate: 'Refactor to async/await',
          shortTerm: 'Use worker threads for file I/O',
          longTerm: 'Implement message queue for heavy operations',
          code: generateAsyncRefactoringExample(),
        },
        expectedImprovement: '400% throughput increase',
        estimatedEffort: '2-4 developer days',
      });
    }

    if (heavyComputations > 15 || blockingOperations > 20) {
      this.results.bottlenecks.push({
        type: 'application',
        severity: 'high',
        issue: 'CPU-intensive operations in main thread',
        impact: 'High CPU usage, request queuing',
        currentState: 'Single-threaded processing',
        recommendation: 'Implement worker threads or microservices',
      });

      this.results.scalingRecommendations!.push({
        category: 'compute',
        priority: 'high',
        type: 'horizontal',
        reason: 'Heavy computational load',
        solution: {
          immediate: 'Use worker_threads module',
          shortTerm: 'Deploy dedicated worker service',
          longTerm: 'Split into microservices architecture',
          code: generateWorkerThreadExample(),
          architectureDiagram: generateMicroservicesArchitecture(),
        },
      });
    }
  }

  async analyzeDatabaseScaling(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    let dbQueries = 0;
    let nPlusOneRisks = 0;
    let sequentialQueries = 0;
    let largeJoins = 0;

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      const queries = content.match(/\.(find|findOne|findMany|query|exec|aggregate)\(/g);
      if (queries) dbQueries += queries.length;

      const loopsWithQueries = content.match(/for\s*\([^)]+\)\s*{[\s\S]*?\.(find|query)\(/g);
      if (loopsWithQueries) nPlusOneRisks += loopsWithQueries.length;

      const awaitInSequence = content.match(/await.*\n\s*await.*\n\s*await/g);
      if (awaitInSequence) sequentialQueries += awaitInSequence.length;

      const joins = content.match(/\.populate\([^)]+\)\.populate\(/g);
      if (joins) largeJoins += joins.length;
    }

    this.results.currentCapacity.database = {
      totalQueries: dbQueries,
      nPlusOneRisks,
      sequentialQueries,
      largeJoins,
    };

    if (nPlusOneRisks > 5) {
      this.results.bottlenecks.push({
        type: 'database',
        severity: 'critical',
        issue: `${nPlusOneRisks} potential N+1 query problems`,
        impact: 'Database becomes bottleneck at scale',
        recommendation: 'Implement eager loading and query batching',
      });

      this.results.scalingRecommendations!.push({
        category: 'database',
        priority: 'critical',
        type: 'optimization',
        reason: 'N+1 query pattern detected',
        solution: {
          immediate: 'Add DataLoader or query batching',
          shortTerm: 'Implement caching layer (Redis)',
          longTerm: 'Add read replicas with query routing',
          code: generateDataLoaderExample(),
        },
        expectedImprovement: '90% reduction in database load',
        estimatedCost: {
          immediate: '3-5 developer days',
          shortTerm: '$50/month (Redis cache)',
          longTerm: '$200-400/month (read replicas)',
        },
      });
    }

    if (sequentialQueries > 10) {
      this.results.bottlenecks.push({
        type: 'database',
        severity: 'high',
        issue: `${sequentialQueries} sequential query patterns`,
        impact: 'Increased response time, wasted waiting',
        recommendation: 'Parallelize independent queries',
      });

      this.results.scalingRecommendations!.push({
        category: 'database',
        priority: 'high',
        type: 'optimization',
        reason: 'Sequential queries causing delays',
        solution: {
          code: generateParallelQueryExample(),
        },
        expectedImprovement: '70% faster response time',
      });
    }

    const hasConnectionPool = await this.checkConnectionPooling();
    if (!hasConnectionPool) {
      this.results.bottlenecks.push({
        type: 'database',
        severity: 'high',
        issue: 'No connection pooling detected',
        impact: 'Connection overhead, potential connection exhaustion',
        recommendation: 'Implement connection pool',
      });

      this.results.scalingRecommendations!.push({
        category: 'database',
        priority: 'high',
        type: 'configuration',
        reason: 'Missing connection pool',
        solution: {
          code: generateConnectionPoolExample(),
        },
      });
    }

    if (dbQueries > 100) {
      this.results.scalingRecommendations!.push({
        category: 'database',
        priority: 'medium',
        type: 'horizontal',
        reason: 'High database query volume',
        solution: {
          immediate: 'Add Redis cache for frequent queries',
          shortTerm: 'Implement read replicas',
          longTerm: 'Consider database sharding',
          architecture: generateDatabaseScalingArchitecture(),
        },
        whenToScale: {
          cache: 'When same queries run > 100 times/min',
          readReplicas: 'When read/write ratio > 80/20',
          sharding: 'When single database > 100GB or > 10K QPS',
        },
      });
    }
  }

  async analyzeAPIEndpoints(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    const endpoints: Array<{ method: string; path: string; file: string }> = [];
    let rateLimitingFound = false;
    let cachingFound = false;
    let compressionFound = false;

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      const routeMatches = content.matchAll(/\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g);
      for (const match of routeMatches) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          file,
        });
      }

      if (content.includes('rate-limit') || content.includes('rateLimit')) {
        rateLimitingFound = true;
      }
      if (content.includes('cache') || content.includes('Cache-Control')) {
        cachingFound = true;
      }
      if (content.includes('compression') || content.includes('gzip')) {
        compressionFound = true;
      }
    }

    this.results.currentCapacity.api = {
      totalEndpoints: endpoints.length,
      hasRateLimiting: rateLimitingFound,
      hasCaching: cachingFound,
      hasCompression: compressionFound,
    };

    if (!rateLimitingFound && endpoints.length > 5) {
      this.results.bottlenecks.push({
        type: 'api',
        severity: 'high',
        issue: 'No rate limiting detected',
        impact: 'Vulnerable to abuse, potential DDoS, cost overruns',
        recommendation: 'Implement rate limiting per IP/user',
      });

      this.results.scalingRecommendations!.push({
        category: 'api',
        priority: 'high',
        type: 'protection',
        reason: 'Missing rate limiting',
        solution: {
          immediate: 'Add express-rate-limit middleware',
          shortTerm: 'Use Redis-based rate limiting for multi-instance',
          longTerm: 'Implement API gateway (Kong, Tyk)',
          code: generateRateLimitExample(),
        },
        preventsCosts: 'Up to $10,000/month in abuse scenarios',
      });
    }

    if (!cachingFound && endpoints.length > 10) {
      this.results.scalingRecommendations!.push({
        category: 'api',
        priority: 'medium',
        type: 'optimization',
        reason: 'No HTTP caching detected',
        solution: {
          immediate: 'Add Cache-Control headers',
          shortTerm: 'Implement Redis cache',
          longTerm: 'Add CDN (CloudFlare, Fastly)',
          code: generateCachingExample(),
        },
        expectedImprovement: '50-80% reduction in backend load',
      });
    }

    if (!compressionFound) {
      this.results.scalingRecommendations!.push({
        category: 'api',
        priority: 'low',
        type: 'optimization',
        reason: 'No response compression',
        solution: {
          code: generateCompressionExample(),
        },
        expectedImprovement: '70% bandwidth reduction',
      });
    }
  }

  async analyzeConcurrencyPatterns(): Promise<void> {
    const jsFiles = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    let promiseAllUsage = 0;
    let queueImplemented = false;

    for (const file of jsFiles) {
      const filePath = path.join(this.projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');

      const promiseAlls = content.match(/Promise\.all\(/g);
      if (promiseAlls) promiseAllUsage += promiseAlls.length;

      if (content.includes('Queue') || content.includes('bull') || content.includes('bee-queue')) {
        queueImplemented = true;
      }
    }

    this.results.currentCapacity.concurrency = {
      promiseAllUsage,
      queueImplemented,
    };

    if (!queueImplemented && promiseAllUsage < 5) {
      this.results.scalingRecommendations!.push({
        category: 'concurrency',
        priority: 'medium',
        type: 'architecture',
        reason: 'No async job queue detected',
        solution: {
          immediate: 'Implement background job processing',
          library: 'Bull, BullMQ, or Bee-Queue',
          useCase: [
            'Email sending',
            'Report generation',
            'Data processing',
            'External API calls',
            'Image processing',
          ],
          code: generateQueueExample(),
        },
        whenNeeded: 'When tasks take > 5 seconds or are not time-critical',
      });
    }
  }

  async analyzeResourceUtilization(): Promise<void> {
    this.results.currentCapacity.resources = {
      monitoring: 'Not detected - Recommendation: Add monitoring',
      recommendation: 'Implement Prometheus + Grafana or DataDog',
    };

    this.results.scalingRecommendations!.push({
      category: 'monitoring',
      priority: 'high',
      type: 'observability',
      reason: 'Cannot scale without metrics',
      solution: {
        immediate: 'Add basic logging with Winston/Pino',
        shortTerm: 'Implement Prometheus metrics',
        longTerm: 'Full observability stack (metrics, logs, traces)',
        code: generateMonitoringExample(),
      },
    });
  }

  async predictFutureLoad(): Promise<void> {
    const app = (this.results.currentCapacity.application || {}) as AppCapacity;

    const currentCapacity = {
      estimatedRPS: 100,
      maxRPS: 500,
    };

    if ((app.syncOperations ?? 0) > 5) {
      currentCapacity.maxRPS = 100;
    }

    if ((app.blockingOperations ?? 0) > 10) {
      currentCapacity.maxRPS = 50;
    }

    this.results.projectedLoad = {
      currentCapacity: currentCapacity.maxRPS,
      scalingTriggers: {
        immediate: {
          threshold: '> 50 requests/second',
          action: 'Optimize code (async operations)',
        },
        shortTerm: {
          threshold: '> 200 requests/second',
          action: 'Add horizontal scaling (2-3 instances)',
        },
        longTerm: {
          threshold: '> 1000 requests/second',
          action: 'Microservices + load balancer + cache',
        },
      },
      growthScenarios: {
        '2x users': {
          expectedRPS: currentCapacity.estimatedRPS * 2,
          action: this.getScalingAction(
            currentCapacity.estimatedRPS * 2,
            currentCapacity.maxRPS
          ),
        },
        '5x users': {
          expectedRPS: currentCapacity.estimatedRPS * 5,
          action: this.getScalingAction(
            currentCapacity.estimatedRPS * 5,
            currentCapacity.maxRPS
          ),
        },
        '10x users': {
          expectedRPS: currentCapacity.estimatedRPS * 10,
          action: this.getScalingAction(
            currentCapacity.estimatedRPS * 10,
            currentCapacity.maxRPS
          ),
        },
      },
    };
  }

  getScalingAction(projectedRPS: number, maxRPS: number): string {
    if (projectedRPS <= maxRPS * 0.7) {
      return 'Current capacity sufficient';
    } else if (projectedRPS <= maxRPS) {
      return 'Optimize code and add monitoring';
    } else if (projectedRPS <= maxRPS * 2) {
      return 'Add 2-3 instances + load balancer';
    } else if (projectedRPS <= maxRPS * 5) {
      return 'Full horizontal scaling + caching + CDN';
    } else {
      return 'Microservices architecture + distributed caching + API gateway';
    }
  }

  async generateScalingPlan(): Promise<void> {
    const urgency = this.calculateUrgency();
    this.results.urgency = urgency as ScalingUrgency;
    this.results.scalingNeeded = urgency !== 'none';

    const plan = {
      immediate: [] as Array<{ action: string; reason: string; category: string; effort?: string; impact?: string }>,
      shortTerm: [] as Array<{ action: string; reason: string; category: string; cost?: string }>,
      longTerm: [] as Array<{ action: string; reason: string; category: string; cost?: string }>,
    };

    const recommendations: ScalingRecommendation[] = this.results.scalingRecommendations || [];
    const critical = recommendations.filter((r) => r.priority === 'critical');
    const high = recommendations.filter((r) => r.priority === 'high');
    const medium = recommendations.filter((r) => r.priority === 'medium');

    plan.immediate = critical.map((r: ScalingRecommendation) => ({
      action: r.solution.immediate || '',
      reason: r.reason,
      category: r.category,
      effort: r.estimatedEffort || '1-2 days',
      impact: r.expectedImprovement || 'High',
    }));

    plan.shortTerm = high.map((r: ScalingRecommendation) => ({
      action: r.solution.shortTerm || r.solution.immediate || '',
      reason: r.reason,
      category: r.category,
      cost: r.estimatedCost?.shortTerm || 'TBD',
    }));

    plan.longTerm = [...high, ...medium]
      .map((r: ScalingRecommendation) => ({
        action: r.solution.longTerm || '',
        reason: r.reason,
        category: r.category,
        cost: r.estimatedCost?.longTerm || 'TBD',
      }))
      .filter((p) => p.action);

    this.results.scalingPlan = plan;

    this.results.estimatedCosts = this.calculateCostEstimates(plan);
  }

  calculateUrgency(): string {
    const criticalBottlenecks = this.results.bottlenecks.filter(
      (b) => b.severity === 'critical'
    ).length;
    const highBottlenecks = this.results.bottlenecks.filter(
      (b) => b.severity === 'high'
    ).length;

    if (criticalBottlenecks > 0) return 'critical';
    if (highBottlenecks >= 3) return 'high';
    if (highBottlenecks > 0) return 'medium';
    if (this.results.bottlenecks.length > 0) return 'low';
    return 'none';
  }

  calculateCostEstimates(
    _plan: { immediate: unknown[]; shortTerm: unknown[]; longTerm: unknown[] }
  ): Record<string, { total: string; development?: string; infrastructure?: string }> {
    return {
      immediate: {
        development: '5-10 developer days',
        infrastructure: '$0-50/month',
        total: '$2,000-4,000 one-time',
      },
      shortTerm: {
        development: '15-20 developer days',
        infrastructure: '$200-500/month',
        total: '$6,000-10,000 one-time + ongoing costs',
      },
      longTerm: {
        development: '1-2 developer months',
        infrastructure: '$500-2,000/month',
        total: '$20,000-40,000 one-time + ongoing costs',
      },
    };
  }

  calculateScore(): void {
    let score = 100;

    const criticalCount = this.results.bottlenecks.filter(
      (b) => b.severity === 'critical'
    ).length;
    score -= criticalCount * 20;

    const highCount = this.results.bottlenecks.filter(
      (b) => b.severity === 'high'
    ).length;
    score -= highCount * 10;

    const mediumCount = this.results.bottlenecks.filter(
      (b) => b.severity === 'medium'
    ).length;
    score -= mediumCount * 5;

    this.results.score = Math.max(0, Math.min(100, score));
  }

  checkForClustering(packageJson: { dependencies?: Record<string, string> }): boolean {
    const deps = Object.keys(packageJson.dependencies || {});
    return (
      deps.includes('pm2') ||
      deps.includes('cluster') ||
      deps.some((dep) => dep.includes('cluster'))
    );
  }

  checkForLoadBalancer(): boolean {
    return (
      fs.existsSync(path.join(this.projectPath, 'nginx.conf')) ||
      fs.existsSync(path.join(this.projectPath, 'haproxy.cfg'))
    );
  }

  async checkConnectionPooling(): Promise<boolean> {
    const files = globSync('**/*.{js,ts}', {
      cwd: this.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    });

    for (const file of files) {
      const content = await fs.readFile(
        path.join(this.projectPath, file),
        'utf8'
      );
      if (
        content.includes('pool') ||
        content.includes('poolSize') ||
        content.includes('connectionLimit')
      ) {
        return true;
      }
    }
    return false;
  }
}
