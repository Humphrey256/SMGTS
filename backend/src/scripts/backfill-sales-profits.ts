import { connectDB } from '../config/db.js';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';

async function run() {
  await connectDB();
  console.log('Backfill: scanning sales for missing profit fields...');

  const cursor = Sale.find().cursor();
  let updated = 0;
  let scanned = 0;

  for await (const sale of cursor) {
    scanned++;
    let needsUpdate = false;
    let totalProfit = 0;

    // ensure items are populated minimally (we only need product refs and variant ids)
    for (const it of sale.items as any[]) {
      // compute unitsSold if missing
      if (typeof it.unitsSold !== 'number' || isNaN(it.unitsSold)) {
        // try to look up product/variant
        try {
          const prod = await Product.findById(it.product).lean();
          const variant = (prod?.variants || []).find((v: any) => v._id.toString() === (it.variantId?.toString() || '')) || (prod?.variants && prod.variants[0]);
          const packSize = variant?.packSize || 1;
          it.unitsSold = (it.quantity || 0) * packSize;
        } catch (e) {
          // ignore, leave as-is
        }
      }

      // ensure costAtSale exists; if missing, try to use product variant costPrice
      if (typeof it.costAtSale !== 'number' || isNaN(it.costAtSale)) {
        try {
          const prod = await Product.findById(it.product).lean();
          const variant = (prod?.variants || []).find((v: any) => v._id.toString() === (it.variantId?.toString() || '')) || (prod?.variants && prod.variants[0]);
          it.costAtSale = variant?.costPrice ?? 0;
        } catch (e) {
          it.costAtSale = 0;
        }
      }

      // ensure subtotal exists
      if (typeof it.subtotal !== 'number' || isNaN(it.subtotal)) {
        it.subtotal = (it.unitPrice || 0) * (it.quantity || 0);
      }

      // compute itemCost and itemProfit
      const unitsSold = Number(it.unitsSold || 0);
      const costAtSale = Number(it.costAtSale || 0);
      const itemCost = unitsSold * costAtSale; // costAtSale is per base unit
      const itemProfit = (Number(it.subtotal || 0)) - itemCost;

      if (it.itemCost !== itemCost) {
        it.itemCost = itemCost;
        needsUpdate = true;
      }
      if (it.itemProfit !== itemProfit) {
        it.itemProfit = itemProfit;
        needsUpdate = true;
      }

      totalProfit += itemProfit;
    }

    // ensure sale.totalProfit
    if (typeof (sale as any).totalProfit !== 'number' || (sale as any).totalProfit !== totalProfit) {
      (sale as any).totalProfit = totalProfit;
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        await sale.save();
        updated++;
        console.log(`Updated sale ${sale._id} -> totalProfit=${totalProfit}`);
      } catch (e) {
        console.error(`Failed to update sale ${sale._id}:`, e);
      }
    }
  }

  console.log(`Backfill complete. Scanned: ${scanned}, Updated: ${updated}`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
