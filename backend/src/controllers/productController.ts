import { Request, Response } from 'express';
import { Product } from '../models/Product.js';

export async function listProducts(_req: Request, res: Response) {
  const products = await Product.find().sort('-createdAt');
  res.json(products);
}

export async function createProduct(req: Request, res: Response) {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: 'Invalid product data' });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: 'Invalid data' });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
}

export async function getLowStockProducts(_req: Request, res: Response) {
  try {
    // Products with any variant quantity <= threshold are considered low stock
    const lowStockThreshold = 10;
    const products = await Product.find({ 'variants.quantity': { $lte: lowStockThreshold } }).lean();

    // For convenience return only the low variants for each product so the frontend can show examples
    const mapped = products.map((p: any) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      variants: (p.variants || []).filter((v: any) => Number(v.quantity) <= lowStockThreshold)
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}
