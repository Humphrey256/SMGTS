import { Request, Response } from 'express';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { AuthRequest } from '../middleware/auth.js';

export async function createSale(req: AuthRequest, res: Response) {
  try {
    // Expected item shape: { product: string, variantId?: string, quantity: number }
    const { items, customer } = req.body as { items: { product: string; variantId?: string; quantity: number }[]; customer?: { name?: string; phone?: string } };
    if (!items || !items.length) return res.status(400).json({ message: 'No items' });

    const saleItems = [] as any[];
    let total = 0;

    // For each item, fetch product and variant, compute unitsSold and attempt atomic decrement
    for (const item of items) {
      const productDoc = await Product.findById(item.product);
      if (!productDoc) return res.status(400).json({ message: 'Product not found' });

      const product: any = productDoc.toObject ? productDoc.toObject() : (productDoc as any);

      // find variant (if variantId omitted, use the first variant)
      const variant = (product.variants || []).find((v: any) => item.variantId ? v._id.toString() === item.variantId : true);
      if (!variant) return res.status(400).json({ message: 'Variant not found for product ' + product.name });

      // compute units sold in base units
      const unitsSold = item.quantity * (variant.packSize || 1);

      // Atomic decrement: find and update only if variant has enough quantity
      const updated = await Product.findOneAndUpdate({
        _id: product._id,
        'variants._id': variant._id,
        'variants.quantity': { $gte: unitsSold }
      }, {
        $inc: { 'variants.$.quantity': -unitsSold }
      }, { new: true });

      if (!updated) {
        // fallback: check fresh and fail with insufficient stock
        const fresh = await Product.findById(product._id);
        const freshVariant = (fresh!.variants || []).find((v: any) => v._id.toString() === variant._id.toString());
        if (!freshVariant || freshVariant.quantity < unitsSold) return res.status(400).json({ message: `Insufficient stock for ${product.name} (${variant.title})` });
        // Shouldn't normally reach here because findOneAndUpdate should have succeeded, but decrement to be safe
        freshVariant.quantity -= unitsSold;
        await fresh!.save();
      }

      const unitPrice = variant.price;
      const subtotal = unitPrice * item.quantity;
      const costAtSale = variant.costPrice; // cost per base unit

      // compute item cost and profit
      const itemCost = (costAtSale || 0) * unitsSold; // costAtSale is per base unit
      const itemProfit = subtotal - itemCost;

      saleItems.push({ product: product._id, variantId: variant._id, quantity: item.quantity, unitsSold, unitPrice, subtotal, costAtSale, itemCost, itemProfit });
      total += subtotal;
      // accumulate profit
      // we'll compute totalProfit after loop to persist on sale
    }

    const totalProfit = saleItems.reduce((s, it) => s + (it.itemProfit || 0), 0);
    const sale = await Sale.create({ items: saleItems, total, totalProfit, customer, user: req.user!._id });
    res.status(201).json(sale);
  } catch (err) {
    console.error('createSale error', err);
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
