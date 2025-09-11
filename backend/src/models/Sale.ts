import mongoose, { Schema, Document, Types } from 'mongoose';


interface ISaleItem {
  product: Types.ObjectId;
  productName?: string;
  variantId: any; // reference to embedded variant _id
  quantity: number; // sale-units (e.g. 2 dozens)
  unitsSold: number; // computed base units (quantity * packSize)
  unitPrice: number; // price per sale-unit at time of sale
  subtotal: number;
  costAtSale: number; // cost per base unit at time of sale
}

export interface ISale extends Document {
  items: ISaleItem[];
  total: number;
  customer?: { name?: string; phone?: string };
  user: Types.ObjectId; // who created the sale
}

const saleItemSchema = new Schema<ISaleItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: false },
  variantId: { type: Schema.Types.ObjectId, required: false },
  quantity: { type: Number, required: true, min: 1 },
  unitsSold: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  costAtSale: { type: Number, required: true }
}, { _id: false });

const saleSchema = new Schema<ISale>({
  items: { type: [saleItemSchema], required: true },
  total: { type: Number, required: true },
  customer: { name: String, phone: String },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);
