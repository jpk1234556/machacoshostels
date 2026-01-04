import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Home, CheckCircle, XCircle, Clock, Eye, User, MapPin, CreditCard, ShieldCheck, FileText } from 'lucide-react';
import { Navigate } from 'react-router-dom';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  date_of_birth: string | null;
  residential_address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  id_type: string | null;
  id_number: string | null;
  id_document_url: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  billing_address: string | null;
  security_deposit_agreed: boolean | null;
  terms_accepted: boolean | null;
  terms_accepted_at: string | null;
}

export default function Admin() {
  const { hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, properties: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (hasRole('super_admin')) {
      fetchData();
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
      setProfiles(profilesData as Profile[]);
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

  const updateApproval = async (userId: string, status: ApprovalStatus) => {
    try {
      const { error } = await supabase.from('profiles').update({ approval_status: status }).eq('id', userId);
      if (error) throw error;
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

  const formatIdType = (type: string | null) => {
    if (!type) return 'N/A';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPaymentMethod = (method: string | null, provider: string | null) => {
    if (!method) return 'N/A';
    if (method === 'mobile_money' && provider) {
      return `${provider.toUpperCase()} Mobile Money`;
    }
    return method === 'bank' ? 'Bank Transfer' : method;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Review and approve property owner registrations</p>
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
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-56">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.full_name || 'N/A'}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>{profile.phone || 'N/A'}</TableCell>
                      <TableCell>{profile.city && profile.country ? `${profile.city}, ${profile.country}` : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[profile.approval_status]}>
                          {profile.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedProfile(profile)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-display">User Details</DialogTitle>
                              </DialogHeader>
                              {selectedProfile && (
                                <div className="space-y-6">
                                  {/* Personal Info */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2 text-primary">
                                      <User className="h-4 w-4" />
                                      Personal Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Full Name</p>
                                        <p className="font-medium">{selectedProfile.full_name || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="font-medium">{selectedProfile.email}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-medium">{selectedProfile.phone || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                                        <p className="font-medium">
                                          {selectedProfile.date_of_birth 
                                            ? new Date(selectedProfile.date_of_birth).toLocaleDateString() 
                                            : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Address */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2 text-primary">
                                      <MapPin className="h-4 w-4" />
                                      Address Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                                      <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground">Residential Address</p>
                                        <p className="font-medium">{selectedProfile.residential_address || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">City</p>
                                        <p className="font-medium">{selectedProfile.city || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Country</p>
                                        <p className="font-medium">{selectedProfile.country || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Postal Code</p>
                                        <p className="font-medium">{selectedProfile.postal_code || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Identity Verification */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2 text-primary">
                                      <ShieldCheck className="h-4 w-4" />
                                      Identity Verification
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                                      <div>
                                        <p className="text-xs text-muted-foreground">ID Type</p>
                                        <p className="font-medium">{formatIdType(selectedProfile.id_type)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">ID Number</p>
                                        <p className="font-medium">{selectedProfile.id_number || 'N/A'}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground">ID Document</p>
                                        {selectedProfile.id_document_url ? (
                                          <a 
                                            href={selectedProfile.id_document_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex items-center gap-1"
                                          >
                                            <FileText className="h-4 w-4" />
                                            View Document
                                          </a>
                                        ) : (
                                          <p className="font-medium">Not uploaded</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Payment Info */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2 text-primary">
                                      <CreditCard className="h-4 w-4" />
                                      Payment Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Payment Method</p>
                                        <p className="font-medium">
                                          {formatPaymentMethod(selectedProfile.payment_method, selectedProfile.payment_provider)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Billing Address</p>
                                        <p className="font-medium">{selectedProfile.billing_address || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Security Deposit Agreed</p>
                                        <Badge className={selectedProfile.security_deposit_agreed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                                          {selectedProfile.security_deposit_agreed ? 'Yes' : 'No'}
                                        </Badge>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Terms Accepted</p>
                                        <Badge className={selectedProfile.terms_accepted ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                                          {selectedProfile.terms_accepted ? 'Yes' : 'No'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Registration Info */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold">Registration Info</h4>
                                    <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Registered At</p>
                                        <p className="font-medium">
                                          {new Date(selectedProfile.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Approval Status</p>
                                        <Badge className={statusColors[selectedProfile.approval_status]}>
                                          {selectedProfile.approval_status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-3 pt-4 border-t">
                                    {selectedProfile.approval_status !== 'approved' && (
                                      <Button onClick={() => { updateApproval(selectedProfile.id, 'approved'); setSelectedProfile({...selectedProfile, approval_status: 'approved'}); }}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve User
                                      </Button>
                                    )}
                                    {selectedProfile.approval_status !== 'rejected' && (
                                      <Button variant="destructive" onClick={() => { updateApproval(selectedProfile.id, 'rejected'); setSelectedProfile({...selectedProfile, approval_status: 'rejected'}); }}>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject User
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {profile.approval_status !== 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => updateApproval(profile.id, 'approved')}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {profile.approval_status !== 'rejected' && (
                            <Button size="sm" variant="outline" onClick={() => updateApproval(profile.id, 'rejected')}>
                              <XCircle className="h-4 w-4" />
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
      </div>
    </DashboardLayout>
  );
}
