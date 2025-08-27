import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import debtRoutes from './routes/debtRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

// Middleware
app.use(helmet());
// Configure CORS with specific allowed origins
app.use(cors({ 
  origin: ENV.CLIENT_ORIGINS,
  credentials: true 
}));
app.use(express.json());
app.use(compression());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.get('/', (_req: express.Request, res: express.Response) => { res.send('API running'); });
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/analytics', analyticsRoutes);
// Quick health endpoint
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', allowedOrigins: ENV.CLIENT_ORIGINS });
});

// Global error handler placeholder
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

// Start
// Global process handlers to surface unexpected crashes in deploy logs
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

async function start() {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => console.log(`Server running on port ${ENV.PORT}`));
  } catch (err) {
    console.error('Failed to start server:', (err as any)?.message ?? err);
    process.exit(1);
  }
}

start();
