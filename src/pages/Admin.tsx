import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Home, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
}

interface ActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  target_user_email: string | null;
  details: any;
  created_at: string;
}

export default function Admin() {
  const { hasRole, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, properties: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasRole('super_admin')) {
      fetchData();
      fetchActivityLogs();
    }
  }, [hasRole]);

  const fetchData = async () => {
    try {
      const [profilesRes, propertiesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const profilesData = profilesRes.data || [];
      setProfiles(profilesData);
      setStats({
        total: profilesData.length,
        pending: profilesData.filter(p => p.approval_status === 'pending').length,
        approved: profilesData.filter(p => p.approval_status === 'approved').length,
        properties: propertiesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const logActivity = async (action: string, targetUserId: string, targetUserEmail: string, details?: Record<string, any>) => {
    if (!user) return;
    
    try {
      await supabase.from('admin_activity_logs').insert({
        admin_id: user.id,
        action,
        target_user_id: targetUserId,
        target_user_email: targetUserEmail,
        details: details || null,
      });
      fetchActivityLogs();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const updateApproval = async (userId: string, userEmail: string, status: ApprovalStatus) => {
    try {
      const { error } = await supabase.from('profiles').update({ approval_status: status }).eq('id', userId);
      if (error) throw error;
      
      // Log the activity
      await logActivity(
        status === 'approved' ? 'user_approved' : 'user_rejected',
        userId,
        userEmail,
        { previous_status: profiles.find(p => p.id === userId)?.approval_status, new_status: status }
      );
      
      toast({ title: `User ${status}` });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (authLoading) return null;

  if (!hasRole('super_admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  const statusColors: Record<ApprovalStatus, string> = {
    pending: 'bg-warning/10 text-warning',
    approved: 'bg-success/10 text-success',
    rejected: 'bg-destructive/10 text-destructive',
  };

  const actionLabels: Record<string, { label: string; color: string }> = {
    user_approved: { label: 'Approved User', color: 'bg-success/10 text-success' },
    user_rejected: { label: 'Rejected User', color: 'bg-destructive/10 text-destructive' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage users and platform settings</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <Home className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Properties</p>
                  <p className="text-2xl font-bold">{stats.properties}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Property Owners
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Property Owners</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-48 bg-muted animate-pulse rounded-lg" />
                ) : profiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users registered yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-48">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.full_name || 'N/A'}</TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[profile.approval_status]}>
                              {profile.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {profile.approval_status !== 'approved' && (
                                <Button size="sm" variant="outline" onClick={() => updateApproval(profile.id, profile.email, 'approved')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {profile.approval_status !== 'rejected' && (
                                <Button size="sm" variant="outline" onClick={() => updateApproval(profile.id, profile.email, 'rejected')}>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Admin Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No activity recorded yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Target User</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map((log) => {
                        const actionInfo = actionLabels[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge className={actionInfo.color}>
                                {actionInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{log.target_user_email || 'N/A'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.details ? (
                                <span>
                                  {log.details.previous_status} → {log.details.new_status}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
