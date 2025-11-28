// ===========================================
// ASTRA BOT - API Server Entry Point
// Single Port: Serves both API and Dashboard
// ===========================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { logger } from '../shared/utils/logger.js';
import { connectDatabase } from '../database/index.js';
import { configurePassport } from './middleware/passport.js';
import authRoutes from './routes/auth.js';
import guildRoutes from './routes/guilds.js';
import userRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';
import rolesRoutes from './routes/roles.js';
import botRoutes from './routes/bot.js';
import { createServer } from 'http';
import { initializeWebSocket } from './websocket/index.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Cloudflare/Nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware - configured for Cloudflare/Nginx
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://discord.com", "https://cdn.discordapp.com"],
    },
  } : false,
}));

// CORS configuration - allow same origin in production
app.use(cors({
  origin: isProduction 
    ? (process.env.DASHBOARD_URL || true) // Same origin or specified URL
    : ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Forwarded-For', 'X-Real-IP'],
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'astra-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 7 * 24 * 60 * 60, // 7 days
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

// Passport initialization
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/bot', botRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ===========================================
// SINGLE PORT: Serve Dashboard Static Files
// ===========================================
if (isProduction) {
  const dashboardPath = path.join(__dirname, '../../dashboard/dist');
  
  // Serve static files from dashboard build
  app.use(express.static(dashboardPath, {
    maxAge: '1d',
    etag: true,
  }));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('/{*splat}', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(dashboardPath, 'index.html'));
  });
}

// 404 handler for API routes only
app.use('/api/{*splat}', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'API endpoint not found' 
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('API Error:', err);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Create HTTP server for both Express and Socket.io
const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 API server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start API server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
