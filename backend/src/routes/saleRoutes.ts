import { Router } from 'express';
import { createSale, listSales } from '../controllers/saleController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', listSales);
router.post('/', createSale);

export default router;
