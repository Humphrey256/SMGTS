import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, ShoppingCart, Receipt, Check, Printer, ArrowRight, RotateCcw } from "lucide-react";
import { formatUGX } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { config } from '@/config';

interface ProductVariant {
  _id: string;
  sku?: string;
  title: string;
  packSize: number;
  costPrice: number;
  price: number; // price per sale-unit
  quantity: number; // in base units
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  variants: ProductVariant[];
}

interface SaleItem {
  product: Product;
  variant: ProductVariant;
  quantity: number; // sale-units
  subtotal: number;
}

interface CompletedSale {
  id: string;
  saleNumber: string;
  items: SaleItem[];
  total: number;
  customer: { name: string; phone: string };
  date: string;
  agent: string;
}

export function SalesForm() {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  // Products from API
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      if (!token) return;
      
      try {
  const apiBase = config.apiUrl;
        const response = await fetch(`${apiBase}/api/products`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const products = await response.json();
          setAvailableProducts(products);
        } else {
          // Attempt to include server response body for easier debugging
          let body = '';
          try {
            const ct = response.headers.get('content-type') || '';
            if (ct.includes('application/json')) body = JSON.stringify(await response.json());
            else body = await response.text();
          } catch (e) {
            body = '';
          }
          console.error('Failed to fetch products', { status: response.status, body });
          toast({
            title: "Error",
            description: `Failed to load products (status ${response.status})`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive"
        });
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [token, toast]);

  const selectedProduct = availableProducts.find(p => p._id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.find(v => v._id === selectedVariantId) as ProductVariant | undefined;

  const addSaleItem = () => {
    if (!selectedProduct || !selectedVariant) return;

    // compute available sale-units from variant quantity (stored in base units)
    const availableSaleUnits = Math.floor(selectedVariant.quantity / Math.max(1, selectedVariant.packSize));

    const existingItem = saleItems.find(item => item.product._id === selectedProduct._id && item.variant._id === selectedVariant._id);

    if (existingItem) {
      if (existingItem.quantity >= availableSaleUnits) {
        toast({ title: "Error", description: "Not enough stock available", variant: "destructive" });
        return;
      }
      setSaleItems(items => items.map(item => item.product._id === selectedProduct._id && item.variant._id === selectedVariant._id
        ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.variant.price }
        : item
      ));
    } else {
      const newItem: SaleItem = {
        product: selectedProduct,
        variant: selectedVariant,
        quantity: 1,
        subtotal: selectedVariant.price
      };
      setSaleItems([...saleItems, newItem]);
    }

    setSelectedProductId("");
    setSelectedVariantId("");
  };

  const updateQuantity = (productId: string, variantId: string, change: number) => {
    setSaleItems(items =>
      items.map(item => {
        if (item.product._id === productId && item.variant._id === variantId) {
          const availableSaleUnits = Math.floor(item.variant.quantity / Math.max(1, item.variant.packSize));
          const newQuantity = Math.max(1, Math.min(item.quantity + change, availableSaleUnits));
          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.variant.price
          };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeSaleItem = (productId: string, variantId?: string) => {
    setSaleItems(items => items.filter(item => !(item.product._id === productId && (!variantId || item.variant._id === variantId))));
  };

  const totalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmitSale = async () => {
    if (saleItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the sale",
        variant: "destructive"
      });
      return;
    }

    if (!user || !token) {
      toast({
        title: "Error",
        description: "You must be logged in to create a sale",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const apiBase = config.apiUrl;

      // Prepare sale data for backend (include variantId)
      const saleData = {
        items: saleItems.map(item => ({
          product: item.product._id,
          variantId: item.variant._id,
          quantity: item.quantity
        })),
        total: totalAmount,
        customer: customerName.trim() ? { name: customerName, phone: customerPhone } : undefined
      };

      const response = await fetch(`${apiBase}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      if (!response.ok) {
        throw new Error('Failed to create sale');
      }

      const createdSale = await response.json();
      
      // Generate sale number and completion details
      const saleNumber = `SALE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const completedSaleData: CompletedSale = {
        id: createdSale._id || createdSale.id,
        saleNumber,
        items: saleItems,
        total: totalAmount,
        customer: { name: customerName, phone: customerPhone },
        date: new Date().toISOString(),
        agent: user.email
      };

      setCompletedSale(completedSaleData);
      setShowSuccessDialog(true);

      // Reset form
      setSaleItems([]);
      setCustomerName("");
      setCustomerPhone("");

      toast({
        title: "Success",
        description: `Sale ${saleNumber} completed! Total: ${formatUGX(totalAmount)}`,
      });

    } catch (error) {
      console.error('Error creating sale:', error);
      toast({
        title: "Error",
        description: "Failed to create sale. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedSale) return;
    
    // Create printable receipt
    const receiptContent = `
      SALES RECEIPT
      ${completedSale.saleNumber}
      Date: ${new Date(completedSale.date).toLocaleString()}
      Agent: ${completedSale.agent}
      
      ${completedSale.customer.name ? `Customer: ${completedSale.customer.name}` : ''}
      ${completedSale.customer.phone ? `Phone: ${completedSale.customer.phone}` : ''}
      
      ITEMS:
      ${completedSale.items.map(item => 
        `${item.product.name} (${item.variant.title}) x${item.quantity} @ ${formatUGX(item.variant.price)} = ${formatUGX(item.subtotal)}`
      ).join('\n')}
      
      TOTAL: ${formatUGX(completedSale.total)}
      
      Thank you for your business!
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Receipt - ${completedSale.saleNumber}</title></head>
          <body style="font-family: monospace; padding: 20px;">
            <pre>${receiptContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleNewSale = () => {
    setShowSuccessDialog(false);
    setCompletedSale(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Create New Sale</h1>
        <p className="text-muted-foreground">Process a new sale and manage inventory</p>
      </div>

  <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Add Products */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Add Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Product</Label>
                <Select value={selectedProductId} onValueChange={(v) => { setSelectedProductId(v); setSelectedVariantId(""); }} disabled={isLoadingProducts}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Choose a product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        <div className="flex items-center w-full">
                          <span>{product.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div>
                  <Label>Select Variant / Pack</Label>
                  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedProduct.variants.length ? "Choose a variant" : "No variants"} />
                    </SelectTrigger>
                    <SelectContent>
                        {selectedProduct.variants.map(v => (
                          <SelectItem key={v._id} value={v._id}>
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <div className="font-medium">{v.title} — {formatUGX(v.price)}</div>
                                <div className="text-xs text-muted-foreground">Pack: {v.packSize} | Stock: {Math.floor(v.quantity / Math.max(1, v.packSize))} units</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedProduct && (
                <div className="p-3 bg-accent-light rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedProduct.name}</p>
                      <p className="text-sm text-muted-foreground">Variants: {selectedProduct.variants.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{selectedVariant ? formatUGX(selectedVariant.price) : ''}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={addSaleItem} 
                disabled={!selectedProduct}
                className="w-full bg-gradient-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Sale
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Customer Information (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  placeholder="Enter phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sale Summary */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {saleItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No items added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                    {saleItems.map((item) => (
                  <div key={`${item.product._id}-${item.variant._id}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name} — {item.variant.title}</p>
                      <p className="text-sm text-muted-foreground">{formatUGX(item.variant.price)} per {item.variant.packSize}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product._id, item.variant._id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product._id, item.variant._id, 1)}
                        disabled={item.quantity >= Math.floor(item.variant.quantity / Math.max(1, item.variant.packSize))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-bold">{formatUGX(item.subtotal)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSaleItem(item.product._id, item.variant._id)}
                        className="text-destructive h-6 p-0"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-success">{formatUGX(totalAmount)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitSale}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-success text-white"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Processing Sale...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Complete Sale
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Sale Completed Successfully!
            </DialogTitle>
          </DialogHeader>
          
          {completedSale && (
            <div className="space-y-4">
              <div className="bg-success-light p-4 rounded-lg">
                <div className="text-center">
                  <h3 className="font-bold text-lg">{completedSale.saleNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(completedSale.date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Items sold:</span>
                  <span>{completedSale.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total quantity:</span>
                  <span>{completedSale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total amount:</span>
                  <span className="text-success">{formatUGX(completedSale.total)}</span>
                </div>
                {completedSale.customer.name && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{completedSale.customer.name}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handlePrintReceipt}
                  variant="outline"
                  className="w-full"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button
                  onClick={handleNewSale}
                  className="w-full bg-gradient-primary"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  New Sale
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Sale saved to database and inventory updated
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}