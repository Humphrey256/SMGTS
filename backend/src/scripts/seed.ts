import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { ENV } from '../config/env.js';

async function seed() {
  try {
    await connectDB();
    
    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    
    // Create admin user
    const admin = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });
    
    // Create agent user
    const agent = await User.create({
      email: 'agent@test.com',
      password: 'password123',
      role: 'agent'
    });
    
    // Create sample products (prices in UGX) using new variants shape - SKUs will be auto-generated
    const productData = [
      // Pens (single-variant)
      {
        name: 'Bic Pen',
        category: 'Stationery',
        variants: [ { title: 'Default', packSize: 1, costPrice: 500, price: 700, quantity: 200 } ]
      },
      {
        name: 'Nataraj Pen',
        category: 'Stationery', 
        variants: [ { title: 'Default', packSize: 1, costPrice: 350, price: 500, quantity: 200 } ]
      },
      // Books (single-variant where appropriate)
      {
        name: 'Book 4QR',
        category: 'Books',
        variants: [ { title: 'Default', packSize: 1, costPrice: 4000, price: 5000, quantity: 120 } ]
      },
      {
        name: 'Book 3QR',
        category: 'Books',
        variants: [ { title: 'Default', packSize: 1, costPrice: 3600, price: 4500, quantity: 120 } ]
      },
      // A4: provide dozen and single variants as requested
      {
        name: 'A4 Book',
        category: 'Books',
        variants: [
          { title: 'A4 (dozen)', packSize: 12, costPrice: 1500, price: 22000, quantity: 120 },
          { title: 'A4 (single)', packSize: 1, costPrice: 1500, price: 2000, quantity: 120 }
        ]
      },
      // Exercise books with explicit page variants at requested prices
      {
        name: 'Exercise Book',
        category: 'Books',
        variants: [
          { title: '96 pages', packSize: 1, costPrice: 800, price: 10000, quantity: 150 },
          { title: '48 pages', packSize: 1, costPrice: 350, price: 7000, quantity: 200 }
        ]
      },
      // Envelopes
      {
        name: 'Envelopes - Big',
        category: 'Office Supplies',
        variants: [ { title: 'Default', packSize: 1, costPrice: 350, price: 500, quantity: 150 } ]
      },
      {
        name: 'Envelopes - Small',
        category: 'Office Supplies',
        variants: [ { title: 'Default', packSize: 1, costPrice: 120, price: 200, quantity: 200 } ]
      },
      // Other supplies
      {
        name: 'Mathematical Set (Picfare)',
        category: 'Stationery',
        variants: [ { title: 'Default', packSize: 1, costPrice: 4000, price: 5000, quantity: 80 } ]
      },
      {
        name: 'Clear Bag',
        category: 'Office Supplies',
        variants: [ { title: 'Default', packSize: 1, costPrice: 1500, price: 2000, quantity: 100 } ]
      },
      {
        name: 'Pair of Scissors',
        category: 'Stationery',
        variants: [ { title: 'Default', packSize: 1, costPrice: 700, price: 1000, quantity: 5 } ]
      },
      // Low stock items for testing
      {
        name: 'Ruler 30cm',
        category: 'Stationery',
        variants: [ { title: 'Default', packSize: 1, costPrice: 200, price: 300, quantity: 3 } ]
      },
      {
        name: 'Eraser',
        category: 'Stationery',
        variants: [ { title: 'Default', packSize: 1, costPrice: 100, price: 200, quantity: 8 } ]
      }
    ];

    // Create products one by one to avoid SKU conflicts
    const products = [];
    for (const productInfo of productData) {
      const product = await Product.create(productInfo);
      products.push(product);
      console.log(`Created product: ${product.name} with SKU: ${product.sku}`);
    }
    
    console.log('Seeding completed successfully');
    console.log('Admin user:', admin.email);
    console.log('Agent user:', agent.email);
    console.log('Products created:', products.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
