import { Router } from 'express';
import { getAnalytics, getAnalyticsReport } from '../controllers/analyticsController.js';

const router = Router();

// Test endpoint to verify routing works
router.get('/test', (_req, res) => {
  res.json({ message: 'Analytics route works without auth' });
});

// Public analytics endpoint; secure with auth if needed
router.get('/', getAnalytics);
router.get('/report', getAnalyticsReport);

export default router;
