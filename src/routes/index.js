import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});


// Example API route
router.get('/api/v1/hello', (req, res) => {
  res.status(200).json({ message: 'Hello from your Node.js boilerplate!' });
});

export default router;
