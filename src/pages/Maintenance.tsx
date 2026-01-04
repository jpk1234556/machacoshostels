import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Wrench, MoreVertical, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
type MaintenanceStatus = 'pending' | 'in_progress' | 'resolved';

interface MaintenanceRequest {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  resolved_at: string | null;
  created_at: string;
  units?: { unit_number: string; properties?: { name: string } };
}

interface Unit {
  id: string;
  unit_number: string;
  properties?: { name: string };
}

export default function Maintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  const [formData, setFormData] = useState({
    unit_id: '',
    title: '',
    description: '',
    priority: 'medium' as MaintenancePriority,
    status: 'pending' as MaintenanceStatus,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, unitsRes] = await Promise.all([
        supabase.from('maintenance_requests').select('*, units(unit_number, properties(name))').order('created_at', { ascending: false }),
        supabase.from('units').select('id, unit_number, properties(name)'),
      ]);

      if (requestsRes.error) throw requestsRes.error;
      setRequests(requestsRes.data || []);
      setUnits(unitsRes.data || []);
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
        description: formData.description || null,
        reported_by: user?.id,
        resolved_at: formData.status === 'resolved' ? new Date().toISOString() : null,
      };

      if (editingRequest) {
        const { error } = await supabase.from('maintenance_requests').update(submitData).eq('id', editingRequest.id);
        if (error) throw error;
        toast({ title: 'Request updated successfully' });
      } else {
        const { error } = await supabase.from('maintenance_requests').insert([submitData]);
        if (error) throw error;
        toast({ title: 'Request created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase.from('maintenance_requests').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Request deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleEdit = (request: MaintenanceRequest) => {
    setEditingRequest(request);
    setFormData({
      unit_id: request.unit_id,
      title: request.title,
      description: request.description || '',
      priority: request.priority,
      status: request.status,
    });
    setDialogOpen(true);
  };

  const handleResolve = async (id: string) => {
    try {
      const { error } = await supabase.from('maintenance_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Request resolved' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const resetForm = () => {
    setEditingRequest(null);
    setFormData({
      unit_id: '',
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
    });
  };

  const priorityColors: Record<MaintenancePriority, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-info/10 text-info',
    high: 'bg-warning/10 text-warning',
    urgent: 'bg-destructive/10 text-destructive',
  };

  const statusColors: Record<MaintenanceStatus, string> = {
    pending: 'bg-warning/10 text-warning',
    in_progress: 'bg-info/10 text-info',
    resolved: 'bg-success/10 text-success',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Maintenance</h1>
            <p className="text-muted-foreground mt-1">Track maintenance requests</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={units.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">{editingRequest ? 'Edit Request' : 'New Maintenance Request'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label>Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="Brief description of the issue" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as MaintenancePriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as MaintenanceStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Detailed description..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingRequest ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {units.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">Add units first before creating maintenance requests</p>
          </CardContent></Card>
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded-lg" /></CardContent></Card>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4"><Wrench className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-medium mb-2">No maintenance requests</h3>
            <p className="text-muted-foreground text-center mb-4">Create your first maintenance request</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Request</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <Card key={request.id} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{request.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Unit {request.units?.unit_number} - {request.units?.properties?.name}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(request)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        {request.status !== 'resolved' && (
                          <DropdownMenuItem onClick={() => handleResolve(request.id)}><CheckCircle className="h-4 w-4 mr-2" />Mark Resolved</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(request.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {request.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{request.description}</p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={priorityColors[request.priority]}>{request.priority}</Badge>
                    <Badge className={statusColors[request.status]}>{request.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
