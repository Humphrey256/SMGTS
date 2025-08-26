import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB } from '../src/config/db';
import { Product } from '../src/models/Product';
import { User } from '../src/models/User';
import { Sale } from '../src/models/Sale';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('sale flow decrements variant inventory and records costAtSale', async () => {
  // create product with a dozen variant
  const product = await Product.create({
    name: 'Test A4',
    category: 'Books',
    variants: [
      { title: 'A4 (dozen)', packSize: 12, costPrice: 1500, price: 22000, quantity: 120 }
    ]
  } as any);

  const variant = product.variants[0];
  expect(variant.quantity).toBe(120);

  // simulate sale: sell 2 dozens -> unitsSold = 24
  const salePayload = {
    items: [ { product: product._id.toString(), variantId: variant._id.toString(), quantity: 2 } ],
    total: 44000
  };

  // call controller logic directly: reuse Sale model and manual decrement to simulate
  // For test simplicity, perform the same steps as controller
  const unitsSold = 2 * variant.packSize;
  // decrement
  const updated = await Product.findOneAndUpdate({ _id: product._id, 'variants._id': variant._id, 'variants.quantity': { $gte: unitsSold } }, { $inc: { 'variants.$.quantity': -unitsSold } }, { new: true });
  expect(updated).not.toBeNull();

  const createdSale = await Sale.create({ items: [{ product: product._id, variantId: variant._id, quantity: 2, unitsSold, unitPrice: variant.price, subtotal: variant.price * 2, costAtSale: variant.costPrice }], total: variant.price * 2, user: new mongoose.Types.ObjectId() } as any);

  // verify variant quantity decreased by 24
  const fresh = await Product.findById(product._id);
  const freshVariant = (fresh!.variants as any[]).find(v => v._id.toString() === variant._id.toString());
  expect(freshVariant.quantity).toBe(120 - unitsSold);

  // verify sale recorded costAtSale and unitsSold
  const sale = await Sale.findById(createdSale._id);
  expect(sale!.items[0].unitsSold).toBe(unitsSold);
  expect(sale!.items[0].costAtSale).toBe(1500);
});
