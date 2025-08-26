import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, DollarSign, Package } from "lucide-react";
import { formatUGX } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { config } from '@/config';

export function Analytics() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const apiBase = config.apiUrl;
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-report", period],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/analytics/report?period=${period}`);
      if (!res.ok) throw new Error("Failed to load analytics report");
      return res.json() as Promise<{
        monthlyStats: {
          totalSales: number;
          totalProfit: number;
          totalOrders: number;
          avgOrderValue: number;
          profitMargin: number;
          growthRate: number;
        };
        salesData: { month: string; sales: number; profit: number }[];
        topProducts: { name: string; sales: number; revenue: number; profit: number }[];
      }>;
    },
    staleTime: 30_000,
  });

  const monthlyStats = data?.monthlyStats ?? {
    totalSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    profitMargin: 0,
    growthRate: 0,
  };
  const salesData = data?.salesData ?? [];
  const topProducts = data?.topProducts ?? [];

  // lightweight overview for things like low-stock and today's sales
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/analytics`);
      if (!res.ok) throw new Error('Failed to load analytics overview');
      return res.json() as Promise<{
        totalSales: number;
        productsLowStock: number;
        totalProducts: number;
        totalRevenue: number;
        todaySales: number;
        totalProfit: number;
      }>;
    },
    staleTime: 30_000,
  });

  const lowStockCount = overview?.productsLowStock ?? 0;
  const todaySalesCount = overview?.todaySales ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Track your business performance and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUGX(monthlyStats.totalSales)}</div>
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +{monthlyStats.growthRate}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-profit" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-profit">{formatUGX(monthlyStats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyStats.profitMargin}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatUGX(monthlyStats.avgOrderValue)} per order
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">+{monthlyStats.growthRate}%</div>
            <p className="text-xs text-muted-foreground">Month over month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Trend Chart */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sales & Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
              {!isLoading && salesData.map((data) => (
                <div key={data.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{data.month}</span>
                    <div className="flex gap-4">
                      <span className="text-primary">Sales: {formatUGX(data.sales)}</span>
                      <span className="text-profit">Profit: {formatUGX(data.profit)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                        style={{width: `${(data.sales / 30000) * 100}%`}}
                      ></div>
                    </div>
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-gradient-success h-2 rounded-full transition-all duration-500"
                        style={{width: `${(data.profit / 10000) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Performing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
              {!isLoading && topProducts.map((product, index) => (
                <div key={product.name} className="p-4 border rounded-lg bg-gradient-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{product.sales} sold</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Revenue:</span>
                      <p className="font-medium text-primary">{formatUGX(product.revenue)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Profit:</span>
                      <p className="font-medium text-profit">{formatUGX(product.profit)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
              <h4 className="font-medium text-emerald-800 mb-2">Revenue Growth</h4>
              <p className="text-sm text-emerald-700">
                {monthlyStats.growthRate >= 0 ? 'Up' : 'Down'} {Math.abs(monthlyStats.growthRate)}% vs previous period — {formatUGX(monthlyStats.totalSales)} revenue
              </p>
            </div>
            <div className={`p-4 ${lowStockCount > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-emerald-50 border-emerald-100'} border rounded-lg`}>
              <h4 className={`${lowStockCount > 0 ? 'text-destructive' : 'text-emerald-800'} font-medium mb-2`}>{lowStockCount > 0 ? 'Low Stock Alert' : 'Healthy Inventory'}</h4>
              <p className={`text-sm ${lowStockCount > 0 ? 'text-destructive' : 'text-emerald-700'}`}>
                {lowStockCount > 0 ? `${lowStockCount} products need restocking` : 'All products are above low-stock thresholds.'}
              </p>
            </div>
            <div className="p-4 bg-sky-50 border border-sky-100 rounded-lg">
              <h4 className="font-medium text-sky-800 mb-2">Top Product</h4>
              {topProducts.length > 0 ? (
                <>
                  <p className="text-sm text-sky-700">{topProducts[0].name}</p>
                  <p className="text-xs text-muted-foreground">Revenue: {formatUGX(topProducts[0].revenue)} — Profit: {formatUGX(topProducts[0].profit)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No sales yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}