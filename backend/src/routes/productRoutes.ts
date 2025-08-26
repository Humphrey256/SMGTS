import { Router } from 'express';
import { listProducts, createProduct, updateProduct, deleteProduct, getLowStockProducts, addVariant, updateVariant, deleteVariant } from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Public: list products (used by POS / sales pages)
router.get('/', listProducts);

// Protected endpoints
router.get('/low-stock', protect, getLowStockProducts);
router.post('/', protect, authorize('admin'), createProduct);
// Add a variant to an existing product
router.post('/:id/variants', protect, authorize('admin'), addVariant);
router.put('/:id/variants/:variantId', protect, authorize('admin'), updateVariant);
router.delete('/:id/variants/:variantId', protect, authorize('admin'), deleteVariant);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

export default router;
