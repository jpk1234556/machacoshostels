import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/currency';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Home, Users, Wrench } from 'lucide-react';

interface OccupancyData {
  name: string;
  value: number;
}

interface PaymentData {
  month: string;
  paid: number;
  pending: number;
  overdue: number;
}

interface MaintenanceData {
  priority: string;
  count: number;
}

interface PropertyStats {
  name: string;
  units: number;
  occupied: number;
}

const occupancyChartConfig = {
  available: { label: 'Available', color: 'hsl(var(--chart-1))' },
  occupied: { label: 'Occupied', color: 'hsl(var(--chart-2))' },
  maintenance: { label: 'Maintenance', color: 'hsl(var(--chart-3))' },
};

const paymentChartConfig = {
  paid: { label: 'Paid', color: 'hsl(var(--chart-2))' },
  pending: { label: 'Pending', color: 'hsl(var(--chart-4))' },
  overdue: { label: 'Overdue', color: 'hsl(var(--chart-5))' },
};

const maintenanceChartConfig = {
  low: { label: 'Low', color: 'hsl(var(--chart-1))' },
  medium: { label: 'Medium', color: 'hsl(var(--chart-4))' },
  high: { label: 'High', color: 'hsl(var(--chart-3))' },
  urgent: { label: 'Urgent', color: 'hsl(var(--chart-5))' },
};

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData[]>([]);
  const [propertyStats, setPropertyStats] = useState<PropertyStats[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    occupancyRate: 0,
    totalTenants: 0,
    pendingMaintenance: 0,
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Fetch units for occupancy data
      const { data: units } = await supabase.from('units').select('status, property_id');
      
      // Fetch properties
      const { data: properties } = await supabase.from('properties').select('id, name');
      
      // Fetch payments
      const { data: payments } = await supabase.from('payments').select('amount, status, payment_date, due_date');
      
      // Fetch maintenance requests
      const { data: maintenance } = await supabase.from('maintenance_requests').select('priority, status');
      
      // Fetch tenants count
      const { count: tenantsCount } = await supabase.from('tenants').select('id', { count: 'exact', head: true });

      // Calculate occupancy data
      if (units) {
        const statusCounts = units.reduce((acc, unit) => {
          const status = unit.status || 'available';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setOccupancyData([
          { name: 'Available', value: statusCounts.available || 0 },
          { name: 'Occupied', value: statusCounts.occupied || 0 },
          { name: 'Maintenance', value: statusCounts.maintenance || 0 },
        ]);

        const totalUnits = units.length;
        const occupiedUnits = statusCounts.occupied || 0;
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

        // Calculate property stats
        if (properties) {
          const propStats = properties.map(prop => {
            const propUnits = units.filter(u => u.property_id === prop.id);
            const occupiedCount = propUnits.filter(u => u.status === 'occupied').length;
            return {
              name: prop.name.length > 15 ? prop.name.slice(0, 15) + '...' : prop.name,
              units: propUnits.length,
              occupied: occupiedCount,
            };
          }).filter(p => p.units > 0);
          setPropertyStats(propStats);
        }

        setSummaryStats(prev => ({ ...prev, occupancyRate }));
      }

      // Calculate payment data by month
      if (payments) {
        const monthlyPayments: Record<string, { paid: number; pending: number; overdue: number }> = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Initialize last 6 months
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
          monthlyPayments[monthKey] = { paid: 0, pending: 0, overdue: 0 };
        }

        payments.forEach(payment => {
          const date = new Date(payment.due_date);
          const monthKey = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
          if (monthlyPayments[monthKey]) {
            const status = payment.status || 'pending';
            monthlyPayments[monthKey][status as 'paid' | 'pending' | 'overdue'] += Number(payment.amount) || 0;
          }
        });

        setPaymentData(Object.entries(monthlyPayments).map(([month, data]) => ({
          month,
          ...data,
        })));

        const totalRevenue = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        setSummaryStats(prev => ({ ...prev, totalRevenue }));
      }

      // Calculate maintenance data
      if (maintenance) {
        const priorityCounts = maintenance.reduce((acc, req) => {
          const priority = req.priority || 'medium';
          acc[priority] = (acc[priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setMaintenanceData([
          { priority: 'Low', count: priorityCounts.low || 0 },
          { priority: 'Medium', count: priorityCounts.medium || 0 },
          { priority: 'High', count: priorityCounts.high || 0 },
          { priority: 'Urgent', count: priorityCounts.urgent || 0 },
        ]);

        const pendingMaintenance = maintenance.filter(m => m.status !== 'resolved').length;
        setSummaryStats(prev => ({ ...prev, pendingMaintenance }));
      }

      setSummaryStats(prev => ({ ...prev, totalTenants: tenantsCount || 0 }));
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold">Reports</h1>
            <p className="text-muted-foreground mt-1">Analytics and insights for your properties</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and insights for your properties</p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">From paid invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {summaryStats.occupancyRate}%
                {summaryStats.occupancyRate >= 80 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all units</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered tenants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Requests</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.pendingMaintenance}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending maintenance</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Occupancy Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Unit Occupancy</CardTitle>
              <CardDescription>Distribution of unit status across properties</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={occupancyChartConfig} className="h-64">
                <PieChart>
                  <Pie
                    data={occupancyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {occupancyData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Payment Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Payment Trends</CardTitle>
              <CardDescription>Monthly payment breakdown over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={paymentChartConfig} className="h-64">
                <BarChart data={paymentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="paid" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Maintenance by Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Maintenance Requests</CardTitle>
              <CardDescription>Distribution by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={maintenanceChartConfig} className="h-64">
                <BarChart data={maintenanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="priority" type="category" className="text-xs" width={60} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {maintenanceData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Property Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Property Performance</CardTitle>
              <CardDescription>Units and occupancy by property</CardDescription>
            </CardHeader>
            <CardContent>
              {propertyStats.length > 0 ? (
                <ChartContainer config={{ units: { label: 'Total Units', color: 'hsl(var(--chart-1))' }, occupied: { label: 'Occupied', color: 'hsl(var(--chart-2))' } }} className="h-64">
                  <BarChart data={propertyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="units" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="occupied" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No property data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
