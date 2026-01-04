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
import { Plus, FileText, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

type LeaseStatus = 'active' | 'expiring_soon' | 'expired' | 'terminated';

interface Lease {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number | null;
  status: LeaseStatus;
  notes: string | null;
  units?: { unit_number: string; properties?: { name: string } };
  tenants?: { full_name: string };
}

interface Unit {
  id: string;
  unit_number: string;
  properties?: { name: string };
}

interface Tenant {
  id: string;
  full_name: string;
}

export default function Leases() {
  const { toast } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);

  const [formData, setFormData] = useState({
    unit_id: '',
    tenant_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: 0,
    deposit_amount: 0,
    status: 'active' as LeaseStatus,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leasesRes, unitsRes, tenantsRes] = await Promise.all([
        supabase.from('leases').select('*, units(unit_number, properties(name)), tenants(full_name)').order('created_at', { ascending: false }),
        supabase.from('units').select('id, unit_number, properties(name)'),
        supabase.from('tenants').select('id, full_name'),
      ]);

      if (leasesRes.error) throw leasesRes.error;
      setLeases(leasesRes.data || []);
      setUnits(unitsRes.data || []);
      setTenants(tenantsRes.data || []);
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
        deposit_amount: formData.deposit_amount || null,
        notes: formData.notes || null,
      };

      if (editingLease) {
        const { error } = await supabase.from('leases').update(submitData).eq('id', editingLease.id);
        if (error) throw error;
        toast({ title: 'Lease updated successfully' });
      } else {
        const { error } = await supabase.from('leases').insert([submitData]);
        if (error) throw error;
        toast({ title: 'Lease created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lease?')) return;

    try {
      const { error } = await supabase.from('leases').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Lease deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleEdit = (lease: Lease) => {
    setEditingLease(lease);
    setFormData({
      unit_id: lease.unit_id,
      tenant_id: lease.tenant_id,
      start_date: lease.start_date,
      end_date: lease.end_date,
      monthly_rent: lease.monthly_rent,
      deposit_amount: lease.deposit_amount || 0,
      status: lease.status,
      notes: lease.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingLease(null);
    setFormData({
      unit_id: '',
      tenant_id: '',
      start_date: '',
      end_date: '',
      monthly_rent: 0,
      deposit_amount: 0,
      status: 'active',
      notes: '',
    });
  };

  const statusColors: Record<LeaseStatus, string> = {
    active: 'bg-success/10 text-success',
    expiring_soon: 'bg-warning/10 text-warning',
    expired: 'bg-destructive/10 text-destructive',
    terminated: 'bg-muted text-muted-foreground',
  };

  const canCreateLease = units.length > 0 && tenants.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Leases</h1>
            <p className="text-muted-foreground mt-1">Manage lease agreements</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!canCreateLease}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">{editingLease ? 'Edit Lease' : 'Add New Lease'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.unit_number} - {u.properties?.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tenant</Label>
                    <Select value={formData.tenant_id} onValueChange={(v) => setFormData({ ...formData, tenant_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Monthly Rent</Label>
                    <Input type="number" min={0} value={formData.monthly_rent} onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit</Label>
                    <Input type="number" min={0} value={formData.deposit_amount} onChange={(e) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as LeaseStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingLease ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!canCreateLease ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">Add units and tenants first before creating leases</p>
          </CardContent></Card>
        ) : loading ? (
          <Card className="animate-pulse"><CardContent className="p-6"><div className="h-48 bg-muted rounded-lg" /></CardContent></Card>
        ) : leases.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4"><FileText className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-medium mb-2">No leases yet</h3>
            <p className="text-muted-foreground text-center mb-4">Create your first lease agreement</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Lease</Button>
          </CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{lease.units?.unit_number}</span>
                        <p className="text-xs text-muted-foreground">{lease.units?.properties?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{lease.tenants?.full_name}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(lease.start_date), 'MMM d, yyyy')} - {format(new Date(lease.end_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>${lease.monthly_rent}/mo</TableCell>
                    <TableCell><Badge className={statusColors[lease.status]}>{lease.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(lease)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(lease.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
