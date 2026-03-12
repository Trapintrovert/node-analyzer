export function generateClusteringCode(): string {
  return `
// Using Node.js cluster module
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(\`Master process starting \${numCPUs} workers\`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(\`Worker \${worker.process.pid} died. Starting new worker...\`);
    cluster.fork();
  });
} else {
  // Your Express app here
  require('./app.js');
}

// Or use PM2 (simpler)
// pm2 start app.js -i max
`;
}

export function generateAsyncRefactoringExample(): string {
  return `
// ❌ BAD: Synchronous (blocks event loop)
const data = fs.readFileSync('large-file.json', 'utf8');
const parsed = JSON.parse(data);
processData(parsed);

// ✅ GOOD: Asynchronous
const data = await fs.promises.readFile('large-file.json', 'utf8');
const parsed = JSON.parse(data);
await processData(parsed);

// ✅ BETTER: Worker thread for CPU-intensive
const { Worker } = require('worker_threads');
const worker = new Worker('./data-processor.js', { workerData: filepath });
worker.on('message', (result) => {
  console.log('Processing complete:', result);
});
`;
}

export function generateWorkerThreadExample(): string {
  return `
// main.js
const { Worker } = require('worker_threads');

function runHeavyTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data
    });
    
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(\`Worker stopped with exit code \${code}\`));
      }
    });
  });
}

// worker.js
const { parentPort, workerData } = require('worker_threads');

// Heavy computation here
const result = performComplexCalculation(workerData);

parentPort.postMessage(result);
`;
}

export function generateDataLoaderExample(): string {
  return `
// Install: npm install dataloader
const DataLoader = require('dataloader');

// Create batch loader
const userLoader = new DataLoader(async (userIds) => {
  // Single query instead of N queries
  const users = await User.find({ _id: { \\$in: userIds } });
  
  // Return in same order as requested
  return userIds.map(id => users.find(user => user.id === id));
});

// Usage in resolver/route
app.get('/posts', async (req, res) => {
  const posts = await Post.find();
  
  // Instead of N+1 queries:
  // posts.forEach(post => post.author = await User.findById(post.authorId))
  
  // Use DataLoader:
  for (const post of posts) {
    post.author = await userLoader.load(post.authorId);
  }
  
  res.json(posts);
});
`;
}

export function generateParallelQueryExample(): string {
  return `
// ❌ BAD: Sequential (slow)
const user = await User.findById(userId);
const posts = await Post.find({ authorId: userId });
const comments = await Comment.find({ authorId: userId });
// Total time: 300ms + 200ms + 150ms = 650ms

// ✅ GOOD: Parallel (fast)
const [user, posts, comments] = await Promise.all([
  User.findById(userId),
  Post.find({ authorId: userId }),
  Comment.find({ authorId: userId })
]);
// Total time: max(300ms, 200ms, 150ms) = 300ms (2x faster!)
`;
}

export function generateConnectionPoolExample(): string {
  return `
// MongoDB with connection pooling
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  poolSize: 10, // Maintain up to 10 socket connections
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});

// PostgreSQL with connection pooling
const { Pool } = require('pg');
const pool = new Pool({
  user: 'dbuser',
  host: 'database.server.com',
  database: 'mydb',
  password: process.env.DB_PASSWORD,
  port: 5432,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Usage
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
`;
}

export function generateRateLimitExample(): string {
  return `
// Install: npm install express-rate-limit redis
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis();

// Create rate limiter
const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate-limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all routes
app.use('/api/', limiter);

// Or specific routes
app.post('/api/auth/login', 
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // Stricter for login
  loginHandler
);
`;
}

export function generateCachingExample(): string {
  return `
// Install: npm install redis
const Redis = require('ioredis');
const redis = new Redis();

// Caching middleware
const cache = (duration) => async (req, res, next) => {
  const key = \`cache:\${req.originalUrl}\`;
  
  try {
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    console.error('Cache error:', err);
  }
  
  // Store original res.json
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    redis.setex(key, duration, JSON.stringify(data))
      .catch(err => console.error('Cache set error:', err));
    return originalJson(data);
  };
  
  next();
};

// Usage
app.get('/api/products', cache(300), async (req, res) => {
  const products = await Product.find();
  res.json(products); // Cached for 5 minutes
});
`;
}

export function generateCompressionExample(): string {
  return `
// Install: npm install compression
const compression = require('compression');

app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// This automatically compresses all responses with gzip/deflate
// Reduces bandwidth by 70-90% for JSON/HTML
`;
}

export function generateQueueExample(): string {
  return `
// Install: npm install bullmq ioredis
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis();

// Create queue
const emailQueue = new Queue('email', { connection });

// Add job to queue (from your API)
app.post('/api/signup', async (req, res) => {
  const user = await User.create(req.body);
  
  // Instead of sending email immediately (slow):
  // await sendWelcomeEmail(user.email);
  
  // Add to queue (fast):
  await emailQueue.add('welcome', {
    email: user.email,
    name: user.name
  });
  
  res.json({ success: true });
});

// Worker process (separate from API)
const worker = new Worker('email', async (job) => {
  if (job.name === 'welcome') {
    await sendWelcomeEmail(job.data.email, job.data.name);
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(\`Job \${job.id} completed\`);
});
`;
}

export function generateMonitoringExample(): string {
  return `
// Install: npm install prom-client express-prom-bundle
const promClient = require('prom-client');
const promBundle = require('express-prom-bundle');

// Enable default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics();

// Add automatic request metrics
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'myapp' },
  promClient: { collectDefaultMetrics: {} }
});

app.use(metricsMiddleware);

// Custom metrics
const orderCounter = new promClient.Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status']
});

const responseTime = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Usage
app.post('/api/orders', async (req, res) => {
  const end = responseTime.startTimer();
  
  try {
    const order = await createOrder(req.body);
    orderCounter.inc({ status: 'success' });
    res.json(order);
  } catch (error) {
    orderCounter.inc({ status: 'failed' });
    res.status(500).json({ error: error.message });
  } finally {
    end({ method: req.method, route: req.route.path, status_code: res.statusCode });
  }
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
`;
}

export function generateMicroservicesArchitecture(): string {
  return `
Current Monolith:
┌─────────────────────────────────┐
│     Single Node.js App          │
│  ┌──────────┬──────────────┐   │
│  │   API    │  Heavy Compute│   │
│  │  Routes  │  Operations   │   │
│  └──────────┴──────────────┘   │
│         │                       │
│    ┌────▼────┐                 │
│    │Database │                 │
│    └─────────┘                 │
└─────────────────────────────────┘

Recommended Microservices:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  API Gateway │  │Auth Service  │  │ Worker Queue │
│  (Load Bal.) │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
┌──────▼─────────────────▼─────────────────▼────────┐
│               Message Bus (Redis/RabbitMQ)        │
└───────┬────────────────┬─────────────────┬────────┘
        │                │                 │
┌───────▼──────┐ ┌──────▼────────┐ ┌──────▼────────┐
│User Service  │ │Order Service  │ │Email Service  │
│              │ │               │ │               │
│ ┌──────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │
│ │User DB   │ │ │ │Order DB   │ │ │ │Queue      │ │
│ └──────────┘ │ │ └───────────┘ │ │ └───────────┘ │
└──────────────┘ └───────────────┘ └───────────────┘

Benefits:
- Independent scaling
- Fault isolation
- Technology flexibility
- Team autonomy
`;
}

export function generateDatabaseScalingArchitecture(): string {
  return `
Phase 1: Add Caching
┌─────────┐
│   App   │
└────┬────┘
     │
┌────▼─────┐
│  Redis   │ ◄── Cache frequent queries
│  Cache   │
└────┬─────┘
     │ (on cache miss)
┌────▼─────┐
│ Database │
└──────────┘

Phase 2: Read Replicas
┌─────────┐
│   App   │
└─┬─────┬─┘
  │     │
  │     └──────────┐
  │                │
┌─▼─────┐    ┌────▼────┐
│Primary│───▶│ Replica │
│(Write)│    │ (Read)  │
└───────┘    └─────────┘

Phase 3: Sharding
┌─────────────┐
│ App Router  │
└──┬──┬────┬──┘
   │  │    │
┌──▼──▼────▼──┐
│Shard by User│
│   ID hash   │
└──┬──┬────┬──┘
   │  │    │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│DB 1 │ │DB 2 │ │DB 3 │
│0-333│ │334- │ │667- │
│     │ │666  │ │999  │
└─────┘ └─────┘ └─────┘
`;
}
