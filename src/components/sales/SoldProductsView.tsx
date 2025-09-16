import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUGX, formatUSh } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Props {
  saleId: string;
  onNavigate?: (view: string) => void;
}

export function SoldProductsView({ saleId, onNavigate }: Props) {
  const { token } = useAuth();
  const apiBase = config.apiUrl;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/sales/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load sale');
      return res.json() as Promise<any>;
    },
    enabled: !!saleId && !!token
  });

  if (!saleId) return null;
  if (isLoading) return <div>Loading sale...</div>;
  if (isError || !data) return <div>Failed to load sale</div>;

  const saleDate = data.createdAt ? new Date(data.createdAt).toLocaleString() : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sold Products</h1>
          {saleDate && <p className="text-sm text-muted-foreground">{saleDate}</p>}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Sale Total</div>
            <div className="text-xl font-bold">{formatUSh(data.total)}</div>
          </div>
          <Button variant="outline" onClick={() => onNavigate ? onNavigate('dashboard') : window.history.back()}>Back</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {data.items.map((it: any, idx: number) => (
          <Card key={idx} className="p-3">
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="font-medium text-lg">{it.product?.name ?? 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">Qty: {it.quantity} — Units: {it.unitsSold}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatUGX(it.unitPrice)}</div>
                <div className="text-sm text-muted-foreground">Subtotal: {formatUGX(it.subtotal)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
