import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUGX } from '@/lib/utils';

interface Props {
  saleId: string;
}

export function SoldProductsView({ saleId }: Props) {
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sold Products</h1>
          <p className="text-muted-foreground">Sale ID: {saleId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items Sold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.items.map((it: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <div>
                  <div className="font-medium">{it.product?.name ?? 'Unknown'}</div>
                  <div className="text-sm text-muted-foreground">Qty: {it.quantity} • UnitsSold: {it.unitsSold}</div>
                </div>
                <div className="text-right">
                  <div>{formatUGX(it.unitPrice)}</div>
                  <div className="text-sm text-muted-foreground">Subtotal: {formatUGX(it.subtotal)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
