import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import articleRoutes from './routes/article.routes';
import feedRoutes from './routes/feed.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import countryRoutes from './routes/country.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// ── Global Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Health Check ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'gobii-news-api',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ── API Routes ──────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/articles', articleRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/countries', countryRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// ── Error Handling ──────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
