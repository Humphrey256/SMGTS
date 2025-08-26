import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/config';
import { Plus, CreditCard, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { formatUGX } from "@/lib/utils";

interface Debt {
  id: string;
  title: string;
  amount: number;
  reason: string;
  issuer: string;
  dateIssued: string;
  status: "Pending" | "Paid";
  agentEmail: string;
}

interface DebtManagerProps {
  userRole: string;
  userEmail: string;
}

export function DebtManager({ userRole, userEmail }: DebtManagerProps) {
  const { toast } = useToast();
  const { token, user } = useAuth() as any;
  const apiBase = config.apiUrl;

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/debts`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load debts');
        const data = await res.json();
        if (!mounted) return;
        setDebts(data.map((d: any) => formatDebt(d)));
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Error loading debts');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    clientName: "",
    amount: "",
    reason: ""
  });

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = 
      debt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.issuer.toLowerCase().includes(searchTerm.toLowerCase());
    
    return userRole === "admin" ? matchesSearch : 
           matchesSearch && debt.agentEmail === userEmail;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        const body = {
          title: formData.clientName,
          amount: parseFloat(formData.amount),
          reason: formData.reason
        };
        const res = await fetch(`${apiBase}/api/debts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to create debt');
        const created = await res.json();
  setDebts(prev => [formatDebt(created), ...prev]);
  toast({ title: 'Success', description: 'Debt request submitted successfully' });
  setFormData({ clientName: '', amount: '', reason: '' });
        setIsDialogOpen(false);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Could not create debt' });
      }
    })();
  };

  const updateDebtStatus = (id: string, status: "Paid") => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/debts/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed to update status');
        const updated = await res.json();
        setDebts(prev => prev.map(d => d.id === id ? formatDebt(updated) : d));
        toast({ title: 'Success', description: `Debt marked as ${status.toLowerCase()}` });
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Could not update status' });
      }
    })();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "success";
      default: return "warning";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Paid": return CheckCircle;
      default: return Clock;
    }
  };

  const totalPendingAmount = debts
    .filter(debt => debt.status === "Pending" && (userRole === "admin" || debt.agentEmail === userEmail))
    .reduce((sum, debt) => sum + debt.amount, 0);

  const totalPaidAmount = debts
    .filter(debt => debt.status === "Paid" && (userRole === "admin" || debt.agentEmail === userEmail))
    .reduce((sum, debt) => sum + debt.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debt Management</h1>
          <p className="text-muted-foreground">
            {userRole === "admin" ? "Manage all debt requests and payments" : "Track your debt requests and payments"}
          </p>
        </div>
        {userRole === "agent" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Debt (business owes client)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g., John Doe or ACME Ltd"
                    value={formData.clientName}
                    onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (UGX)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why you need this advance..."
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary">
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatUGX(totalPendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {debts.filter(d => d.status === "Pending").length} pending requests
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatUGX(totalPaidAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {debts.filter(d => d.status === "Paid").length} completed payments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDebts.length}</div>
            <p className="text-xs text-muted-foreground">All time requests</p>
          </CardContent>
        </Card>
      </div>

  {/* Search */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title or issuer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

  {loading && <div className="text-sm text-muted-foreground">Loading debts...</div>}
  {error && <div className="text-sm text-destructive">{error}</div>}

      {/* Debts List */}
      <div className="space-y-4">
        {filteredDebts.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="p-8 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No debt requests found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No requests match your search criteria." : 
                 userRole === "admin" ? "No debt requests have been submitted yet." :
                 "You haven't submitted any debt requests yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDebts.map((debt) => {
            const StatusIcon = getStatusIcon(debt.status);
            const statusColor = getStatusColor(debt.status);
            
            return (
              <Card key={debt.id} className="bg-gradient-card shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{debt.title}</h3>
                        <Badge 
                          variant={statusColor === "success" ? "default" : "outline"}
                          className={`${
                            statusColor === "success" ? "bg-success text-success-foreground" :
                            statusColor === "destructive" ? "text-destructive border-destructive" :
                            "text-warning border-warning"
                          }`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {debt.status}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 text-sm text-muted-foreground mb-4">
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-medium text-foreground">{formatUGX(debt.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Requested by:</span>
                          <span className="font-medium text-foreground">{debt.issuer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span className="font-medium text-foreground">{debt.dateIssued}</span>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm"><strong>Reason:</strong> {debt.reason}</p>
                      </div>
                    </div>
                    
                    {(userRole === "admin" || debt.agentEmail === userEmail) && debt.status === "Pending" && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateDebtStatus(debt.id, "Paid")}
                          className="text-success hover:text-success"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper: convert backend debt to frontend Debt type
function formatDebt(d: any): Debt {
  return {
    id: d._id,
    title: d.title,
    amount: d.amount,
    reason: d.reason,
    issuer: d.issuer?.email || d.issuer,
    dateIssued: new Date(d.createdAt).toISOString().split('T')[0],
    status: d.status,
    agentEmail: d.issuer?.email || d.issuer
  };
}
