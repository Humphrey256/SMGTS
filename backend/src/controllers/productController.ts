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
    // Products with any variant quantity <= 10 are considered low stock
    const lowStockProducts = await Product.find({ 'variants.quantity': { $lte: 10 } }).sort('createdAt');
    res.json(lowStockProducts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

export async function addVariant(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, packSize, costPrice, price, quantity, sku } = req.body;

    if (!title || packSize == null || costPrice == null || price == null || quantity == null) {
      return res.status(400).json({ message: 'Missing variant fields' });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant: any = {
      title: String(title),
      packSize: Number(packSize) || 1,
      costPrice: Number(costPrice) || 0,
      price: Number(price) || 0,
      quantity: Number(quantity) || 0
    };

    if (sku) variant.sku = String(sku);
    else {
      // generate a short variant SKU based on product SKU
      const base = product.sku || product.name.replace(/\s+/g, '').toUpperCase().slice(0,6);
      variant.sku = `${base}-V${Date.now().toString().slice(-6)}`;
    }

    product.variants.push(variant);
    await product.save();

    const created = product.variants[product.variants.length - 1];
    res.status(201).json(created);
  } catch (err) {
    console.error('addVariant error', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function updateVariant(req: Request, res: Response) {
  try {
    const { id, variantId } = req.params as any;
    const updates = req.body || {};

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.id(variantId as any);
    if (!variant) return res.status(404).json({ message: 'Variant not found' });

    // Only allow certain fields
    const allowed = ['title', 'packSize', 'costPrice', 'price', 'quantity', 'sku'];
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        // @ts-ignore
        variant[field] = updates[field];
      }
    });

    await product.save();
    res.json(variant);
  } catch (err) {
    console.error('updateVariant error', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteVariant(req: Request, res: Response) {
  try {
    const { id, variantId } = req.params as any;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.id(variantId as any);
    if (!variant) return res.status(404).json({ message: 'Variant not found' });

    variant.remove();
    await product.save();

    res.json({ message: 'Variant deleted', variantId });
  } catch (err) {
    console.error('deleteVariant error', err);
    res.status(500).json({ message: 'Server error' });
  }
}
