import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import logger from './utils/logger.js';
import apiRoutes from './routes/index.js';
import { requestLogger } from './middleware/loggerMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { apiRateLimiter } from './middleware/rateLimiterMiddleware.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security & Utility Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Avoid CSP blocking embedded YouTube & PDF viewers in production
}));
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom Request Logger
app.use(requestLogger);

// Dedicated Health Check Endpoint for Render / Cloud Load Balancers
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'Birrend Financial Escrow Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Favicon handler to avoid 404 log noise on backend
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve Frontend Vite Static Production Build if available with Cache-Control headers
const distPath = path.join(__dirname, '../../dist');
app.use(
  express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        // Prevent browser caching index.html so users always fetch latest JS bundle references
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.includes(path.join('assets', ''))) {
        // Hashed static assets can be safely cached long-term
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// API Base Route — general rate limit (300 requests / 15 min per IP)
app.use('/api/v1', apiRateLimiter, apiRoutes);

// Client SPA Single-Page App Fallback Route (Serves index.html for production non-API routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: { message: `API Endpoint ${req.method} ${req.originalUrl} not found.` },
    });
  }

  // Prevent serving index.html (text/html) for missing static assets (.css, .js, .png, etc.)
  if (/\.(css|js|map|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('Asset Not Found');
  }

  const indexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(indexPath, (err) => {
      if (err) next(err);
    });
  }

  // Graceful fallback if build is deploying or temporarily unavailable
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Birrend | Updating Application</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf9f5; color: #1b1c1a; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .card { background: #ffffff; padding: 2.5rem; border-radius: 1rem; border: 1px solid #e5e5e0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); max-width: 420px; }
          h2 { color: #ad5f45; margin-top: 0; font-size: 1.5rem; }
          p { color: #555; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
          button { background: #ad5f45; color: #ffffff; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
          button:hover { background: #964e37; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Birrend Application Updating</h2>
          <p>A new version of the platform has just been deployed. Please click below to refresh and load the latest updates.</p>
          <button onclick="window.location.reload()">Refresh Page</button>
        </div>
      </body>
    </html>
  `);
});

// Global Error Handler
app.use(errorHandler);

// Start Listener with Automatic Port Fallback (5000 -> 5001 -> 5002)
let PORT = parseInt(ENV.PORT, 10) || 5000;

const startServer = (portToTry) => {
  const server = app.listen(portToTry, () => {
    logger.info(`=======================================================`);
    logger.info(`🚀 BIRREND BACKEND SERVER OPERATIONAL ON PORT: ${portToTry}`);
    logger.info(`🌐 Environment: ${ENV.NODE_ENV}`);
    logger.info(`🔗 Base API Endpoint: http://localhost:${portToTry}/api/v1`);
    logger.info(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${portToTry} is in use. Retrying on port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      logger.error('Server error:', err);
    }
  });
};

startServer(PORT);

export default app;
