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
import { Plus, CreditCard, CheckCircle, XCircle, Clock, Search, Printer } from "lucide-react";
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

  // Print helpers: print a single debt or all visible debts in a printable window
  const printDebt = (debt: Debt) => {
    const printedOn = new Date().toLocaleString();
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Debt - ${escapeHtml(debt.title)}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            html,body{height:100%;}
            body{font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;color:#111;background:#fff}
            .container{padding:24px;}
            .brand{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
            .brand .name{font-size:20px;font-weight:700}
            .muted{color:#666}
            .box{border:1px solid #e5e7eb;padding:14px;border-radius:6px;margin-top:12px}
            .row{display:flex;justify-content:space-between;margin-bottom:6px}
            .label{color:#374151;font-weight:600}
            .footer{margin-top:28px;color:#666;font-size:12px}
            @media print {
              .no-print{display:none}
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">
              <div>
                <div class="name">SMGTS</div>
                <div class="muted">Debt Document</div>
              </div>
              <div class="muted">Printed: ${escapeHtml(printedOn)}</div>
            </div>

            <div>
              <h2 style="margin:0 0 6px 0">${escapeHtml(debt.title)}</h2>
              <div class="muted">${escapeHtml(debt.dateIssued)} • ${escapeHtml(debt.issuer)}</div>
            </div>

            <div class="box">
              <div class="row"><div class="label">Amount</div><div style="font-weight:700">${escapeHtml(formatUGX(debt.amount))}</div></div>
              <div class="row"><div class="label">Status</div><div>${escapeHtml(debt.status)}</div></div>
              <div style="margin-top:8px"><div class="label">Reason</div><div class="muted">${escapeHtml(debt.reason)}</div></div>
            </div>

            <div class="footer">This document was generated from the SMGTS system.</div>
          </div>
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return alert('Popup blocked. Allow popups to print.');
    w.document.write(html);
    w.document.close();
    w.focus();
    // give browser a moment to render then print
    setTimeout(() => { w.print(); /* optionally close: w.close(); */ }, 300);
  };

  const printAll = () => {
    const printedOn = new Date().toLocaleString();
    const rows = filteredDebts.map(d => `
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(d.title)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(d.issuer)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(d.dateIssued)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:right">${escapeHtml(formatUGX(d.amount))}</td>
        <td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(d.status)}</td>
      </tr>
    `).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Debt Requests</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body{font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;color:#111}
            .container{padding:20px}
            h2{margin-bottom:12px}
            table{border-collapse:collapse;width:100%}
            th,td{padding:10px;border:1px solid #e5e7eb}
            thead th{background:#f9fafb;text-align:left}
            .meta{margin-bottom:10px;color:#666}
            @media print { .no-print{display:none} }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:700;font-size:18px">SMGTS</div>
                <div class="meta">Debt Requests</div>
              </div>
              <div class="meta">Printed: ${escapeHtml(printedOn)}</div>
            </div>

            <h2>Debt Requests</h2>
            <table>
              <thead>
                <tr><th>Title</th><th>Requested by</th><th>Date</th><th style="text-align:right">Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return alert('Popup blocked. Allow popups to print.');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  // small helper to escape HTML inserted into printable windows
  function escapeHtml(input: any) {
    if (input == null) return '';
    return String(input)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debt Management</h1>
          <p className="text-muted-foreground">
            {userRole === "admin" ? "Manage all debt requests and payments" : "Track your debt requests and payments"}
          </p>
        </div>
  {(userRole === "agent" || userRole === "admin") && (
          <div className="flex items-center gap-2">
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

            <Button variant="outline" onClick={printAll} className="no-print">
              <Printer className="h-4 w-4 mr-2" />
              Print All
            </Button>
          </div>
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
                          className={`${statusColor === "success" ? "bg-success text-success-foreground" : "text-warning border-warning"}`}
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
                    
                    {(userRole === "admin" || debt.agentEmail === userEmail) && (
                      <div className="flex flex-col gap-2 ml-4">
                        {debt.status === "Pending" && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDebtStatus(debt.id, "Paid")}
                              className="text-success hover:text-success"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            {userRole === "admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!confirm('Delete this debt? This action cannot be undone.')) return;
                                  (async () => {
                                    try {
                                      const res = await fetch(`${apiBase}/api/debts/${debt.id}`, {
                                        method: 'DELETE',
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      if (!res.ok) throw new Error('Failed to delete debt');
                                      setDebts(prev => prev.filter(d => d.id !== debt.id));
                                      toast({ title: 'Deleted', description: 'Debt removed' });
                                    } catch (err: any) {
                                      toast({ title: 'Error', description: err.message || 'Could not delete' });
                                    }
                                  })();
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        )}

                        <Button variant="outline" size="sm" onClick={() => printDebt(debt)}>
                          <Printer className="h-4 w-4 mr-1" />
                          Print
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
  // Normalize issuer display: prefer full name, then email; never expose raw DB id in the UI
  let issuerDisplay = 'Requester';
  let agentEmail = '';
  if (d.issuer) {
    if (typeof d.issuer === 'object') {
      issuerDisplay = d.issuer.name || d.issuer.email || 'Requester';
      agentEmail = d.issuer.email || String(d.issuer._id || '');
    } else if (typeof d.issuer === 'string') {
      // issuer is an id string (not populated) - do not show the id; show generic label
      issuerDisplay = 'Requester';
      agentEmail = d.issuer;
    }
  }

  return {
    id: d._id,
    title: d.title,
    amount: d.amount,
    reason: d.reason,
    issuer: issuerDisplay,
    dateIssued: new Date(d.createdAt).toLocaleDateString(),
    status: d.status,
    agentEmail: agentEmail
  };
}
