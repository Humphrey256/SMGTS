import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NotificationBell() {
  const { items, markRead, remove } = useNotifications();
  const [open, setOpen] = useState(false);

  const unread = items.filter(i => !i.read).length;

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setOpen(v => !v)} className="h-9 w-9">
        <Bell className="h-5 w-5" />
        {unread > 0 && <Badge className="absolute -top-1 -right-1">{unread}</Badge>}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border shadow-lg rounded-md z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <strong>Notifications</strong>
            <Button variant="ghost" size="sm" onClick={() => { items.forEach(i => markRead(i.id)); }}>
              Mark all read
            </Button>
          </div>
          <div className="max-h-64 overflow-auto">
            {items.length === 0 && <div className="p-4 text-sm text-muted-foreground">No notifications</div>}
            {items.map(n => (
              <div key={n.id} className={`p-3 border-b border-border ${n.read ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    {n.message && <div className="text-sm text-muted-foreground">{n.message}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>Read</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(n.id)}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
