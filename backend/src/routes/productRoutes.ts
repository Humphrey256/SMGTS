import { Router } from 'express';
import { listProducts, createProduct, updateProduct, deleteProduct, getLowStockProducts } from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Public: list products (used by POS / sales pages)
router.get('/', listProducts);

// Low-stock list is public (used by notifier and dashboards)
router.get('/low-stock', getLowStockProducts);
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

export default router;
