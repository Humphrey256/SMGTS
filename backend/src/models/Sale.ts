import mongoose, { Schema, Document, Types } from 'mongoose';

interface ISaleItem {
  product: Types.ObjectId;
  quantity: number;
  priceAtSale: number; // sellingPrice snapshot
  subtotal: number;
}

export interface ISale extends Document {
  items: ISaleItem[];
  total: number;
  customer?: { name?: string; phone?: string };
  user: Types.ObjectId; // who created the sale
}

const saleItemSchema = new Schema<ISaleItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  priceAtSale: { type: Number, required: true },
  subtotal: { type: Number, required: true }
}, { _id: false });

const saleSchema = new Schema<ISale>({
  items: { type: [saleItemSchema], required: true },
  total: { type: Number, required: true },
  customer: { name: String, phone: String },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);
