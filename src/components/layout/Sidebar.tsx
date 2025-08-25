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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "agent"] },
    { id: "products", label: "Products", icon: Package, roles: ["admin"] },
    { id: "sales", label: "Create Sale", icon: ShoppingCart, roles: ["admin", "agent"] },
    { id: "analytics", label: "Analytics", icon: TrendingUp, roles: ["admin", "agent"] },
    { id: "debts", label: "Debts", icon: CreditCard, roles: ["admin", "agent"] },
    { id: "users", label: "Users", icon: Users, roles: ["admin"] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className={`${isCollapsed ? "w-16" : "w-64"} transition-all duration-300 bg-card border-r border-border shadow-soft flex flex-col h-screen`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                Sales Manager
              </h2>
              <p className="text-xs text-muted-foreground">Business Management</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-accent"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userEmail}</p>
              <Badge variant="outline" className="text-xs">
                {userRole === "admin" ? "Admin" : "Sales Agent"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive 
                    ? "bg-gradient-primary text-white shadow-soft" 
                    : "hover:bg-accent"
                } ${isCollapsed ? "px-3" : ""}`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}