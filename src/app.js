import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';               // NEW: npm i express-rate-limit
import { config } from './config/environment.js';
import router from './routes/index.js';
import aiRouter from './routes/ai.js';

const app = express();

// NEW: behind a proxy/load balancer, so req.ip and rate limits use the real client IP.
// "1" means one proxy hop. Adjust to match your setup, or remove if you're not behind one.
if (config.env === 'production') app.set('trust proxy', 1);

// CHANGED: only your apps' sites may call the API from a browser
app.use('/api/v1', cors({
  origin: config.allowedOrigins,       
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// CHANGED: explicit body limit (chat history can be large)
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.static('public'));      // serves /widget/ask-ai.js

// NEW: rate limit the ask endpoint (10 questions per minute per IP)
app.use('/api/v1/ask', rateLimit({
  windowMs: 60_000,
  limit: 10,                            // use `max: 10` on express-rate-limit versions before 7
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
}));

// Mount Routes
app.use(router);
app.use(aiRouter);

// 404 Fallback Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Resource Not Found' });
});

// CHANGED: consistent { error: "text" } shape, and no internal details on 5xx
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : err.message,
  });
});

app.listen(config.port, () => {
  console.log(`Server is running in ${config.env} mode on port ${config.port}`);
});