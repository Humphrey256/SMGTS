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
    // Products with quantity <= 10 are considered low stock
    const lowStockProducts = await Product.find({ quantity: { $lte: 10 } }).sort('quantity');
    res.json(lowStockProducts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}
