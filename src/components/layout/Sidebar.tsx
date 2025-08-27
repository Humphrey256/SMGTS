import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  CreditCard, 
  Users,
  LogOut,
  Menu,
  X
} from "lucide-react";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userRole: string;
  userEmail: string;
  onLogout: () => void;
}

export function Sidebar({ activeView, onViewChange, userRole, userEmail, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "agent"] },
    { id: "products", label: "Products", icon: Package, roles: ["admin"] },
    { id: "sales", label: "Create Sale", icon: ShoppingCart, roles: ["admin", "agent"] },
    { id: "analytics", label: "Analytics", icon: TrendingUp, roles: ["admin", "agent"] },
    { id: "debts", label: "Debts", icon: CreditCard, roles: ["admin", "agent"] },
  // users list removed from sidebar per request
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  // Compact inline sidebar (icons only) — does not affect page layout
  // Full sidebar is rendered as a fixed overlay when `isOpen` is true
  return (
    <>
      <div className={`w-16 transition-all duration-300 bg-card border-r border-border shadow-soft flex flex-col h-screen`}>
        {/* Compact Header */}
        <div className="p-3 flex items-center justify-center border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-primary flex items-center justify-center text-white font-semibold">S</div>
          </div>
        </div>

        {/* Compact Nav (icons only) */}
        <div className="flex-1 p-2 flex flex-col items-center gap-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`h-10 w-10 p-0 flex items-center justify-center ${isActive ? 'bg-gradient-primary text-white' : ''}`}
                onClick={() => onViewChange(item.id)}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>

        {/* Compact Footer */}
        <div className="p-2 border-t border-border flex items-center justify-center">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overlay full sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <aside className="relative w-64 bg-card border-r border-border shadow-xl flex flex-col h-screen">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">Sales Manager</h2>
                <p className="text-xs text-muted-foreground">Business Management</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userEmail}</p>
                  <Badge variant="outline" className="text-xs">{userRole === "admin" ? "Admin" : "Sales Agent"}</Badge>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 overflow-auto">
              <div className="space-y-2">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start gap-3 ${isActive ? "bg-gradient-primary text-white shadow-soft" : "hover:bg-accent"}`}
                      onClick={() => { onViewChange(item.id); setIsOpen(false); }}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </nav>

            <div className="p-4 border-t border-border">
              <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { onLogout(); setIsOpen(false); }}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}