import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, DoorOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type UnitStatus = 'available' | 'occupied' | 'maintenance';

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: string | null;
  capacity: number;
  amenities: string[] | null;
  rent_amount: number;
  status: UnitStatus;
  properties?: { name: string };
}

interface Property {
  id: string;
  name: string;
}

export default function Units() {
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    unit_type: '',
    capacity: 1,
    rent_amount: 0,
    status: 'available' as UnitStatus,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [unitsRes, propertiesRes] = await Promise.all([
        supabase.from('units').select('*, properties(name)').order('created_at', { ascending: false }),
        supabase.from('properties').select('id, name'),
      ]);

      if (unitsRes.error) throw unitsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;

      setUnits(unitsRes.data || []);
      setProperties(propertiesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUnit) {
        const { error } = await supabase.from('units').update(formData).eq('id', editingUnit.id);
        if (error) throw error;
        toast({ title: 'Unit updated successfully' });
      } else {
        const { error } = await supabase.from('units').insert([formData]);
        if (error) throw error;
        toast({ title: 'Unit created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Unit deleted successfully' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      property_id: unit.property_id,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type || '',
      capacity: unit.capacity,
      rent_amount: unit.rent_amount,
      status: unit.status,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingUnit(null);
    setFormData({
      property_id: '',
      unit_number: '',
      unit_type: '',
      capacity: 1,
      rent_amount: 0,
      status: 'available',
    });
  };

  const statusColors: Record<UnitStatus, string> = {
    available: 'bg-success/10 text-success',
    occupied: 'bg-primary/10 text-primary',
    maintenance: 'bg-warning/10 text-warning',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Units</h1>
            <p className="text-muted-foreground mt-1">Manage units across your properties</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={properties.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingUnit ? 'Edit Unit' : 'Add New Unit'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Unit Number</Label>
                    <Input value={formData.unit_number} onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Type</Label>
                    <Input value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })} placeholder="e.g., Studio, 1BR" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input type="number" min={1} value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rent Amount</Label>
                    <Input type="number" min={0} value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as UnitStatus })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingUnit ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">Add a property first before creating units</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6"><div className="h-24 bg-muted rounded-lg" /></CardContent>
              </Card>
            ))}
          </div>
        ) : units.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-muted mb-4">
                <DoorOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No units yet</h3>
              <p className="text-muted-foreground text-center mb-4">Add your first unit to a property</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map((unit) => (
              <Card key={unit.id} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">Unit {unit.unit_number}</h3>
                      <p className="text-sm text-muted-foreground">{unit.properties?.name}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(unit)}>
                          <Pencil className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(unit.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={statusColors[unit.status]}>{unit.status}</Badge>
                    <span className="font-semibold">{formatCurrency(unit.rent_amount)}/mo</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
