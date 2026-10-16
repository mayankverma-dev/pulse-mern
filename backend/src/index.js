const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/pulsemDB';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis-cache:6379';

// 1. Redis Client Setup
const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Error:', err));

// 2. Mongoose Schema
const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', TaskSchema);

// 3. Deep Health Check Endpoint for Docker HEALTHCHECK & Load Balancers
app.get('/api/health', async (req, res) => {
  const mongoHealthy = mongoose.connection.readyState === 1;
  const redisHealthy = redisClient.isOpen;

  if (mongoHealthy && redisHealthy) {
    return res.status(200).json({ status: 'UP', mongo: 'UP', redis: 'UP' });
  }
  return res.status(503).json({ status: 'DEGRADED', mongo: mongoHealthy, redis: redisHealthy });
});

// 4. API Routes with Redis Caching
app.get('/api/tasks', async (req, res) => {
  try {
    const cached = await redisClient.get('tasks_list');
    if (cached) {
      return res.json({ source: 'redis-cache', data: JSON.parse(cached) });
    }
    const tasks = await Task.find().sort({ createdAt: -1 });
    await redisClient.setEx('tasks_list', 60, JSON.stringify(tasks));
    res.json({ source: 'mongodb', data: tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const task = await Task.create({ title: req.body.title });
    await redisClient.del('tasks_list'); // Invalidate cache
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Startup & Graceful Shutdown (Critical for Zero-Downtime Rolling Updates)
let server;
async function bootstrap() {
  await mongoose.connect(MONGO_URI);
  await redisClient.connect();
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`API running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Closing HTTP server and DB connections...`);
  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      await redisClient.quit();
      console.log('Clean shutdown complete.');
      process.exit(0);
    });
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));