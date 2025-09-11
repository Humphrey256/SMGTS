import { Router } from 'express';
import { createSale, listSales, getSaleById } from '../controllers/saleController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', listSales);
router.get('/:id', getSaleById);
router.post('/', createSale);

export default router;
