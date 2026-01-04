import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { Users, Home, FileText, CreditCard, Clock, CheckCircle, TrendingUp, Building2 } from 'lucide-react';

export default function AdminDashboard() {
  const { hasRole, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalProperties: 0,
    totalUnits: 0,
    totalLeases: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasRole('super_admin')) {
      fetchStats();
    }
  }, [hasRole]);

  const fetchStats = async () => {
    try {
      const [profilesRes, propertiesRes, unitsRes, leasesRes, paymentsRes] = await Promise.all([
        supabase.from('profiles').select('approval_status'),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('units').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true }),
      ]);

      const profiles = profilesRes.data || [];
      setStats({
        totalUsers: profiles.length,
        pendingUsers: profiles.filter(p => p.approval_status === 'pending').length,
        approvedUsers: profiles.filter(p => p.approval_status === 'approved').length,
        totalProperties: propertiesRes.count || 0,
        totalUnits: unitsRes.count || 0,
        totalLeases: leasesRes.count || 0,
        totalPayments: paymentsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  if (!hasRole('super_admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-primary/10 text-primary' },
    { title: 'Pending Approval', value: stats.pendingUsers, icon: Clock, color: 'bg-warning/10 text-warning' },
    { title: 'Approved Users', value: stats.approvedUsers, icon: CheckCircle, color: 'bg-success/10 text-success' },
    { title: 'Properties', value: stats.totalProperties, icon: Home, color: 'bg-info/10 text-info' },
    { title: 'Units', value: stats.totalUnits, icon: Building2, color: 'bg-accent/10 text-accent-foreground' },
    { title: 'Active Leases', value: stats.totalLeases, icon: FileText, color: 'bg-secondary/10 text-secondary-foreground' },
    { title: 'Total Payments', value: stats.totalPayments, icon: CreditCard, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and statistics</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold">
                  {stats.totalUsers > 0 
                    ? Math.round((stats.approvedUsers / stats.totalUsers) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Avg Units/Property</p>
                <p className="text-2xl font-bold">
                  {stats.totalProperties > 0 
                    ? (stats.totalUnits / stats.totalProperties).toFixed(1) 
                    : 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold">{stats.pendingUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
