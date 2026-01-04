import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, CreditCard, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

type PaymentStatus = 'paid' | 'pending' | 'overdue';

interface Payment {
  id: string;
  lease_id: string;
  amount: number;
  payment_date: string | null;
  due_date: string;
  status: PaymentStatus;
  payment_method: string | null;
  notes: string | null;
  leases?: { tenants?: { full_name: string }; units?: { unit_number: string } };
}

interface Lease {
  id: string;
  monthly_rent: number;
  tenants?: { full_name: string };
  units?: { unit_number: string };
}

export default function Payments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [formData, setFormData] = useState({
    lease_id: '',
    amount: 0,
    payment_date: '',
    due_date: '',
    status: 'pending' as PaymentStatus,
    payment_method: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, leasesRes] = await Promise.all([
        supabase.from('payments').select('*, leases(tenants(full_name), units(unit_number))').order('created_at', { ascending: false }),
        supabase.from('leases').select('id, monthly_rent, tenants(full_name), units(unit_number)').eq('status', 'active'),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      setPayments(paymentsRes.data || []);
      setLeases(leasesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        payment_date: formData.payment_date || null,
        payment_method: formData.payment_method || null,
        notes: formData.notes || null,
      };

      if (editingPayment) {
        const { error } = await supabase.from('payments').update(submitData).eq('id', editingPayment.id);
        if (error) throw error;
        toast({ title: 'Payment updated successfully' });
      } else {
        const { error } = await supabase.from('payments').insert([submitData]);
        if (error) throw error;
        toast({ title: 'Payment recorded successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Payment deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      lease_id: payment.lease_id,
      amount: payment.amount,
      payment_date: payment.payment_date || '',
      due_date: payment.due_date,
      status: payment.status,
      payment_method: payment.payment_method || '',
      notes: payment.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPayment(null);
    setFormData({
      lease_id: '',
      amount: 0,
      payment_date: '',
      due_date: '',
      status: 'pending',
      payment_method: '',
      notes: '',
    });
  };

  const handleLeaseSelect = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    setFormData({ ...formData, lease_id: leaseId, amount: lease?.monthly_rent || 0 });
  };

  const statusColors: Record<PaymentStatus, string> = {
    paid: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    overdue: 'bg-destructive/10 text-destructive',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Payments</h1>
            <p className="text-muted-foreground mt-1">Track rent payments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={leases.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">{editingPayment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Lease</Label>
                  <Select value={formData.lease_id} onValueChange={handleLeaseSelect}>
                    <SelectTrigger><SelectValue placeholder="Select lease" /></SelectTrigger>
                    <SelectContent>
                      {leases.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.tenants?.full_name} - Unit {l.units?.unit_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" min={0} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as PaymentStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Input value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} placeholder="e.g., Bank Transfer, Cash" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingPayment ? 'Update' : 'Record'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {leases.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">Create active leases first before recording payments</p>
          </CardContent></Card>
        ) : loading ? (
          <Card className="animate-pulse"><CardContent className="p-6"><div className="h-48 bg-muted rounded-lg" /></CardContent></Card>
        ) : payments.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4"><CreditCard className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-medium mb-2">No payments yet</h3>
            <p className="text-muted-foreground text-center mb-4">Record your first payment</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
          </CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.leases?.tenants?.full_name}</TableCell>
                    <TableCell>{payment.leases?.units?.unit_number}</TableCell>
                    <TableCell>${payment.amount}</TableCell>
                    <TableCell>{format(new Date(payment.due_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge className={statusColors[payment.status]}>{payment.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(payment)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(payment.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
