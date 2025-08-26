import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';

async function migrate() {
  await connectDB();
  console.log('Connected to DB for migration');

  const products = await Product.find();
  console.log(`Found ${products.length} products`);

  for (const p of products) {
    // if product already has variants skip
    // @ts-ignore
    if (p.variants && p.variants.length > 0) {
      console.log(`Skipping ${p.name} (already has variants)`);
      continue;
    }

    // convert legacy fields into a single variant with packSize=1
    const legacy: any = p;
    const variant = {
      title: p.name,
      packSize: 1,
      costPrice: legacy.costPrice || 0,
      price: legacy.sellingPrice || legacy.price || 0,
      quantity: legacy.quantity || 0,
      sku: legacy.sku
    };

    // replace product fields
  // assign variants
  (p as any).variants = [variant];
    // remove legacy fields if present (optional)
  try { delete (p as any).costPrice; } catch {};
  try { delete (p as any).sellingPrice; } catch {};
  try { delete (p as any).quantity; } catch {};

    await p.save();
    console.log(`Migrated product ${p.name} -> variants[0].title=${variant.title}`);
  }

  // Add example products with multiple variants
  const examples = [
    {
      name: 'A4 Multi-Pack',
      category: 'Books',
      variants: [
        { title: 'A4 (dozen)', packSize: 12, costPrice: 1500, price: 22000, quantity: 120 },
        { title: 'A4 (single)', packSize: 1, costPrice: 1500, price: 2000, quantity: 120 }
      ]
    },
    {
      name: 'Exercise Book',
      category: 'Books',
      variants: [
        { title: '96 pages', packSize: 1, costPrice: 800, price: 10000, quantity: 200 },
        { title: '48 pages', packSize: 1, costPrice: 350, price: 7000, quantity: 200 }
      ]
    }
  ];

  for (const e of examples) {
    const existing = await Product.findOne({ name: e.name });
    if (existing) {
      console.log(`Example product ${e.name} already exists, skipping`);
      continue;
    }
    const created = await Product.create(e as any);
    console.log(`Created example product ${created.name}`);
  }

  console.log('Migration complete');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
