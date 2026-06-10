import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import router from './routes/index';
import { startCronJobs } from './jobs/cron';

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        env.FRONTEND_URL,
        'https://api.groq.com',
        ...(process.env.AI_BASE_URL ? [(() => { try { return new URL(process.env.AI_BASE_URL).origin; } catch { return ''; } })()] : []),
      ].filter((s): s is string => Boolean(s)),
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  ...(process.env.ADDITIONAL_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
];
app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin / server-to-server (no origin) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Key'],
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ─── 404 + Error Handler ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(env.PORT);

async function bootstrap() {
  try {
    const { default: prisma } = await import('./config/db');
    await prisma.$connect();
    logger.info('✅ Database connected');

    const { redis } = await import('./config/redis');
    if (redis) {
      try {
        await redis.connect();
      } catch (e) {
        logger.warn('Redis unavailable — continuing without it');
      }
    } else {
      logger.info('Redis not configured — skipping');
    }

    startCronJobs();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Prodhan API running on port ${PORT} (${env.NODE_ENV})`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
