import { Router } from 'express';
import { createDebt, listDebts, updateDebtStatus, deleteDebt } from '../controllers/debtController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', listDebts);
router.post('/', createDebt);
router.patch('/:id/status', updateDebtStatus);
router.delete('/:id', deleteDebt);

export default router;
