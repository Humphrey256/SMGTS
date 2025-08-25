import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  sku: { type: String, unique: true }, // Remove required, will be auto-generated
  category: { type: String, required: true },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 0 }
}, { timestamps: true });

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
