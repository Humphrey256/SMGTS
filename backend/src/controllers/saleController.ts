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

      // Handle both variant-based and legacy products
      let variant: any, unitsSold: number, unitPrice: number, costAtSale: number;
      
      if (product.variants && product.variants.length > 0) {
        // Variant-based product
        variant = product.variants.find((v: any) => item.variantId ? v._id.toString() === item.variantId : true);
        if (!variant) return res.status(400).json({ message: 'Variant not found for product ' + product.name });
        
        unitsSold = item.quantity * (variant.packSize || 1);
        unitPrice = variant.price;
        costAtSale = variant.costPrice;

        // Atomic decrement for variant
        const updated = await Product.findOneAndUpdate({
          _id: product._id,
          'variants._id': variant._id,
          'variants.quantity': { $gte: unitsSold }
        }, {
          $inc: { 'variants.$.quantity': -unitsSold }
        }, { new: true });

        if (!updated) {
          const fresh = await Product.findById(product._id);
          const freshVariant = (fresh!.variants || []).find((v: any) => v._id.toString() === variant._id.toString());
          if (!freshVariant || freshVariant.quantity < unitsSold) {
            return res.status(400).json({ message: `Insufficient stock for ${product.name} (${variant.title})` });
          }
          freshVariant.quantity -= unitsSold;
          await fresh!.save();
        }
      } else {
        // Legacy product (single variant stored in top-level fields)
        unitsSold = item.quantity; // No pack size for legacy products
        unitPrice = product.sellingPrice || 0;
        costAtSale = product.costPrice || 0;

        // Check and decrement legacy quantity
        if ((product.quantity || 0) < unitsSold) {
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        }

        await Product.findByIdAndUpdate(product._id, {
          $inc: { quantity: -unitsSold }
        });

        // Create a pseudo-variant for consistent data structure
        variant = {
          _id: 'legacy',
          title: 'Default',
          packSize: 1,
          price: unitPrice,
          costPrice: costAtSale
        };
      }

      const subtotal = unitPrice * item.quantity;

      // snapshot the product name so frontends can display it without extra lookups
      saleItems.push({ 
        product: product._id, 
        productName: product.name, 
        variantId: variant._id === 'legacy' ? null : variant._id, 
        quantity: item.quantity, 
        unitsSold, 
        unitPrice, 
        subtotal, 
        costAtSale 
      });
      total += subtotal;
    }

    const sale = await Sale.create({ items: saleItems, total, customer, user: req.user!._id });
    res.status(201).json(sale);
  } catch (err) {
    console.error('createSale error', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function listSales(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  // populate product name for each item when available; fall back to stored productName
  let query = Sale.find().sort('-createdAt');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    // Try to populate product name for each item's product reference
    const sales = await query.populate({ path: 'items.product', select: 'name' }).exec();

    // Normalize response: ensure items have a .product with a name string
    const normalized = sales.map((s: any) => {
      const copy = s.toObject ? s.toObject() : { ...s };
      copy.items = (copy.items || []).map((it: any) => {
        const productName = it.product && it.product.name ? it.product.name : it.productName;
        return {
          ...it,
          product: { name: productName }
        };
      });
      return copy;
    });

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

export async function getSaleById(req: Request, res: Response) {
  try {
    const sale = await Sale.findById(req.params.id).populate({ path: 'items.product', select: 'name' });
    if (!sale) return res.status(404).json({ message: 'Not found' });

    const copy = sale.toObject ? sale.toObject() : { ...sale };
    copy.items = (copy.items || []).map((it: any) => {
      const productName = it.product && it.product.name ? it.product.name : it.productName;
      return {
        ...it,
        product: { name: productName }
      };
    });

    res.json(copy);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}
