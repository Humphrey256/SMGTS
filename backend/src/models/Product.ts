import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  _id?: any;
  sku?: string;
  title: string; // e.g. "A4 - dozen" or "96 pages"
  packSize: number; // number of base units per sale-unit (e.g. 12 for dozen)
  costPrice: number; // cost per base unit
  price: number; // price per sale-unit
  quantity: number; // stored in base units
}

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: string;
  variants: IProductVariant[];
}

const variantSchema = new Schema<IProductVariant>({
  sku: { type: String },
  title: { type: String, required: true },
  packSize: { type: Number, required: true, default: 1 },
  costPrice: { type: Number, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 0 }
}, { _id: true });

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  sku: { type: String, unique: true }, // Remove required, will be auto-generated
  category: { type: String, required: true },
  variants: { type: [variantSchema], required: true, default: [] }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Ensure there's always at least one variant (helps UI and legacy flows)
productSchema.pre('validate', function(next) {
  if (!this.variants || this.variants.length === 0) {
    this.variants = [{ title: 'Default', packSize: 1, costPrice: 0, price: 0, quantity: 0 }];
  }
  next();
});

// Virtuals for convenience in the frontend/UI
productSchema.virtual('primaryVariant').get(function(this: any) {
  return (this.variants && this.variants.length > 0) ? this.variants[0] : null;
});

productSchema.virtual('primaryPrice').get(function(this: any) {
  const p = this.variants && this.variants[0];
  return p ? p.price : 0;
});

productSchema.virtual('primaryCostPrice').get(function(this: any) {
  const p = this.variants && this.variants[0];
  return p ? p.costPrice : 0;
});

productSchema.virtual('primarySaleUnits').get(function(this: any) {
  const p = this.variants && this.variants[0];
  if (!p) return 0;
  return Math.floor(p.quantity / Math.max(1, p.packSize));
});

productSchema.virtual('totalBaseQuantity').get(function(this: any) {
  if (!this.variants) return 0;
  return this.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
});

productSchema.virtual('totalSaleUnits').get(function(this: any) {
  if (!this.variants) return 0;
  return this.variants.reduce((sum: number, v: any) => sum + Math.floor((v.quantity || 0) / Math.max(1, v.packSize)), 0);
});

// Auto-generate SKU before saving
productSchema.pre('save', async function(next) {
  if (!this.sku) {
    // Generate SKU based on category and name
    const categoryPrefix = this.category.toUpperCase().replace(/\s+/g, '').substring(0, 4);
    const namePrefix = this.name.toUpperCase().replace(/\s+/g, '').substring(0, 4);
    
    // Find the highest sequential number for this category-name combination
    const existingProducts = await mongoose.model('Product').find({
      sku: { $regex: `^${categoryPrefix}-${namePrefix}-` }
    }).sort({ sku: -1 }).limit(1);
    
    let sequentialNumber = 1;
    if (existingProducts.length > 0) {
      const lastSku = existingProducts[0].sku;
      const lastNumber = parseInt(lastSku.split('-').pop() || '0');
      sequentialNumber = lastNumber + 1;
    }
    
    this.sku = `${categoryPrefix}-${namePrefix}-${String(sequentialNumber).padStart(3, '0')}`;
    
    // Final uniqueness check (safety net)
    while (await mongoose.model('Product').findOne({ sku: this.sku })) {
      sequentialNumber++;
      this.sku = `${categoryPrefix}-${namePrefix}-${String(sequentialNumber).padStart(3, '0')}`;
    }
  }
  next();
});

export const Product = mongoose.model<IProduct>('Product', productSchema);
