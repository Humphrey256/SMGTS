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
    
    // Create sample products (prices in UGX) - SKUs will be auto-generated
    const productData = [
      // Pens
      {
        name: 'Bic Pen',
        category: 'Stationery',
        costPrice: 500,
        sellingPrice: 700,
        quantity: 200
      },
      {
        name: 'Nataraj Pen',
        category: 'Stationery', 
        costPrice: 350,
        sellingPrice: 500,
        quantity: 200
      },
      // Books
      {
        name: 'Book 4QR',
        category: 'Books',
        costPrice: 4000,
        sellingPrice: 5000,
        quantity: 120
      },
      {
        name: 'Book 3QR',
        category: 'Books',
        costPrice: 3600,
        sellingPrice: 4500,
        quantity: 120
      },
      {
        name: 'A4 Book',
        category: 'Books',
        costPrice: 1500,
        sellingPrice: 2000,
        quantity: 150
      },
      {
        name: 'Exercise Book 96 pages',
        category: 'Books',
        costPrice: 800,
        sellingPrice: 1000,
        quantity: 150
      },
      {
        name: 'Exercise Book 48 pages',
        category: 'Books',
        costPrice: 350,
        sellingPrice: 500,
        quantity: 200
      },
      // Envelopes
      {
        name: 'Envelopes - Big',
        category: 'Office Supplies',
        costPrice: 350,
        sellingPrice: 500,
        quantity: 150
      },
      {
        name: 'Envelopes - Small',
        category: 'Office Supplies',
        costPrice: 120,
        sellingPrice: 200,
        quantity: 200
      },
      // Other supplies
      {
        name: 'Mathematical Set (Picfare)',
        category: 'Stationery',
        costPrice: 4000,
        sellingPrice: 5000,
        quantity: 80
      },
      {
        name: 'Clear Bag',
        category: 'Office Supplies',
        costPrice: 1500,
        sellingPrice: 2000,
        quantity: 100
      },
      {
        name: 'Pair of Scissors',
        category: 'Stationery',
        costPrice: 700,
        sellingPrice: 1000,
        quantity: 5  // Low stock for testing
      },
      // Add some more low stock items for testing
      {
        name: 'Ruler 30cm',
        category: 'Stationery',
        costPrice: 200,
        sellingPrice: 300,
        quantity: 3  // Very low stock
      },
      {
        name: 'Eraser',
        category: 'Stationery',
        costPrice: 100,
        sellingPrice: 200,
        quantity: 8  // Low stock
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
