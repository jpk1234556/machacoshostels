import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, DoorOpen, Users, CreditCard, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { profile, isApproved } = useAuth();
  const [stats, setStats] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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

          <RecentActivity activities={[]} />
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
