import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { config } from '@/config';
import { useNotifications } from '@/contexts/NotificationsContext';

// Enhanced notifier: daily summary plus low-stock alerts and API error reporting.
export default function DailyNotifier() {
  const { toast } = useToast();
  const { push } = useNotifications();
  const timerRef = useRef<number | null>(null);

  async function fetchAndNotify() {
    try {
      const apiBase = config.apiUrl;

      // 1) fetch overall analytics
      const res = await fetch(`${apiBase}/api/analytics`);
      if (!res.ok) {
        const msg = `Analytics fetch failed: ${res.status} ${res.statusText}`;
        push({ title: 'Analytics error', message: msg });
        toast({ title: 'Analytics error', description: msg });
        return;
      }
      const overview = await res.json();

      // Prepare human-friendly numbers
      const totalSales = overview.totalSales ?? 0;
      const totalRevenue = overview.totalRevenue ?? 0;
      const totalProfit = overview.totalProfit ?? 0;
      const lowStock = overview.productsLowStock ?? 0;
      const todaySales = overview.todaySales ?? 0;

      // Push summary notification
      const summary = `Today: ${todaySales} sales — Revenue: ${new Intl.NumberFormat().format(totalRevenue)} — Profit: ${new Intl.NumberFormat().format(totalProfit)} — Low stock items: ${lowStock}`;
      push({ title: 'Daily summary', message: summary });
      toast({ title: 'Daily summary', description: summary });

      // 2) If low stock exists, fetch the low-stock products and push a focused alert
      if (lowStock > 0) {
        try {
          const lowRes = await fetch(`${apiBase}/api/products/low-stock`);
          if (lowRes.ok) {
            const lowList = await lowRes.json();
            const names = (lowList || []).slice(0,5).map((p:any) => p.name + (p.variants && p.variants[0] ? ` (${p.variants[0].title})` : '')).join(', ');
            const lowMsg = `Low stock: ${lowStock} products. Examples: ${names}`;
            push({ title: 'Low stock alert', message: lowMsg });
            toast({ title: 'Low stock alert', description: lowMsg });
          }
        } catch (e) {
          // ignore low-stock fetch errors; main overview already sent
        }
      }

    } catch (err) {
      const msg = (err as any)?.message ?? 'Unknown error in notifier';
      push({ title: 'Notifier error', message: msg });
      toast({ title: 'Notifier error', description: msg });
    }
  }

  useEffect(() => {
    // run immediately on mount
    fetchAndNotify();

    // schedule every 24 hours (milliseconds)
    const intervalMs = 24 * 60 * 60 * 1000;
    timerRef.current = window.setInterval(fetchAndNotify, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return null;
}
