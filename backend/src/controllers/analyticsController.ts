import { Request, Response } from 'express';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';

export async function getAnalytics(_req: Request, res: Response) {
  try {
    console.log('Analytics endpoint hit - no auth required');
    // Counts
    const [totalSales, productsLowStock, totalProducts] = await Promise.all([
      Sale.countDocuments(),
      Product.countDocuments({ quantity: { $lte: 10 } }),
      Product.countDocuments()
    ]);

    // Total revenue (sum of sale totals)
    const salesAgg = await Sale.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);
    const totalRevenue = salesAgg[0]?.totalRevenue || 0;

    // Today sales count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaySales = await Sale.countDocuments({ createdAt: { $gte: startOfToday } });

    // Compute total profit using stored sale item fields when available:
    // itemCost = unitsSold * costAtSale (costAtSale stored per base unit),
    // profit per item = subtotal - itemCost
    const profitAgg = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalProfit: {
            $sum: { $subtract: ['$items.subtotal', { $multiply: ['$items.unitsSold', '$items.costAtSale'] }] }
          }
        }
      }
    ]);
    const totalProfit = profitAgg[0]?.totalProfit || 0;

    res.json({ totalSales, productsLowStock, totalProducts, totalRevenue, todaySales, totalProfit });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Detailed Analytics & Reports for the frontend Analytics page
export async function getAnalyticsReport(req: Request, res: Response) {
  try {
  const period = (req.query.period as string) || 'month'; // day | week | month | quarter | year

    // Determine current period boundaries
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
    const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

    let start: Date;
    let prevStart: Date;
    let prevEnd: Date;

    switch (period) {
      case 'day': {
        // today only
        start = startOfDay(now);
        prevEnd = new Date(start);
        prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - 1);
        break;
      }
      case 'week': {
        const todayStart = startOfDay(now);
        start = new Date(todayStart);
        start.setDate(start.getDate() - 6); // last 7 days inclusive
        prevEnd = new Date(start);
        prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - 7);
        break;
      }
      case 'quarter': {
        start = startOfQuarter(now);
        prevEnd = new Date(start);
        prevStart = new Date(prevEnd);
        prevStart.setMonth(prevStart.getMonth() - 3);
        break;
      }
      case 'year': {
        start = startOfYear(now);
        prevEnd = new Date(start);
        prevStart = new Date(prevEnd);
        prevStart.setFullYear(prevStart.getFullYear() - 1);
        break;
      }
      case 'month':
      default: {
        start = startOfMonth(now);
        prevEnd = new Date(start);
        prevStart = new Date(prevEnd);
        prevStart.setMonth(prevStart.getMonth() - 1);
      }
    }

    // Helper: compute revenue, orders and profit for a range
    const summarizeRange = async (from: Date, to?: Date) => {
      const match: any = { createdAt: { $gte: from } };
      if (to) match.createdAt.$lt = to;

      const revenueAndOrders = await Sale.aggregate([
        { $match: match },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
      ]);

      const revenue = revenueAndOrders[0]?.revenue || 0;
      const orders = revenueAndOrders[0]?.orders || 0;

      // Compute profit using stored sale item fields (unitsSold & costAtSale)
      const profitAgg = await Sale.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalProfit: {
              $sum: { $subtract: ['$items.subtotal', { $multiply: ['$items.unitsSold', '$items.costAtSale'] }] }
            }
          }
        }
      ]);
      const profit = profitAgg[0]?.totalProfit || 0;

      return { revenue, orders, profit };
    };

    const [current, previous] = await Promise.all([
      summarizeRange(start),
      summarizeRange(prevStart, prevEnd)
    ]);

    const avgOrderValue = current.orders ? current.revenue / current.orders : 0;
    const profitMargin = current.revenue ? (current.profit / current.revenue) * 100 : 0;
    const growthRate = previous.revenue ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0;

    // Sales & profit trend: last 6 months (regardless of selected period for simplicity)
    const monthsBack = 6;
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    const trend = await Sale.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          sales: { $sum: '$total' },
          profit: {
            $sum: { $subtract: ['$items.subtotal', { $multiply: ['$items.unitsSold', '$items.costAtSale'] }] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const salesData = trend.map(t => ({
      month: `${monthNames[(t._id.month - 1)]}`,
      sales: t.sales || 0,
      profit: t.profit || 0
    }));

    // Top products in current period
    const matchCurrent: any = { createdAt: { $gte: start } };
    const topAgg = await Sale.aggregate([
      { $match: matchCurrent },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          salesQty: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
          profit: { $sum: { $subtract: ['$items.subtotal', { $multiply: ['$items.unitsSold', '$items.costAtSale'] }] } }
        }
      },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $sort: { salesQty: -1, revenue: -1 } },
      { $limit: 5 }
    ]);

    const topProducts = topAgg.map(p => ({
      name: p.name as string,
      sales: p.salesQty as number,
      revenue: p.revenue as number,
      profit: p.profit as number
    }));

    res.json({
      monthlyStats: {
        totalSales: current.revenue,
        totalProfit: current.profit,
        totalOrders: current.orders,
        avgOrderValue,
        profitMargin: Number(profitMargin.toFixed(1)),
        growthRate: Number(growthRate.toFixed(1))
      },
      salesData,
      topProducts
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}
