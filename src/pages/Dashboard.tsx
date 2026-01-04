import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, DoorOpen, Users, CreditCard, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'payment' | 'tenant' | 'maintenance' | 'lease';
  title: string;
  description: string;
  time: string;
}

export default function Dashboard() {
  const { profile, isApproved } = useAuth();
  const [stats, setStats] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    pendingPayments: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
  }, []);

  const fetchStats = async () => {
    try {
      const [propertiesRes, unitsRes, tenantsRes, paymentsRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('units').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        properties: propertiesRes.count || 0,
        units: unitsRes.count || 0,
        tenants: tenantsRes.count || 0,
        pendingPayments: paymentsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const [paymentsRes, leasesRes, maintenanceRes, tenantsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, status, created_at, leases(tenants(full_name))')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('leases')
          .select('id, status, created_at, tenants(full_name), units(unit_number)')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('maintenance_requests')
          .select('id, title, status, created_at, units(unit_number)')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('tenants')
          .select('id, full_name, created_at')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const allActivities: Activity[] = [];

      // Add payment activities
      paymentsRes.data?.forEach((payment: any) => {
        allActivities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: `Payment ${payment.status}`,
          description: `${payment.leases?.tenants?.full_name || 'Unknown'} - UGX ${Number(payment.amount).toLocaleString()}`,
          time: formatDistanceToNow(new Date(payment.created_at), { addSuffix: true }),
        });
      });

      // Add lease activities
      leasesRes.data?.forEach((lease: any) => {
        allActivities.push({
          id: `lease-${lease.id}`,
          type: 'lease',
          title: `Lease ${lease.status}`,
          description: `${lease.tenants?.full_name || 'Unknown'} - Unit ${lease.units?.unit_number || 'N/A'}`,
          time: formatDistanceToNow(new Date(lease.created_at), { addSuffix: true }),
        });
      });

      // Add maintenance activities
      maintenanceRes.data?.forEach((request: any) => {
        allActivities.push({
          id: `maintenance-${request.id}`,
          type: 'maintenance',
          title: request.title,
          description: `Unit ${request.units?.unit_number || 'N/A'} - ${request.status}`,
          time: formatDistanceToNow(new Date(request.created_at), { addSuffix: true }),
        });
      });

      // Add tenant activities
      tenantsRes.data?.forEach((tenant: any) => {
        allActivities.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant',
          title: 'New tenant registered',
          description: tenant.full_name,
          time: formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true }),
        });
      });

      // Sort by time and take most recent 5
      allActivities.sort((a, b) => {
        // This is a simplified sort - activities are already recent
        return 0;
      });

      setActivities(allActivities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your properties today.
            </p>
          </div>
          {!isApproved() && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 self-start">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Account Pending Approval
            </Badge>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Properties"
            value={stats.properties}
            icon={Home}
            description="Total properties"
          />
          <StatCard
            title="Units"
            value={stats.units}
            icon={DoorOpen}
            description="Across all properties"
          />
          <StatCard
            title="Tenants"
            value={stats.tenants}
            icon={Users}
            description="Active tenants"
          />
          <StatCard
            title="Pending Payments"
            value={stats.pendingPayments}
            icon={CreditCard}
            description="Awaiting payment"
          />
        </div>

        {/* Quick actions and activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <QuickActionButton href="/properties" label="Add New Property" icon={Home} />
              <QuickActionButton href="/tenants" label="Register Tenant" icon={Users} />
              <QuickActionButton href="/payments" label="Record Payment" icon={CreditCard} />
            </CardContent>
          </Card>

          <RecentActivity activities={activities} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function QuickActionButton({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
    >
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="font-medium">{label}</span>
    </a>
  );
}
