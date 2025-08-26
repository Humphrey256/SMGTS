import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { config } from '@/config';
import { useNotifications } from '@/contexts/NotificationsContext';

// Simple daily notifier: fetches analytics report for "week"/"day" and shows a toast.
export default function DailyNotifier() {
  const { toast } = useToast();
  const { push } = useNotifications();
  const timerRef = useRef<number | null>(null);

  async function fetchAndNotify() {
    try {
      const apiBase = config.apiUrl;
      // backend supports /api/analytics/report?period=month|week|... we'll try 'week' as fallback
  const res = await fetch(`${apiBase}/api/analytics/report?period=day`);
      if (!res.ok) return;
      const data = await res.json();
  const stats = data.monthlyStats ?? data.dailyStats ?? data ?? {};
  const sales = stats.totalSales ?? 0;
  const profit = stats.totalProfit ?? 0;
  const prev = data.previous ?? { revenue: 0, profit: 0 };
  const salesChange = prev.revenue ? Math.round(((sales - prev.revenue) / prev.revenue) * 100) : 0;

  const message = `Sales: ${new Intl.NumberFormat().format(sales)} (${salesChange >= 0 ? '+' : ''}${salesChange}%) — Profit: ${new Intl.NumberFormat().format(profit)}`;
  // push into app notification center and also show a lightweight toast
  push({ title: 'Daily achievements', message });
  toast({ title: 'Daily achievements', description: message });
    } catch (err) {
      // silent
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
