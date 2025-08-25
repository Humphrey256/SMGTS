import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDebt extends Document {
  title: string;
  amount: number;
  reason: string;
  issuer: Types.ObjectId; // reference to User
  status: 'Pending' | 'Paid' | 'Rejected';
}

const debtSchema = new Schema<IDebt>({
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },
  issuer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

export const Debt = mongoose.model<IDebt>('Debt', debtSchema);
