import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, Users, DollarSign, AlertTriangle } from "lucide-react";
import { formatUGX, formatUSh } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { config } from '@/config';

interface DashboardProps {
  userRole: string;
  onNavigate?: (view: string) => void;
}

export function Dashboard({ userRole, onNavigate }: DashboardProps) {
  const { token } = useAuth();
  const apiBase = config.apiUrl;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/analytics`);
      if (!res.ok) throw new Error("Failed to load analytics");
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

  // Fetch recent sales for activity feed
  const { data: recentSales } = useQuery({
    queryKey: ["recent-sales"],
    queryFn: async () => {
      if (!token) throw new Error("No authentication token");
      const res = await fetch(`${apiBase}/api/sales?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load recent sales");
      return res.json() as Promise<Array<{
        _id: string;
        total: number;
        createdAt: string;
        items: Array<{ product: { name: string }; quantity: number }>;
      }>>;
    },
    staleTime: 30_000,
    enabled: !!token, // Only run when token is available
  });

  // Fetch low stock products for activity feed
  const { data: lowStockProducts } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: async () => {
      if (!token) throw new Error("No authentication token");
      const res = await fetch(`${apiBase}/api/products/low-stock`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load low stock products");
      return res.json() as Promise<Array<{
        _id: string;
        name: string;
        quantity: number;
        sku: string;
      }>>;
    },
    staleTime: 30_000,
    enabled: !!token, // Only run when token is available
  });

  const stats = {
    totalSales: data?.totalRevenue ?? 0,
    totalProfit: data?.totalProfit ?? 0,
    productsLowStock: data?.productsLowStock ?? 0,
    totalProducts: data?.totalProducts ?? 0,
    todaySales: data?.todaySales ?? 0,
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = "primary",
    formatAsCurrency = false
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: "up" | "down";
    trendValue?: string;
    color?: "primary" | "success" | "warning" | "destructive";
    formatAsCurrency?: boolean;
  }) => (
    <Card className="bg-gradient-card shadow-soft hover:shadow-medium transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${
          color === "success" ? "text-success" :
          color === "warning" ? "text-warning" :
          color === "destructive" ? "text-destructive" :
          "text-primary"
        }`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatAsCurrency && typeof value === 'number' ? formatUGX(value) : value}
        </div>
        {trend && trendValue && (
          <div className="flex items-center mt-2">
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-success mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive mr-1" />
            )}
            <span className={`text-sm ${trend === "up" ? "text-success" : "text-destructive"}`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
  <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
    {isLoading ? "Loading analytics..." : isError ? "Failed to load analytics" : "Welcome back! Here's what's happening with your business."}
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {userRole === "admin" ? "Admin" : "Sales Agent"}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={stats.totalSales}
          icon={DollarSign}
          color="success"
          formatAsCurrency={true}
        />
        <StatCard
          title="Total Profit"
          value={stats.totalProfit}
          icon={TrendingUp}
          color="success"
          formatAsCurrency={true}
        />
        <StatCard
          title="Products"
          value={stats.totalProducts}
          icon={Package}
          color="primary"
        />
        {userRole === "admin" && (
          <StatCard
            title="Low Stock Alert"
            value={stats.productsLowStock}
            icon={AlertTriangle}
            color="warning"
          />
        )}
        {userRole === "agent" && (
          <StatCard
            title="Today's Sales"
            value={stats.todaySales}
            icon={Users}
            color="primary"
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button 
              onClick={() => onNavigate?.('sales')}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent-light transition-colors"
            >
              📊 Create New Sale
            </button>
            <button 
              onClick={() => onNavigate?.('products')}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent-light transition-colors"
            >
              📦 Manage Products
            </button>
            <button 
              onClick={() => onNavigate?.('debts')}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent-light transition-colors"
            >
              💳 Manage Debts
            </button>
            {userRole === "admin" && (
              <button 
                onClick={() => onNavigate?.('analytics')}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent-light transition-colors"
              >
                � View Analytics
              </button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Recent Sales */}
            {recentSales?.slice(0, 2).map((sale, index) => (
              <div 
                key={sale._id}
                className="flex items-center justify-between cursor-pointer hover:bg-accent-light rounded p-2 transition-colors"
                onClick={() => onNavigate?.('sales')}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{index === 0 ? 'Recent Sale (Latest)' : 'Recent Sale (Previous)'}</span>
                  <span className="text-xs text-muted-foreground">
                    {sale.items && sale.items.length > 0
                      ? sale.items.map((it: any) => `${it.product?.name ?? 'Unknown'} x ${it.quantity}`).join(', ')
                      : 'No items'
                    }
                    {sale.createdAt ? ` • ${new Date(sale.createdAt).toLocaleString()}` : ''}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm">{formatUSh(sale.total)}</span>
                </div>
              </div>
            ))}
            
            {/* Low Stock Products */}
            {lowStockProducts?.slice(0, 2).map((product) => (
              <div 
                key={product._id}
                className="flex items-center justify-between cursor-pointer hover:bg-accent-light rounded p-2 transition-colors"
                onClick={() => onNavigate?.('products')}
              >
                <span className="text-sm">Low Stock: {product.name}</span>
                <Badge variant="outline" className="text-xs text-warning">{product.quantity} left</Badge>
              </div>
            ))}

            {/* Fallback for no data */}
            {(!recentSales || recentSales.length === 0) && (!lowStockProducts || lowStockProducts.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                <span className="text-sm">No recent activity</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Performance
              {userRole === "admin" && (
                <button 
                  onClick={() => onNavigate?.('analytics')}
                  className="text-xs text-primary hover:underline"
                >
                  View Details
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Monthly Sales Progress</span>
                  <span>{Math.round((stats.totalSales / 50000) * 100)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-gradient-success h-2 rounded-full transition-all duration-300" 
                    style={{width: `${Math.min((stats.totalSales / 50000) * 100, 100)}%`}}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Target: {formatUGX(50000)}
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Profit Margin</span>
                  <span>
                    {stats.totalSales > 0 
                      ? Math.round((stats.totalProfit / stats.totalSales) * 100)
                      : 0
                    }%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-gradient-primary h-2 rounded-full transition-all duration-300" 
                    style={{
                      width: `${stats.totalSales > 0 
                        ? Math.min((stats.totalProfit / stats.totalSales) * 100, 100)
                        : 0
                      }%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Profit: {formatUGX(stats.totalProfit)}
                </div>
              </div>
              <div 
                className="cursor-pointer hover:bg-accent-light rounded p-2 transition-colors"
                onClick={() => onNavigate?.('products')}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span>Inventory Health</span>
                  <span className={stats.productsLowStock > 5 ? "text-warning" : "text-success"}>
                    {stats.productsLowStock > 5 ? "Attention" : "Good"}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.productsLowStock > 5 ? "bg-gradient-warning" : "bg-gradient-success"
                    }`}
                    style={{width: `${100 - Math.min((stats.productsLowStock / stats.totalProducts) * 100, 100)}%`}}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.productsLowStock} items need restocking
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}