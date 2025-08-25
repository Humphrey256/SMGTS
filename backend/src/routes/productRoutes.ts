import { Router } from 'express';
import { listProducts, createProduct, updateProduct, deleteProduct, getLowStockProducts } from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', listProducts);
router.get('/low-stock', getLowStockProducts);
router.post('/', authorize('admin'), createProduct);
router.put('/:id', authorize('admin'), updateProduct);
router.delete('/:id', authorize('admin'), deleteProduct);

export default router;
