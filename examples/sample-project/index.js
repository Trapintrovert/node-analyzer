const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

// ❌ Issue: No rate limiting
// ❌ Issue: No clustering
// ❌ Issue: Synchronous operations

// Simulated database (in real app, use MongoDB/PostgreSQL)
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' }
];

const posts = [
  { id: 1, userId: 1, title: 'First Post', content: 'Hello World' },
  { id: 2, userId: 1, title: 'Second Post', content: 'More content' },
  { id: 3, userId: 2, title: 'Bob\'s Post', content: 'Hi there' }
];

// ❌ Issue: Synchronous file read (blocks event loop)
app.get('/api/config', (req, res) => {
  try {
    const configData = fs.readFileSync('./config.json', 'utf8');
    res.json(JSON.parse(configData));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// ❌ Issue: N+1 query pattern (in loop)
app.get('/api/posts-with-authors', async (req, res) => {
  const postsWithAuthors = [];
  
  // Bad: Makes one query per post
  for (const post of posts) {
    // Simulating database query
    const author = users.find(u => u.id === post.userId);
    postsWithAuthors.push({
      ...post,
      author
    });
  }
  
  res.json(postsWithAuthors);
});

// ❌ Issue: Sequential queries (should be parallel)
app.get('/api/dashboard/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  // Bad: These could run in parallel
  const user = await findUser(userId);
  const userPosts = await findPostsByUser(userId);
  const postCount = await countPosts(userId);
  
  res.json({ user, posts: userPosts, totalPosts: postCount });
});

// ❌ Issue: Large function with high complexity
app.post('/api/process-data', (req, res) => {
  const data = req.body;
  let result = 0;
  
  // Complex nested logic
  if (data.type === 'A') {
    if (data.subtype === 'A1') {
      for (let i = 0; i < data.values.length; i++) {
        if (data.values[i] > 10) {
          if (data.values[i] % 2 === 0) {
            result += data.values[i] * 2;
          } else {
            result += data.values[i] * 3;
          }
        } else if (data.values[i] > 5) {
          result += data.values[i];
        } else {
          result -= data.values[i];
        }
      }
    } else if (data.subtype === 'A2') {
      // More complex logic
      for (let i = 0; i < data.values.length; i++) {
        if (data.condition === 'X') {
          result += data.values[i] * 4;
        } else if (data.condition === 'Y') {
          result += data.values[i] * 5;
        }
      }
    }
  } else if (data.type === 'B') {
    // Even more nested conditions
    if (data.flag) {
      for (let val of data.values) {
        if (val > 100) {
          result += val;
        }
      }
    }
  }
  
  res.json({ result });
});

// ❌ Issue: Memory leak risk (event listener without cleanup)
app.get('/api/watch-file', (req, res) => {
  const watcher = fs.watch('./data.txt', (eventType, filename) => {
    console.log(`File ${filename} changed: ${eventType}`);
  });
  
  // Bad: Never call watcher.close()
  res.json({ message: 'Watching file' });
});

// ❌ Issue: CPU-intensive operation in main thread
app.get('/api/fibonacci/:n', (req, res) => {
  const n = parseInt(req.params.n);
  
  // Bad: Blocks event loop for large n
  function fibonacci(num) {
    if (num <= 1) return num;
    return fibonacci(num - 1) + fibonacci(num - 2);
  }
  
  const result = fibonacci(n);
  res.json({ result });
});

// ❌ Issue: Unhandled promise
app.get('/api/external-data', (req, res) => {
  fetchExternalAPI()
    .then(data => res.json(data));
    // Bad: No .catch() handler
});

// ❌ Issue: console.log statements (should use logger)
app.get('/api/users', (req, res) => {
  console.log('Fetching users');
  console.log('User count:', users.length);
  console.log('Timestamp:', Date.now());
  
  res.json(users);
});

// Helper functions to simulate async DB operations
function findUser(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(users.find(u => u.id === id));
    }, 100);
  });
}

function findPostsByUser(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(posts.filter(p => p.userId === userId));
    }, 100);
  });
}

function countPosts(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(posts.filter(p => p.userId === userId).length);
    }, 50);
  });
}

function fetchExternalAPI() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve({ data: 'success' });
      } else {
        reject(new Error('API failed'));
      }
    }, 200);
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
