import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ProductManager } from "@/components/products/ProductManager";
import { SalesForm } from "@/components/sales/SalesForm";
import { Analytics } from "@/components/analytics/Analytics";
import { DebtManager } from "@/components/debts/DebtManager";
import { Sidebar } from "@/components/layout/Sidebar";
import NotificationBell from '@/components/notifications/NotificationBell';
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");

  const handleLoginSuccess = () => {
    // Login success is handled by AuthContext
    // This is just a callback if needed
  };

  const handleLogout = () => {
    logout();
    setActiveView("dashboard");
  };

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case "products":
        return <ProductManager />;
      case "sales":
        return <SalesForm />;
      case "analytics":
        return <Analytics />;
      case "debts":
        return <DebtManager userRole={user.role} userEmail={user.email} />;
      default:
        return <Dashboard userRole={user.role} onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        userRole={user.role}
        userEmail={user.email}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-start justify-end mb-4">
          <NotificationBell />
        </div>
        {renderActiveView()}
      </main>
    </div>
  );
};

export default Index;
