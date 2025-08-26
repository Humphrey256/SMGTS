import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, Lock } from "lucide-react";
import { formatUGX } from "@/lib/utils";
import { config } from "@/config";

interface ProductVariant {
  _id?: string;
  title: string;
  packSize: number;
  costPrice: number;
  price: number;
  quantity: number;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  // legacy fields (may be undefined) - prefer using `variants`
  costPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE_URL = `${config.apiUrl}/api`;

// API functions
const fetchProducts = async (token: string): Promise<Product[]> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    // try to surface server-provided error message when available
    let body = '';
    try {
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await response.json();
        body = JSON.stringify(json);
      } else {
        body = await response.text();
      }
    } catch (e) {
      body = '';
    }
    throw new Error(`Failed to fetch products (status ${response.status}) ${body}`);
  }

  return response.json();
};

const createProduct = async (product: Omit<Product, '_id' | 'sku'>, token: string): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create product');
  }
  
  return response.json();
};

const updateProduct = async (id: string, product: Partial<Product>, token: string): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update product');
  }
  
  return response.json();
};

const deleteProduct = async (id: string, token: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete product');
  }
};

export function ProductManager() {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    costPrice: "",
    sellingPrice: "",
    quantity: ""
  });

  const categories = [
    "Stationery",
    "Books", 
    "Office Supplies",
    "Electronics",
    "Accessories",
    "Software"
  ];

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch products query
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(token!),
    enabled: !!token,
  });

  // Mutations
  const createMutation = useMutation<Product, Error, Omit<Product, '_id' | 'sku'>>({
    // creation should not require sku (server generates it). Accept product without _id and sku.
    mutationFn: (product: Omit<Product, '_id' | 'sku'>) => createProduct(product, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Success",
        description: "Product added successfully",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...product }: { id: string } & Partial<Product>) => updateProduct(id, product, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product", 
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      costPrice: "",
      sellingPrice: "",
      quantity: ""
    });
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can manage products",
        variant: "destructive",
      });
      return;
    }
    
    // Build a single-variant payload to satisfy the new Product model (variants[])
    const variant = {
      title: 'Default',
      packSize: 1,
      costPrice: parseFloat(formData.costPrice) || 0,
      price: parseFloat(formData.sellingPrice) || 0,
      quantity: parseInt(formData.quantity) || 0,
    } as ProductVariant;

    const productData: any = {
      name: formData.name,
      category: formData.category,
      variants: [variant]
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, ...productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleEdit = (product: Product) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can edit products",
        variant: "destructive",
      });
      return;
    }
    
    // pick primary variant if available, otherwise fall back to legacy fields
    const primary = (product.variants && product.variants.length > 0) ? product.variants[0] : undefined;

    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      costPrice: (primary ? primary.costPrice : (product.costPrice ?? 0)).toString(),
      sellingPrice: (primary ? primary.price : (product.sellingPrice ?? 0)).toString(),
      quantity: (primary ? primary.quantity : (product.quantity ?? 0)).toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can delete products",
        variant: "destructive",
      });
      return;
    }
    
    deleteMutation.mutate(id);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", color: "destructive" };
  if (quantity <= 10) return { label: "Low Stock", color: "destructive" };
    return { label: "In Stock", color: "success" };
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-muted-foreground">Error loading products</p>
          </div>
        </div>
        <Card className="shadow-soft">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load products</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory and product catalog
            {!isAdmin && " (View Only - Admin access required)"}
          </p>
        </div>
        {isAdmin ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costPrice">Cost Price (UGX)</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                      required
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPrice">Selling Price (UGX)</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                      required
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) 
                    ? "Saving..." 
                    : editingProduct ? "Update Product" : "Add Product"
                  }
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Admin access required</span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => {
          // Prefer variant values when available
          const primary = (product.variants && product.variants.length > 0) ? product.variants[0] : undefined;
          const quantity = primary ? primary.quantity : (product.quantity ?? 0);
          const costPrice = primary ? primary.costPrice : (product.costPrice ?? 0);
          const sellingPrice = primary ? primary.price : (product.sellingPrice ?? 0);

          const stockStatus = getStockStatus(quantity);
          const profit = sellingPrice - costPrice;
          const profitMargin = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : '0.0';

          return (
            <Card key={product._id} className="bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{product.sku}</p>
                  </div>
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="w-fit">
                  {product.category}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cost:</span>
                  <span className="font-medium">{formatUGX(costPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price:</span>
                  <span className="font-medium text-success">{formatUGX(sellingPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stock:</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={stockStatus.color === "destructive" ? "destructive" : "outline"}
                      className={stockStatus.color === "destructive" ? "bg-destructive text-destructive-foreground border-transparent" : ""}
                    >
                      {quantity}
                    </Badge>
                    {quantity <= 10 && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Profit:</span>
                  <span className="font-medium text-profit">
                    {formatUGX(profit)} ({profitMargin}%)
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(product)}
                      disabled={updateMutation.isPending}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(product._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {!isAdmin && (
                  <div className="pt-2 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Lock className="h-3 w-3" />
                      Admin access required to edit
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "No products match your search criteria." : "No products available."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}