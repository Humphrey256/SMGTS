import { Request, Response } from 'express';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { AuthRequest } from '../middleware/auth.js';

export async function createSale(req: AuthRequest, res: Response) {
  try {
    const { items, customer } = req.body as { items: { product: string; quantity: number }[]; customer?: { name?: string; phone?: string } };
    if (!items || !items.length) return res.status(400).json({ message: 'No items' });

    // Fetch products and validate stock
    const productDocs = await Product.find({ _id: { $in: items.map(i => i.product) } });
    const saleItems = [] as any[];
    let total = 0;

    for (const item of items) {
      const product = productDocs.find((p: any) => p._id.toString() === item.product);
      if (!product) return res.status(400).json({ message: 'Product not found' });
      if (product.quantity < item.quantity) return res.status(400).json({ message: 'Insufficient stock for ' + product.name });
      const subtotal = product.sellingPrice * item.quantity;
      saleItems.push({ product: product._id, quantity: item.quantity, priceAtSale: product.sellingPrice, subtotal });
      total += subtotal;
      product.quantity -= item.quantity;
      await product.save();
    }

    const sale = await Sale.create({ items: saleItems, total, customer, user: req.user!._id });
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

export async function listSales(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    let query = Sale.find().populate('items.product').sort('-createdAt');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const sales = await query;
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}
